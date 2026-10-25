"""Category manager end-to-end: mobile create, rename, filter, reassign/delete, reload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
read=lambda f:(root/f).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':360,'height':740},is_mobile=True,has_touch=True)
 errors=[]
 def launch(store=None):
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(read('index.html'))
  for f in ['style.css','editor.css','clean.css','cleaning.css','inventory.css','cleaning-materials.css']:
   page.add_style_tag(content=read(f))
  page.evaluate('''(s)=>{const store=s||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>store[key]??null,setItem:(key,v)=>store[key]=String(v)}});window.testStore=store;}''',store)
  for f in ['app.js','geometry.js','task-model.js','clean-model.js','editor.js','cleaning-materials.js','cleaning-ui.js','inventory-model.js','inventory-ui.js']:
   page.add_script_tag(content=read(f))
  return page
 p=launch();p.locator('.nav-button[data-nav=more]').click();p.locator('#inventory-open-more').click()
 assert p.locator('#inventory-category').locator('option').count()==4
 p.locator('#inventory-manage-categories').click()
 assert p.locator('.inventory-category-row').count()==3
 p.locator('#inventory-category-form [name=name]').fill('Handschuhe')
 p.locator('#inventory-category-form [name=type]').select_option('zubehoer')
 p.locator('#inventory-category-save').click()
 assert p.locator('.inventory-category-row').count()==4
 assert p.locator('.inventory-category-row').last.inner_text().find('Handschuhe')>=0
 p.locator('#inventory-add').click();p.locator('#inventory-name').fill('Handschuhe weiß')
 p.locator('#inventory-add-form [name=category]').select_option(label='Handschuhe')
 p.locator('#inventory-add-form [name=unit]').select_option('Paar')
 p.locator('#inventory-add-form [name=quantity]').fill('50')
 p.locator('#inventory-save').click()
 assert p.locator('.inventory-card').count()==1
 assert 'Handschuhe ·' in p.locator('.inventory-card').inner_text()
 p.locator('#inventory-category').select_option(label='Handschuhe')
 assert p.locator('.inventory-card').count()==1
 p.locator('#inventory-manage-categories').click()  # closes
 p.locator('#inventory-manage-categories').click()  # reopens
 p.locator('.inventory-category-row').last.locator('button').first.click()
 p.locator('#inventory-category-form [name=name]').fill('Schutzhandschuhe')
 p.locator('#inventory-category-save').click()
 assert p.locator('#inventory-category').locator('option',has_text='Schutzhandschuhe').count()==1
 assert 'Schutzhandschuhe ·' in p.locator('.inventory-card').inner_text()
 p.on('dialog',lambda d:d.accept('1') if d.type=='prompt' else d.accept())
 p.locator('.inventory-category-row').last.locator('button').last.click()
 assert p.locator('.inventory-category-row').count()==3
 assert p.locator('#inventory-category').input_value()=='all'
 assert 'Zubehör ·' in p.locator('.inventory-card').inner_text()
 s=p.evaluate('window.PutzmanagerInventory.get()');assert s['items'][0]['quantity']==50;assert s['items'][0]['category']=='zubehoer'
 saved=p.evaluate('window.testStore');p.close();p=launch(saved)
 assert p.evaluate('window.PutzmanagerInventory.get().items[0].quantity')==50
 assert len(p.evaluate('window.PutzmanagerInventory.get().categories'))==3
 assert not errors,errors
 print('CATEGORY MOBILE PASS: create, rename, filter, assign, delete with migration, legacy IDs, reload, errors=0')
 browser.close()
