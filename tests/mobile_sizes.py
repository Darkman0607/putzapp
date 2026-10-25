from playwright.sync_api import sync_playwright
from pathlib import Path
base=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,640),(360,740),(390,844),(430,932)]:
  page=browser.new_page(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
  page.set_content((base/'index.html').read_text())
  page.add_style_tag(content=(base/'style.css').read_text())
  page.add_style_tag(content=(base/'editor.css').read_text())
  page.add_style_tag(content=(base/'clean.css').read_text())
  page.add_script_tag(content=(base/'app.js').read_text())
  page.add_script_tag(content=(base/'geometry.js').read_text())
  page.add_script_tag(content=(base/'clean-model.js').read_text())
  page.add_script_tag(content=(base/'editor.js').read_text())
  page.locator('#setup-home').click()
  assert page.locator('#drawing-canvas').is_visible()
  assert page.locator('#editor-close').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'horizontal overflow {w}'
  page.locator('#editor-add-room').scroll_into_view_if_needed()
  assert page.locator('#editor-add-room').is_visible()
  page.locator('#editor-add-room').click()
  assert len(page.evaluate('window.PutzmanagerEditor.get().floors[0].rooms'))==1
  page.locator('#editor-close').click()
  page.locator('[data-home-room]').first.click()
  assert page.locator('#room-detail-overlay').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'U04 horizontal overflow {w}'
  page.close()
 print('MOBILE SIZES: PASS 320x640, 360x740, 390x844, 430x932 (responsive + scrollable controls)')
 browser.close()
