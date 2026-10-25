/* Mein Putzmanager — eigenständige private Beta 1.0.0 (U01) */
(() => {
  'use strict';
  const VERSION = '1.0.0';
  const KEY = 'mein-putzmanager-beta-v1';
  const defaultState = { settings: { theme: 'dark', accent: 'emerald', budget: 30 }, sessions: [] };
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
      }, sessions };
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
    $('#session-count').textContent=`${state.sessions.length} ${state.sessions.length===1?'Eintrag':'Einträge'}`;
    if (!state.sessions.length) {const el=document.createElement('p');el.className='empty-note';el.textContent='Noch keine Reinigung abgeschlossen.';list.append(el);return;}
    [...state.sessions].reverse().slice(0,8).forEach(session=>{
      const row=document.createElement('div');row.className='history-item';
      const texts=document.createElement('div');const name=document.createElement('strong');name.textContent=session.name;
      const date=document.createElement('small');date.textContent=dateFormat(new Date(session.at),{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      texts.append(name,date);const duration=document.createElement('span');duration.textContent=readableSeconds(session.seconds);row.append(texts,duration);list.append(row);
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
    const p=document.createElement('p');p.textContent='In dieser ersten Beta kannst du eine einfache Reinigung mit Zeitmessung dokumentieren. Raum-Checklisten und das Grundrissmodell folgen in späteren Versionen.';
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
  async function installApp(){
    if(deferredInstallPrompt){deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice;}catch(e){}deferredInstallPrompt=null;return;}
    messageModal('App installieren','Öffne die App im Chrome-Browser auf Android über HTTPS. Wähle im Browser-Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“. Falls diese Option fehlt, ist die PWA möglicherweise noch nicht installierbar oder bereits installiert.');
  }
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
    const action=event.target.closest('[data-action]');if(action){if(action.dataset.action==='quickstart'){if(currentSession){showSession();}else chooseMode();}else if(action.dataset.action==='detail')messageModal('Detailreinigung','Checklisten, Raum-Zustände und geführte Abläufe werden in V1.0.4 ergänzt. Bis dahin kannst du den Schnellstart nutzen.');return;}
    const theme=event.target.closest('[data-theme]');if(theme){state.settings.theme=theme.dataset.theme;persist();applySettings();return;}
    const accent=event.target.closest('[data-accent]');if(accent){state.settings.accent=accent.dataset.accent;persist();applySettings();return;}
    const minutes=event.target.closest('[data-minutes]');if(minutes){state.settings.budget=Number(minutes.dataset.minutes);persist();applySettings();toast(`Zeitbudget: ${state.settings.budget} Minuten`);}
  });
  $('#setup-home').addEventListener('click',()=>messageModal('Wohnung einrichten','Der vollwertige Grundriss-Editor ist für das nächste Update V1.0.1 geplant. Aktuell wird bewusst noch kein Grundriss vorgetäuscht oder gespeichert.'));
  $('#notifications').addEventListener('click',()=>messageModal('Beta-Information','V1.0.0 enthält die fünf Basisfunktionen aus Paket U01. Putzplan, Grundriss-Editor und Lager werden in den vorgesehenen Updates ergänzt.'));
  $('#install-button').addEventListener('click',installApp);
  $('#close-modal').addEventListener('click',closeModal);
  $('#modal').addEventListener('click',event=>{if(event.target===$('#modal'))closeModal();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#modal').hidden){event.preventDefault();closeModal();}});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;toast('Putzmanager installiert.');});
  window.addEventListener('beforeunload',event=>{if(currentSession){event.preventDefault();event.returnValue='';}});
  if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{/* funktioniert auch ohne SW online */});});}
  applySettings();renderDates();renderHistory();
  if(!storageAvailable)toast('Privater Browsermodus: dauerhafte Speicherung nicht verfügbar.');
  // Public metadata for deterministic smoke tests, never used for authentication.
  window.PutzmanagerBeta={version:VERSION,view:()=>$('.view.active')?.id,storageKey:KEY};
})();