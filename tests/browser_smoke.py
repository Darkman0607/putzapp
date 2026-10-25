"""Restricted-environment browser smoke: inject static files (navigation blocked)."""
from playwright.sync_api import sync_playwright
import os
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML=open(os.path.join(BASE,'index.html'),encoding='utf8').read()
CSS=open(os.path.join(BASE,'style.css'),encoding='utf8').read()
JS=open(os.path.join(BASE,'app.js'),encoding='utf8').read()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 def create_page(saved=None):
  page=context.new_page()
  page.on('dialog',lambda d:d.accept())
  page.set_content(HTML,wait_until='domcontentloaded')
  page.add_style_tag(content=CSS)
  page.evaluate('''(saved) => {
   const store=saved??{};
   Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]}});
   window._testStorage=store;
  }''',saved)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_script_tag(content=JS)
  return page,errors
 page,errors=create_page()
 assert page.locator('.nav-button').count()==4
 assert page.locator('#view-home').is_visible()
 assert page.locator('#today-date').inner_text()
 assert page.locator('#setup-home').is_visible()
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'horizontal overflow mobile'
 for tab in ['clean','plan','more','home']:
  page.locator(f'.nav-button[data-nav="{tab}"]').click()
  assert page.locator(f'#view-{tab}').is_visible(),tab
 page.locator('.nav-button[data-nav="more"]').click()
 page.locator('[data-theme="light"]').click()
 page.locator('[data-accent="violet"]').click()
 saved=page.evaluate('window._testStorage')
 assert page.locator('body').evaluate("n=>n.classList.contains('theme-light')&&n.classList.contains('accent-violet')")
 page.close()
 page,errors2=create_page(saved)
 assert page.locator('body').evaluate("n=>n.classList.contains('theme-light')&&n.classList.contains('accent-violet')"),'settings persistence'
 page.locator('[data-nav="clean"]').first.click()
 page.locator('#view-clean [data-action="quickstart"]').click()
 page.locator('#session-name').fill('Bad reinigen')
 page.locator('.modal-action').first.click()
 assert page.locator('#live-counter').is_visible()
 page.locator('#toggle-pause').click()
 page.get_by_text('Abschließen',exact=True).click()
 assert page.locator('#history-list .history-item').count()==1
 saved=page.evaluate('window._testStorage')
 page.close()
 page,errors3=create_page(saved)
 page.locator('[data-nav="clean"]').first.click()
 assert 'Bad reinigen' in page.locator('#history-list').inner_text(),'session persistence'
 page.locator('[data-nav="home"]').first.click()
 page.screenshot(path='/mnt/data/Mein_Putzmanager_Beta_Home.png',full_page=True)
 page.locator('[data-nav="more"]').first.click()
 page.screenshot(path='/mnt/data/Mein_Putzmanager_Beta_Mehr.png',full_page=True)
 assert not errors + errors2 + errors3,errors+errors2+errors3
 print('BROWSER SMOKE: PASS | 4 Tabs, 390px, no overflow, theme persistence, session, no JS errors')
 print('LIMITATION: Browser navigation blocked by environment policy; true HTTP/service worker offline and Android installation not tested')
 browser.close()