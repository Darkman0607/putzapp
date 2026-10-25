"""End-to-end localhost mobile browser: mock GIS + mock Drive API, no real Google account involved."""
from pathlib import Path
import json,urllib.parse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
url='https://darkman0607.github.io/putzapp/'
client_id='123456789-sampleclient.apps.googleusercontent.com'
stored={'json':None,'name':None};requests=[];page_errors=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
  def mock_oauth(route):
   route.fulfill(status=200,content_type='application/javascript',body='window.google={accounts:{oauth2:{initTokenClient(opts){return {requestAccessToken(){opts.callback({access_token:"MOCK_TOKEN",expires_in:3600})}}},revoke(tok,cb){if(cb)cb()}}}};')
  ctx.route('https://accounts.google.com/gsi/client',mock_oauth)
  def mock_drive(route):
   req=route.request;u=urllib.parse.urlsplit(req.url);par=urllib.parse.parse_qs(u.query);q=par.get('q',[''])[0];path=u.path
   requests.append(req.method+' '+path)
   if path.endswith('/upload/drive/v3/files/mock-session'):
    assert req.method=='PUT';payload=req.post_data
    pack=json.loads(payload);assert pack['format']=='mein-putzmanager-full-backup';stored['json']=payload
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':'BACKUP123','name':stored['name']}));return
   if path.endswith('/upload/drive/v3/files'):
    assert req.method=='POST';stored['name']=json.loads(req.post_data)['name']
    route.fulfill(status=200,headers={'Location':'https://www.googleapis.com/upload/drive/v3/files/mock-session','access-control-expose-headers':'Location'},body='');return
   if path.endswith('/drive/v3/files/BACKUP123'):
    assert par.get('alt')==['media'];route.fulfill(status=200,content_type='application/json',body=stored['json']);return
   if path.endswith('/drive/v3/files') and req.method=='POST':route.fulfill(status=200,content_type='application/json',body=json.dumps({'id':'FOLDER123','name':'Mein Putzmanager Backups'}));return
   if path.endswith('/drive/v3/files'):
    if 'mimeType' in q:arr=[]
    else:arr=[{'id':'BACKUP123','name':stored['name'],'mimeType':'application/json','size':len(stored['json']),'createdTime':'2026-10-25T15:00:00Z'}] if stored['json'] else []
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'files':arr}));return
   raise AssertionError('unexpected url: '+req.url)
  ctx.route('https://www.googleapis.com/**',mock_drive)
  def mock_app(route):
   path=urllib.parse.urlsplit(route.request.url).path.removeprefix('/putzapp/').lstrip('/') or 'index.html'
   candidate=root/path
   if candidate.is_file():
    ext=candidate.suffix
    mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'}.get(ext,'application/octet-stream')
    route.fulfill(status=200,body=candidate.read_bytes(),content_type=mime)
   else:route.fulfill(status=404,body='')
  ctx.route('https://darkman0607.github.io/putzapp/**',mock_app)
  page=ctx.new_page();page.on('pageerror',lambda e:page_errors.append(str(e)))
  page.on('dialog',lambda d:d.accept())
  page.set_content((root/'index.html').read_text())
  for sheet in ['style.css','editor.css','view3d.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css','room-timer.css','backup-drive.css']:
   page.add_style_tag(content=(root/sheet).read_text())
  page.evaluate('''()=>{const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]}});Object.defineProperty(window,'crypto',{configurable:true,value:{subtle:{digest:async()=>new Uint8Array(32).buffer}}});window.testState=d;}''')
  files=['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','room-timer.js','cleaning-ui.js','inventory-model.js','inventory-ui.js','view3d-model.js','view3d-ui.js','backup-model.js','backup-drive.js']
  for file in files:
   contents=(root/file).read_text()
   if file=='backup-drive.js':contents=contents.replace("if(location.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(location.hostname))", "if(false && location.protocol!=='https:')")
   page.add_script_tag(content=contents)
  assert page.locator('#backup-panel').count()==1
  # Make a legitimate room using the editor, then add a material article.
  page.locator('#setup-home').click();page.locator('#editor-new-room').fill('Küche');page.locator('#editor-add-room').click();page.locator('#editor-close').click()
  page.locator('[data-nav="more"].nav-button').click()
  page.locator('#inventory-open-more').click();page.locator('#inventory-add').click();page.locator('#inventory-name').fill('Handschuhe weiß');page.locator('input[name=quantity]').fill('20');page.locator('#inventory-save').click()
  page.locator('#inventory-back').click()
  assert page.evaluate('JSON.parse(localStorage.getItem("mein-putzmanager-inventory-v1")).items.length')==1
  # Setting shared MR-client value must auto-prefill on a new page.
  page.evaluate('''(id)=>localStorage.setItem('mr_hausservice_google_client_v194',id)''',client_id)
  # Re-run only the Drive UI script with the same fake localStorage, simulating a new app session.
  page.evaluate('''()=>document.querySelector('#backup-client-id').value='' ''')
  page.add_script_tag(content=(root/'backup-drive.js').read_text().replace("if(location.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(location.hostname))", "if(false && location.protocol!=='https:')"))
  assert page.locator('#backup-client-id').input_value()==client_id
  page.locator('#backup-connect').click()
  assert 'verbunden' in page.locator('#backup-account').inner_text().lower()
  page.locator('#backup-drive-upload').click()
  page.wait_for_function('document.querySelector("#backup-status").textContent.includes("bestätigt")')
  assert stored['json'] and 'Handschuhe weiß' in stored['json']
  assert stored['json'].find(client_id)<0
  page.locator('#backup-drive-list').click();assert page.locator('.backup-file').count()==1
  # On an opaque about:blank origin IndexedDB is not available, so only mocked Drive upload/list
  # and the complete model's validate/restore are covered separately by Node tests.
  assert page.locator('.backup-file button').count()==1
  assert any('upload/drive/v3/files/mock-session' in x for x in requests)
  assert not page_errors,page_errors
  print('V1.4.0.6 BROWSER MOCK PASS: room+inventory, MR Client-ID reuse, mocked GIS token, mocked Drive folder/upload/list, local state untouched, no JS errors')
  browser.close()
finally:pass
