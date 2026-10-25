"""U16 end-to-end: navigation, create, category, combined filters, favourites, grid and reload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
read=lambda f:(root/f).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[]
 def launch(saved=None):
  page=context.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(read('index.html'))
  for f in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css','room-timer.css']:page.add_style_tag(content=read(f))
  page.evaluate('''(saved)=>{const store=saved||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>store[key]??null,setItem:(key,v)=>store[key]=String(v)}});window.testStore=store;}''',saved)
  for f in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','room-timer.js','cleaning-ui.js','inventory-model.js','inventory-ui.js']:page.add_script_tag(content=read(f))
  return page
 page=launch()
 page.locator('.nav-button[data-nav="more"]').click()
 assert page.locator('.nav-button').count()==4
 page.locator('#inventory-open-more').click()
 assert page.locator('#view-inventory').is_visible()
 assert 'leer' in page.locator('#inventory-items').inner_text()
 page.locator('#inventory-add').click()
 def add(name,category,loc,qty,minimum):
  if not page.locator('#inventory-add-form').is_visible():page.locator('#inventory-add').click()
  page.locator('#inventory-name').fill(name)
  page.locator('#inventory-add-form select[name=category]').select_option(category)
  page.locator('#inventory-add-form input[name=location]').fill(loc)
  page.locator('#inventory-add-form input[name=quantity]').fill(str(qty))
  page.locator('#inventory-add-form input[name=minimum]').fill(str(minimum))
  page.locator('#inventory-add-form button[type=submit]').click()
 add('Badreiniger','mittel','Bad',1,2)
 add('Schwamm','zubehoer','Küche',10,1)
 add('Staubsauger','geraete','Abstellraum',0,1)
 add('Allzweckreiniger','mittel','',1,0)
 assert page.locator('.inventory-card').count()==4
 assert '2 Vorratswarnungen' in page.locator('#inventory-warning-count').inner_text()
 page.locator('#inventory-category').select_option('mittel')
 page.locator('#inventory-search').fill('reiniger')
 page.locator('#inventory-location').select_option('Bad')
 assert page.locator('.inventory-card').count()==1
 assert 'Badreiniger' in page.locator('.inventory-card').inner_text()
 page.locator('.inventory-fav').click()
 page.locator('#inventory-status').select_option('favorite')
 assert page.locator('.inventory-card').count()==1
 page.locator('#inventory-view-grid').click()
 assert page.locator('#inventory-items.inventory-grid').count()==1
 store=page.evaluate('window.testStore')
 assert store['mein-putzmanager-inventory-v1']
 assert not errors,errors
 page.close();page=launch(store)
 page.locator('.nav-button[data-nav="more"]').click();page.locator('#inventory-open-more').click()
 assert page.locator('#inventory-category').input_value()=='mittel'
 assert page.locator('#inventory-view-grid').get_attribute('aria-pressed')=='true'
 assert page.locator('.inventory-card').count()==1
 page.locator('#inventory-category').select_option('all');page.locator('#inventory-location').select_option('');page.locator('#inventory-status').select_option('missing');page.locator('#inventory-search').fill('')
 assert page.locator('.inventory-card').count()==1
 assert 'Staubsauger' in page.locator('.inventory-card').inner_text()
 page.locator('#inventory-back').click();assert page.locator('#view-more').is_visible()
 page.locator('[data-nav="clean"]').click();page.locator('#inventory-open-clean').click()
 page.locator('#inventory-status').select_option('all');page.locator('#inventory-category').select_option('mittel')
 page.locator('.inventory-card').filter(has_text='Badreiniger').locator('.inventory-choose[data-action=select]').click()
 page.locator('#inventory-selection-done').click()
 assert page.locator('#view-clean').is_visible()
 assert 'Badreiniger' in page.locator('#clean-supplies-display').inner_text()
 assert not errors,errors
 print('U16 MOBILE CHROMIUM PASS: 4 additions, category/status/location/search filter, favorite, persistent grid, reload, four nav tabs, clean selection; JS errors 0')
 browser.close()
