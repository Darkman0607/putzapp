/* Mein Putzmanager — eigenständige private Beta 1.0.0 (U01) */
(() => {
  'use strict';
  const VERSION = '1.4.0.11';
  const KEY = 'mein-putzmanager-beta-v1';
  const defaultState = { settings: { theme: 'dark', accent: 'emerald', budget: 30 }, sessions: [], home: null };
  let memoryState = structuredClone(defaultState);
  let storageAvailable = true;
  let currentSession = null;
  let deferredInstallPrompt = null;
  let timerInterval = null;
  let toastTimeout = null;
  let lastFocus = null;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  function load() {
    try {
      const value = localStorage.getItem(KEY);
      if (!value) return structuredClone(defaultState);
      const data = JSON.parse(value);
      const settings = data && typeof data.settings === 'object' && data.settings ? data.settings : {};
      const sessions = Array.isArray(data?.sessions) ? data.sessions.filter(x => x && typeof x.name === 'string' && Number.isFinite(x.seconds) && typeof x.at === 'string').slice(-150) : [];
      return { settings: {
        theme: ['dark', 'light'].includes(settings.theme) ? settings.theme : 'dark',
        accent: ['emerald', 'blue', 'violet', 'amber'].includes(settings.accent) ? settings.accent : 'emerald',
        budget: [15, 30, 60].includes(settings.budget) ? settings.budget : 30
      }, sessions, home: data?.home && typeof data.home === 'object' ? data.home : null };
    } catch (error) {
      storageAvailable = false;
      return structuredClone(defaultState);
    }
  }
  let state = load();
  function persist() {
    memoryState = structuredClone(state);
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
      toast('Speicher gesperrt oder voll: Daten bleiben nur bis zum Schließen erhalten.');
    }
  }
  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => node.classList.remove('show'), 3500);
  }
  function icon(name) { return `<svg class="icon" aria-hidden="true"><use href="#ic-${name}"/></svg>`; }
  function applySettings() {
    document.body.className = `theme-${state.settings.theme} accent-${state.settings.accent}`;
    document.documentElement.style.colorScheme = state.settings.theme;
    document.querySelector('meta[name="theme-color"]').content = state.settings.theme === 'dark' ? '#07181d' : '#e8f1f0';
    $$('[data-theme]').forEach(button => { const active = button.dataset.theme === state.settings.theme; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
    $$('[data-accent]').forEach(button => { const active = button.dataset.accent === state.settings.accent; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
    $$('[data-minutes]').forEach(button => { const active = Number(button.dataset.minutes) === state.settings.budget; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  }
  function navigate(name) {
    if (!['home','clean','plan','more'].includes(name)) return;
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
    $$('.nav-button').forEach(button => {
      const active = button.dataset.nav === name;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    window.scrollTo({ top:0, behavior:'instant' });
    $('#main-content').focus({ preventScroll:true });
  }
  function dateFormat(date, opts) { return new Intl.DateTimeFormat('de-AT',opts).format(date); }
  function renderDates() {
    const now = new Date();
    $('#today-date').textContent = dateFormat(now,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    const monday = new Date(now.getFullYear(),now.getMonth(),now.getDate() - ((now.getDay() + 6)%7));
    const sunday = new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6);
    $('#week-range').textContent = `${dateFormat(monday,{day:'numeric',month:'long'})} – ${dateFormat(sunday,{day:'numeric',month:'long',year:'numeric'})}`;
    const labels=['Mo','Di','Mi','Do','Fr','Sa','So'];
    const wrap=$('#week-days'); wrap.replaceChildren();
    labels.forEach((name,index)=>{
      const d = new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+index);
      const el = document.createElement('div');
      const today = d.toDateString() === now.toDateString();
      el.className = 'day-cell' + (today?' today':'');
      if(today) el.setAttribute('aria-current','date');
      const label=document.createElement('span');label.textContent=name;
      const n=document.createElement('strong');n.textContent=String(d.getDate());
      el.append(label,n);wrap.append(el);
    });
  }
  function renderHistory() {
    const list=$('#history-list');list.replaceChildren();
    const rooms=(window.PutzmanagerEditor&&window.PutzmanagerTasks)?window.PutzmanagerTasks.sanitizeJournal(window.PutzmanagerEditor.get().history).map(x=>({name:x.roomName+' · '+(x.mode==='quick'?'Schnell':'Detail'),at:x.at,seconds:x.durationSeconds,room:true})):[];
    const all=[...state.sessions,...rooms].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
    $('#session-count').textContent=`${all.length} ${all.length===1?'Eintrag':'Einträge'}`;
    if (!all.length) {const el=document.createElement('p');el.className='empty-note';el.textContent='Noch keine Reinigung abgeschlossen.';list.append(el);return;}
    all.slice(0,8).forEach(session=>{
      const row=document.createElement('div');row.className='history-item';
      const texts=document.createElement('div');const name=document.createElement('strong');name.textContent=session.name;
      const date=document.createElement('small');date.textContent=dateFormat(new Date(session.at),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      texts.append(name,date);const duration=document.createElement('span');duration.textContent=Number.isFinite(session.seconds)?readableSeconds(session.seconds):'–';row.append(texts,duration);list.append(row);
    });
  }
  function readableSeconds(sec) {const min=Math.floor(sec/60),s=sec%60;return min>0?`${min} min ${s} s`:`${s} s`;}
  function modal(title, content) {
    lastFocus=document.activeElement;
    $('#modal-title').textContent=title;
    $('#modal-body').replaceChildren();
    if(typeof content==='string') $('#modal-body').textContent=content; else $('#modal-body').append(content);
    $('#modal').hidden=false;
    $('#close-modal').focus();
  }
  function closeModal() {
    if(currentSession) {toast('Laufende Reinigung zuerst abschließen oder verwerfen.');return;}
    $('#modal').hidden=true;
    lastFocus?.focus?.();
  }
  function messageModal(title, msg){const p=document.createElement('p');p.textContent=msg;modal(title,p);}
  function chooseMode() {
    const wrap=document.createElement('div');
    const p=document.createElement('p');p.textContent='Hier kannst du weiterhin eine freie Reinigung mit Zeitmessung erfassen. Für raumbezogene Checklisten nutze die Detailreinigung.';
    const label=document.createElement('label');label.className='form-label';label.htmlFor='session-name';label.textContent='Bereich oder Tätigkeit';
    const input=document.createElement('input');input.id='session-name';input.className='form-input';input.maxLength=70;input.autocomplete='off';input.placeholder='z. B. Bad reinigen';
    const start=document.createElement('button');start.className='primary-button modal-action';start.type='button';start.textContent='Reinigung starten';
    start.addEventListener('click',()=>{const name=input.value.trim();if(!name){input.focus();toast('Bitte zuerst einen Bereich oder eine Tätigkeit angeben.');return;}startSession(name);});
    input.addEventListener('keydown',event=>{if(event.key==='Enter')start.click();});
    wrap.append(p,label,input,start);modal('Schnellreinigung starten',wrap);input.focus();
  }
  function elapsedSeconds(){if(!currentSession)return 0;return currentSession.accumulated + (currentSession.runningFrom===null?0:Math.max(0,Math.floor((Date.now()-currentSession.runningFrom)/1000)));}
  function timerText() {const seconds=elapsedSeconds();const h=Math.floor(seconds/3600);const m=String(Math.floor((seconds%3600)/60)).padStart(2,'0');const s=String(seconds%60).padStart(2,'0');return h?`${h}:${m}:${s}`:`${m}:${s}`;}
  function renderTimer(){const counter=$('#live-counter');if(counter)counter.textContent=timerText();}
  function startSession(name){currentSession={name,accumulated:0,runningFrom:Date.now()};showSession();timerInterval=setInterval(renderTimer,1000);}
  function showSession(){
    const wrap=document.createElement('div');const p=document.createElement('p');p.textContent=`Aktive Reinigung: ${currentSession.name}`;
    const counter=document.createElement('div');counter.className='session-timer';counter.id='live-counter';counter.setAttribute('role','timer');counter.textContent=timerText();
    const actions=document.createElement('div');actions.className='session-controls';const pause=document.createElement('button');pause.type='button';pause.id='toggle-pause';pause.textContent='Pause';
    const finish=document.createElement('button');finish.type='button';finish.textContent='Abschließen';
    const discard=document.createElement('button');discard.type='button';discard.className='outline-button modal-action';discard.textContent='Reinigung verwerfen';
    pause.addEventListener('click',()=>{if(!currentSession)return;if(currentSession.runningFrom===null){currentSession.runningFrom=Date.now();pause.textContent='Pause';}else{currentSession.accumulated=elapsedSeconds();currentSession.runningFrom=null;pause.textContent='Weiter';}renderTimer();});
    finish.addEventListener('click',()=>{
      const seconds=elapsedSeconds();state.sessions.push({id:globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,name:currentSession.name,seconds,at:new Date().toISOString()});state.sessions=state.sessions.slice(-150);
      persist();cancelSession();$('#modal').hidden=true;renderHistory();navigate('clean');toast('Reinigung gespeichert.');
    });
    discard.addEventListener('click',()=>{if(!window.confirm('Laufende Reinigung wirklich verwerfen?'))return;cancelSession();$('#modal').hidden=true;toast('Reinigung verworfen.');});
    actions.append(pause,finish);wrap.append(p,counter,actions,discard);modal('Reinigung läuft',wrap);
  }
  function cancelSession(){clearInterval(timerInterval);timerInterval=null;currentSession=null;}
  const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  async function installationDiagnostics() {
    const entries = [];
    const record = (ok, name) => entries.push(`${ok ? '✓' : '✗'} ${name}`);
    record(window.isSecureContext === true, 'Sichere HTTPS-Verbindung');
    record(navigator.onLine !== false, 'Gerät meldet eine Internetverbindung');
    const manifestLink = document.querySelector('link[rel="manifest"]');
    let m = null;
    if (manifestLink) {
      try {
        const result = await fetch(manifestLink.href, {cache:'no-store'});
        if (!result.ok) throw new Error(`HTTP ${result.status}`);
        m = await result.json();
        record(true, 'App-Manifest geladen');
      } catch (e) { record(false, `App-Manifest nicht ladbar (${e.message})`); }
    } else record(false, 'Kein App-Manifest verlinkt');
    if (m) {
      const icons = Array.isArray(m.icons) ? m.icons : [];
      record(Boolean(m.name || m.short_name) && Boolean(m.start_url) && ['standalone','fullscreen','minimal-ui'].includes(m.display), 'Name, Startseite und App-Anzeigemodus');
      record(['192x192','512x512'].every(size => icons.some(i => (i.sizes || '').split(/\s+/).includes(size))), 'App-Symbole 192 × 192 und 512 × 512 angegeben');
      try {
        const start = new URL(m.start_url, manifestLink.href);
        const scope = new URL(m.scope || './', manifestLink.href);
        record(start.origin === location.origin && start.pathname.startsWith(scope.pathname), 'Startadresse innerhalb des App-Bereichs');
      } catch {record(false, 'Startadresse ungültig');}
    }
    if ('serviceWorker' in navigator) {
      try {
        const sw = await navigator.serviceWorker.getRegistration('./');
        record(Boolean(sw?.active), 'Offline-Service-Worker aktiviert');
      } catch {record(false, 'Offline-Service-Worker konnte nicht überprüft werden');}
    } else record(false, 'Service Worker wird vom Browser unterstützt');
    record(isStandalone(), 'App bereits im eigenständigen Modus geöffnet');
    return entries;
  }
  function installHelp(message, diagnostics) {
    const wrap = document.createElement('div');
    const intro = document.createElement('p'); intro.className = 'install-explain';intro.textContent = message;
    wrap.append(intro);
    if (diagnostics?.length) {
      const heading = document.createElement('strong');heading.textContent = 'Installationsprüfung:';wrap.append(heading);
      const list = document.createElement('ul');list.className = 'install-check-list';
      diagnostics.forEach(item => {const li = document.createElement('li');li.textContent=item;list.append(li);});
      wrap.append(list);
    }
    const steps = document.createElement('p');steps.className='install-explain';
    steps.textContent='Öffne https://darkman0607.github.io/putzapp/ direkt in der Chrome-App (nicht innerhalb eines anderen Apps). Tippe auf ⋮ → „Zum Startbildschirm hinzufügen“ bzw. „Installieren und Verknüpfung erstellen“ → „Installieren“. Falls Chrome keine Installation anbietet: prüfe, ob „Putzmanager“ bereits unter Android Einstellungen → Apps vorhanden ist. Eine alte defekte Installation oder Verknüpfung gegebenenfalls entfernen und neu versuchen.';
    wrap.append(steps);modal('Putzmanager installieren',wrap);
  }
  async function installApp(){
    if (isStandalone()) {toast('Putzmanager läuft bereits als installierte App.');return;}
    if (deferredInstallPrompt) {
      const promptEvent=deferredInstallPrompt;deferredInstallPrompt=null;
      try {
        await promptEvent.prompt();
        const choice=await promptEvent.userChoice;
        if(choice?.outcome === 'accepted')toast('Chrome hat die Anfrage angenommen. Prüfe dein App-Symbol.');
        else installHelp('Die Installation wurde nicht abgeschlossen. Du kannst sie jederzeit erneut über das Chrome-Menü anstoßen.');
      } catch(error) {
        installHelp('Chrome konnte den Installationsdialog nicht öffnen. Prüfe die folgenden Angaben.', await installationDiagnostics());
      }
      return;
    }
    installHelp('Chrome hat der Seite noch keinen eigenen Installationsdialog angeboten. Das kann unmittelbar nach dem ersten Aufruf, bei einer bereits vorhandenen App oder durch Browsereinstellungen vorkommen.', await installationDiagnostics());
  }
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
    const action=event.target.closest('[data-action]');if(action){if(action.dataset.action==='quickstart'){navigate('clean');window.PutzmanagerCleaning?.focusPicker?.();}else if(action.dataset.action==='detail'){navigate('clean');window.PutzmanagerCleaning?.openSelected?.('detail');}return;}
    const theme=event.target.closest('[data-theme]');if(theme){state.settings.theme=theme.dataset.theme;persist();applySettings();return;}
    const accent=event.target.closest('[data-accent]');if(accent){state.settings.accent=accent.dataset.accent;persist();applySettings();return;}
    const minutes=event.target.closest('[data-minutes]');if(minutes){state.settings.budget=Number(minutes.dataset.minutes);persist();applySettings();window.PutzmanagerPlan?.render();toast(`Zeitbudget: ${state.settings.budget} Minuten`);}
  });
  $('#photos-open').addEventListener('click',()=>document.querySelector('#photo-panel').scrollIntoView({block:'start'}));
  $('#knowledge-open').addEventListener('click',()=>document.querySelector('#knowledge-panel').scrollIntoView({block:'start'}));
  $('#setup-home').addEventListener('click',()=>window.PutzmanagerEditor?.open());
  $('#notifications').addEventListener('click',()=>{navigate('plan');document.querySelector('#plan-reminders')?.scrollIntoView({block:'center'});});
  $('#install-button').addEventListener('click',installApp);
  $('#install-home-button').addEventListener('click',installApp);
  $('#close-modal').addEventListener('click',closeModal);
  $('#modal').addEventListener('click',event=>{if(event.target===$('#modal'))closeModal();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#modal').hidden){event.preventDefault();closeModal();}});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;$('#install-hint').textContent='Chrome ist bereit – jetzt installieren.';});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;$('#install-panel').hidden=true;toast('Putzmanager installiert.');});
  if(isStandalone())$('#install-panel').hidden=true;
  window.addEventListener('beforeunload',event=>{if(currentSession){event.preventDefault();event.returnValue='';}});
  if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch((error)=>{console.warn('Putzmanager Service Worker:',error);});});}
  document.addEventListener('putzmanager:homechange',()=>{renderHistory();window.PutzmanagerPlan?.render();});applySettings();renderDates();renderHistory();
  if(!storageAvailable)toast('Privater Browsermodus: dauerhafte Speicherung nicht verfügbar.');
  // Public metadata for deterministic smoke tests, never used for authentication.
  window.PutzmanagerBeta={version:VERSION,view:()=>$('.view.active')?.id,storageKey:KEY,getBudget:()=>state.settings.budget,getHome:()=>structuredClone(state.home),saveHome:(home)=>{state.home=structuredClone(home);persist();}};
})();