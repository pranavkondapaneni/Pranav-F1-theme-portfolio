// Browser regressions + reproducible local frame measurements (not a universal device guarantee).
// npm install && npx playwright install chromium && npm test
// BROWSER_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:8765 npm test
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const out = path.join(__dirname, 'artifacts'); fs.mkdirSync(out, { recursive: true });
const delay = ms => new Promise(r => setTimeout(r, ms));
let server, browser;
const results = [];
const errors = [];
function watch(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
}
async function ready(page, base) {
  await page.goto(`${base}/?gpu`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-car]')?.classList.contains('ready') && window.__windTunnel, { timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.dataset.intro === 'done');
  await page.waitForTimeout(2300);
}
async function layout(page, label) {
  const failures = await page.evaluate(() => {
    const failures = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('horizontal page overflow');
    for (const el of document.querySelectorAll('h1,h2,h3,.nav,.driver-card,.hero-meta,.contact-copy,.contact-copy .btn-primary')) {
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1) failures.push(`offscreen ${el.tagName}.${el.className}`);
      if (el.scrollWidth > el.clientWidth + 4) failures.push(`clipped text ${el.tagName}.${el.className}`);
    }
    const title = document.querySelector('#radio-title').getBoundingClientRect();
    const copy = document.querySelector('.contact-copy').getBoundingClientRect();
    if (title.right > copy.left + 2 && title.left < copy.right - 2 && title.bottom > copy.top + 2 && title.top < copy.bottom - 2) failures.push('contact heading overlaps copy');
    for (const stint of document.querySelectorAll('.stint')) {
      const pos = stint.querySelector('.stint-pos'), role = stint.querySelector('.stint-role');
      if (pos.scrollWidth > pos.clientWidth + 1 || pos.getBoundingClientRect().right + 4 > role.getBoundingClientRect().left) failures.push('experience position overlaps role');
    }
    const academy = document.querySelector('#academy-title');
    if (academy.getBoundingClientRect().height > parseFloat(getComputedStyle(academy).lineHeight) * 1.15) failures.push('Academy heading wraps');
    for (const image of document.images) if (image.complete && !image.naturalWidth) failures.push(`broken image ${image.src}`);
    return failures;
  });
  assert.deepEqual(failures, [], `${label}: ${failures.join(', ')}`);
  results.push({ layout: label, passed: true });
}
async function sampleFrames(page, label, scroll = false) {
  const metrics = await page.evaluate(async ({ scroll }) => {
    const frames = []; let previous;
    const start = performance.now(), carStart = window.__car.renderer.info.render.frame;
    return await new Promise(resolve => {
      function tick(now) {
        if (previous) frames.push(now - previous); previous = now;
        if (scroll) scrollTo(0, Math.min(1400, (now - start) * .65));
        if (now - start < 2500) requestAnimationFrame(tick);
        else {
          const sorted = [...frames].sort((a, b) => a - b);
          resolve({ fps: +(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)).toFixed(1), p95Ms: +sorted[Math.floor(sorted.length * .95)].toFixed(1), over33ms: frames.filter(x => x > 33.4).length, carFrames: window.__car.renderer.info.render.frame - carStart, wind: window.__windTunnel.quality });
        }
      }
      requestAnimationFrame(tick);
    });
  }, { scroll });
  results.push({ profile: label, ...metrics });
  if (!scroll) assert.equal(metrics.carFrames, 0, 'The stationary car must release the GPU, while the tunnel stays animated');
}
(async () => {
  let base = process.env.BASE_URL;
  if (!base) {
    const port = 19000 + Math.floor(Math.random() * 3000); base = `http://127.0.0.1:${port}`;
    const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    server = spawn(py, ['tools/serve.py', String(port)], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
    let online = false;
    for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) { online = true; break; } } catch {} await delay(100); }
    assert(online, 'Local test server did not start');
  }
  const brave = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
  const executablePath = process.env.BROWSER_PATH || (fs.existsSync(brave) ? brave : undefined);
  browser = await chromium.launch({ executablePath, headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 }); watch(desktop);
  await desktop.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement?.dataset.airflow === 'starting') {
        window.__airflowStartSnapshot = { intro: document.documentElement.dataset.intro, car: document.querySelector('[data-car]').dataset.state, fonts: document.fonts.status };
        observer.disconnect();
      }
    });
    observer.observe(document, { attributes: true, subtree: true, attributeFilter: ['data-airflow'] });
  });
  await ready(desktop, base);
  assert([20000, 42000].includes(await desktop.evaluate(() => window.__windTunnel.quality.of)), 'Desktop gets the tracer tier appropriate to reported hardware');
  const airflowStart = await desktop.evaluate(() => window.__airflowStartSnapshot);
  assert.equal(airflowStart.intro, 'done', 'The hero is visible before airflow starts');
  assert.equal(airflowStart.fonts, 'loaded', 'Airflow measures loaded font metrics');
  assert.notEqual(airflowStart.car, 'driving', 'Airflow must not wait for a moving intro');
  assert.equal(await desktop.evaluate(() => getComputedStyle(document.querySelector('.wind-fallback')).backgroundImage.includes('url(')), false, 'The loading atmosphere must not bake in duplicated text or car shadows');
  assert.equal(await desktop.locator('.pod span.on').count(), 0, 'The start-light sequence runs only when requested');
  assert.equal(await desktop.locator('button[data-effects]').count(), 0, 'Wind tunnel has no off switch');
  assert.equal(await desktop.locator('.garage-bar,.car-hint,.tunnel-status').count(), 0, 'Unwanted car status bar is removed');
  assert.equal(await desktop.locator('.radio-panel,.radio-head,[data-wave]').count(), 0, 'Team Radio panel and waveform are removed');
  assert.match(await desktop.locator('#radio-title').innerText(), /Box, box/i);
  assert.equal(await desktop.locator('.driver-portrait').getAttribute('src'), 'assets/pranav.webp', 'Use Pranav’s original photo, not the rejected generated outfit');
  assert.equal(await desktop.locator('.race-portrait').count(), 0);
  assert.equal(await desktop.locator('.contact-copy a').getAttribute('href'), 'https://www.linkedin.com/in/pranavkondapaneni/');
  assert(await desktop.evaluate(() => document.fonts.check('700 20px "PK Wide"') && getComputedStyle(document.documentElement).getPropertyValue('--display').includes('PK Wide')));
  assert.equal(await desktop.locator('.pod').count(), 5);
  assert.equal(await desktop.locator('.pod span').count(), 10);
  await layout(desktop, '1440 desktop');
  await desktop.screenshot({ path: path.join(out, 'desktop.png') });
  await sampleFrames(desktop, 'desktop / wind tunnel active');
  await sampleFrames(desktop, 'desktop / scrolling', true);
  await desktop.evaluate(() => scrollTo(0, 0));
  await desktop.waitForTimeout(1000);
  const carBeforeScroll = await desktop.evaluate(() => window.__carBounds?.y);
  await desktop.evaluate(() => {
    window.__scrollStopSamples = [];
    const end = performance.now() + 1300;
    function sample(t) {
      window.__scrollStopSamples.push({ y: window.__carBounds?.y, vy: window.__windTunnel.carVelocity[1] });
      if (t < end) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await desktop.mouse.wheel(0, 480);
  await desktop.waitForTimeout(1400);
  const scrollStop = await desktop.evaluate(() => ({ before: window.__scrollStopSamples[0]?.y, after: window.__carBounds?.y,
    maxFalseVelocity: Math.max(...window.__scrollStopSamples.map(s => Math.abs(s.vy))) }));
  assert(Number.isFinite(carBeforeScroll) && Math.abs(scrollStop.after - carBeforeScroll) > 100, 'The visible car moves through the viewport while scrolling');
  assert(scrollStop.maxFalseVelocity < 30, 'Scrolling a stationary car must not inject a false physical wake as airflow settles');
  results.push({ profile: 'scroll stop / stationary car wake', ...scrollStop });
  await desktop.evaluate(() => scrollTo(0, 0));
  await desktop.mouse.move(400, 400);
  await desktop.waitForTimeout(45);
  await desktop.mouse.move(530, 445, { steps: 6 });
  const pointer = await desktop.evaluate(() => window.__windTunnel.pointer);
  assert(pointer.active && pointer.radius > 20 && Math.abs(pointer.vx) + Math.abs(pointer.vy) > 10, 'Mouse movement deflects the live wind field');
  await desktop.waitForTimeout(1800);
  assert.equal(await desktop.evaluate(() => window.__windTunnel.pointer.active), false, 'Mouse disturbance fades after movement stops');
  // The pointer must open the smoke mask, not merely bend particle trajectories around it.
  const maskPixel = (x, y) => desktop.evaluate(({ x, y }) => new Promise(resolve => requestAnimationFrame(() => {
    const canvas = document.querySelector('.wind-tunnel'), gl = canvas.getContext('webgl2');
    const rgba = new Uint8Array(4);
    gl.readPixels(Math.floor(x * canvas.width / innerWidth), canvas.height - 1 - Math.floor(y * canvas.height / innerHeight), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    resolve([...rgba]);
  })), { x, y });
  await desktop.evaluate(() => { window.__windTunnel.debug = 1; });
  await desktop.waitForTimeout(100);
  const clearMask = await maskPixel(720, 700);
  await desktop.mouse.move(700, 700); await desktop.mouse.move(720, 700);
  await desktop.waitForTimeout(100);
  const cursorMask = await maskPixel(720, 700);
  await desktop.evaluate(() => { window.__windTunnel.debug = 0; });
  assert(cursorMask[0] > clearMask[0] + 80, 'Mouse cursor opens a local hole in the airflow mask');
  assert.equal(await desktop.locator('[data-view]').count(), 0, 'No camera buttons');
  const initialCamera = await desktop.evaluate(() => window.__car.camera.position.x);
  await desktop.mouse.move(900, 340); await desktop.mouse.down();
  await desktop.mouse.move(1080, 390, { steps: 12 }); await desktop.mouse.up();
  await desktop.waitForTimeout(1300);
  assert(Math.abs(await desktop.evaluate(() => window.__car.camera.position.x) - initialCamera) > .3, 'Dragging rotates the car');
  await desktop.locator('[data-car]').focus(); await desktop.keyboard.press('Home');
  await desktop.waitForFunction(x => Math.abs(window.__car.camera.position.x - x) < .03, initialCamera, { timeout: 5000 });
  assert(Math.abs(await desktop.evaluate(() => window.__car.camera.position.x) - initialCamera) < .03, 'Home resets the camera');
  await desktop.keyboard.press('ArrowRight'); await desktop.waitForTimeout(1300);
  assert(Math.abs(await desktop.evaluate(() => window.__car.camera.position.x) - initialCamera) > .3, 'Arrow keys rotate the car');
  await desktop.keyboard.press('Home');
  await desktop.locator('[data-replay]').click();
  await desktop.waitForTimeout(800);
  assert.equal(await desktop.locator('.pod span.on').count(), 10, 'All five paired racing lights illuminate');
  assert.equal(await desktop.evaluate(() => window.__car.wheelAngle), 0, 'Start lights stage the car with still wheels');
  await desktop.mouse.wheel(0, 120);
  await desktop.waitForFunction(() => document.querySelector('[data-car]').dataset.state === 'driving');
  await desktop.waitForFunction(() => Math.abs(window.__car.wheelAngle) > 1);
  await desktop.waitForFunction(() => document.querySelector('[data-car]').dataset.state === 'parked');
  const parkedWheels = await desktop.evaluate(() => ({
    angle: window.__car.wheelAngle,
    pivots: ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'].map(name => {
      const pivot = window.__car.scene.getObjectByName(name);
      return pivot && { meshes: pivot.children.length, rotated: pivot.quaternion.angleTo(pivot.userData.restRotation) };
    })
  }));
  assert(Math.abs(parkedWheels.angle) > 1, 'Wheels roll while the car arrives');
  assert(parkedWheels.pivots.every(p => p && p.meshes > 0 && p.rotated > .2), 'All four wheel meshes turn around their preserved hubs');
  await desktop.waitForTimeout(350);
  assert.equal(await desktop.evaluate(() => window.__car.wheelAngle), parkedWheels.angle, 'Wheels stop when the car parks');
  await desktop.waitForFunction(() => document.documentElement.dataset.intro === 'done');
  await desktop.locator('[data-holo]').scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(600);
  const box = await desktop.locator('[data-holo]').boundingBox();
  await desktop.mouse.move(box.x + box.width * .78, box.y + box.height * .27);
  await desktop.waitForTimeout(200);
  assert(await desktop.locator('[data-holo]').evaluate(el => el.classList.contains('is-tracking')));
  await desktop.screenshot({ path: path.join(out, 'holographic-card.png') });
  await desktop.evaluate(() => document.querySelector('button[data-motion]').click());
  await desktop.waitForTimeout(350);
  await desktop.mouse.move(500, 450);
  assert.equal(await desktop.evaluate(() => window.__windTunnel.pointer.active), false, 'Paused motion ignores pointer movement');
  assert.equal(await desktop.locator('[data-holo]').evaluate(el => getComputedStyle(el).transform), 'none');
  assert(await desktop.locator('.wind-tunnel').isVisible(), 'Pausing must retain the visible wind tunnel');
  await desktop.emulateMedia({ reducedMotion: 'reduce' });
  await desktop.emulateMedia({ reducedMotion: 'no-preference' });
  await desktop.waitForTimeout(250);
  assert(await desktop.evaluate(() => document.documentElement.dataset.motion === 'paused' && window.__windTunnel.frozen), 'OS changes must preserve explicit user pause');
  await desktop.locator('#radio-title').scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(600);
  await desktop.screenshot({ path: path.join(out, 'contact.png') });
  await desktop.reload();
  await desktop.waitForFunction(() => window.__windTunnel);
  assert.equal(await desktop.locator('button[data-motion]').getAttribute('aria-pressed'), 'true', 'Pause persists after reload');
  await desktop.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); watch(phone);
  const phonePosterRequests = [];
  phone.on('request', request => { if (/\/car-poster[^/]*\.webp$/.test(request.url())) phonePosterRequests.push(request.url().split('/').at(-1)); });
  await ready(phone, base); await layout(phone, '390 phone / 2x DPR');
  assert.deepEqual(phonePosterRequests, ['car-poster-mobile-2x.webp'], 'Phones download only the matching responsive hero poster');
  assert.equal(await phone.evaluate(() => window.__windTunnel.quality.of), 20000, 'Normal phones keep a visible tracer field at a lower solver rate');
  const gaugeCenter = await phone.locator('.hud').evaluate(el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; });
  assert(Math.abs(gaugeCenter - 195) < 1, 'The mobile speed gauge is centered in the viewport');
  await phone.screenshot({ path: path.join(out, 'phone.png') });
  await sampleFrames(phone, 'phone emulation / wind tunnel active');
  await sampleFrames(phone, 'phone emulation / scrolling', true);
  await phone.evaluate(() => scrollTo(0, 0));
  const touch = await phone.context().newCDPSession(phone);
  const initialMobileCamera = await phone.evaluate(() => window.__car.camera.position.x);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 250, y: 350 }] });
  for (const x of [235, 210, 185, 150]) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 350 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await phone.waitForTimeout(1300);
  assert.equal(await phone.evaluate(() => window.__windTunnel.pointer.active), false, 'Touch input does not inject a mouse obstacle');
  assert(Math.abs(await phone.evaluate(() => window.__car.camera.position.x) - initialMobileCamera) > .3, 'Horizontal touch drag rotates');
  assert.equal(await phone.evaluate(() => scrollY), 0, 'Horizontal drag does not scroll');
  const orbitBeforeSpin = await phone.evaluate(() => window.__car.orbitAzimuth);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 360, y: 350 }] });
  for (const x of [300, 240, 180, 100, 30]) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 350 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert(Math.abs(await phone.evaluate(() => window.__car.orbitAzimuth) - orbitBeforeSpin) >= 350, 'A full-width phone drag can spin the car 360 degrees');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 230, y: 420 }] });
  for (const y of [395, 340, 280, 210]) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 230, y }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await phone.waitForTimeout(500);
  assert(await phone.evaluate(() => scrollY > 0), 'Vertical touch scroll remains native');
  await phone.evaluate(() => scrollTo(0, 0));
  await phone.locator('[data-menu]').click(); assert.equal(await phone.locator('[data-menu]').getAttribute('aria-expanded'), 'true');
  await phone.keyboard.press('Escape'); assert.equal(await phone.locator('[data-menu]').getAttribute('aria-expanded'), 'false');
  await phone.locator('[data-menu]').click(); await phone.locator('.nav-links a[href="#academy"]').click();
  await phone.waitForTimeout(1000);
  assert.equal(await phone.locator('[data-menu]').getAttribute('aria-expanded'), 'false');
  assert.equal(await phone.evaluate(() => document.activeElement.id), 'academy');
  await phone.locator('[data-holo]').scrollIntoViewIfNeeded();
  const mobileCard = await phone.locator('[data-holo]').boundingBox();
  const cardTouchX = mobileCard.x + mobileCard.width * .65, cardTouchY = mobileCard.y + mobileCard.height * .45;
  const cardScrollStart = await phone.evaluate(() => scrollY);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cardTouchX, y: cardTouchY }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cardTouchX + 45, y: cardTouchY }] });
  await phone.waitForTimeout(80);
  assert(await phone.locator('[data-holo]').evaluate(el => el.classList.contains('is-tracking')), 'The holographic card tilts with a horizontal phone touch');
  assert.equal(await phone.evaluate(() => scrollY), cardScrollStart, 'Tilting the card does not scroll the page');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await phone.locator('[data-holo]').evaluate(el => el.classList.contains('is-tracking')), false, 'The card settles when touch ends');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cardTouchX, y: cardTouchY }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cardTouchX, y: cardTouchY - 110 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await phone.waitForTimeout(250);
  assert(await phone.evaluate(() => scrollY) > cardScrollStart, 'Vertical touch on the card retains native scrolling');
  await phone.close();

  const reduced = await browser.newPage({ viewport: { width: 320, height: 740 }, reducedMotion: 'reduce' }); watch(reduced);
  await ready(reduced, base);
  await reduced.mouse.move(140, 350);
  assert.equal(await reduced.evaluate(() => window.__windTunnel.pointer.active), false, 'Reduced motion ignores pointer movement');
  assert.equal(await reduced.locator('button[data-motion]').getAttribute('aria-pressed'), 'true');
  assert.equal(await reduced.locator('button[data-motion]').isVisible(), false, 'Reduced motion does not show an unavailable Play button');
  assert.equal(await reduced.locator('[data-replay]').isVisible(), false, 'Reduced motion does not show a no-op race replay');
  assert(await reduced.locator('.wind-tunnel').isVisible());
  await reduced.emulateMedia({ reducedMotion: 'no-preference' });
  await reduced.waitForFunction(() => !window.__windTunnel.frozen);
  const windFrame = await reduced.evaluate(() => window.__windTunnel.frame);
  await reduced.waitForTimeout(350);
  assert(await reduced.evaluate(n => window.__windTunnel.frame > n, windFrame), 'Tunnel resumes after initial reduced-motion preference is removed');
  await reduced.emulateMedia({ reducedMotion: 'reduce' }); await reduced.waitForTimeout(500);
  const fixed = await reduced.evaluate(() => window.__car.renderer.info.render.frame);
  await reduced.waitForTimeout(600);
  assert.equal(await reduced.evaluate(() => window.__car.renderer.info.render.frame), fixed);
  for (const [width, height] of [[320,740],[375,812],[640,360],[768,1024],[1024,768],[1920,1080],[2560,1440]]) {
    await reduced.setViewportSize({ width, height }); await reduced.waitForTimeout(450);
    await layout(reduced, `${width}×${height} / reduced motion`);
    if (width === 320 || width === 768) await reduced.screenshot({ path: path.join(out, `layout-${width}.png`), fullPage: true });
  }
  await reduced.setViewportSize({ width: 768, height: 1024 });
  await reduced.addStyleTag({ content: 'html { font-size: 200% !important; }' }); await reduced.waitForTimeout(600);
  await layout(reduced, '200% text / 768px');
  await reduced.close();

  const noJS = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false }); watch(noJS);
  await noJS.goto(base); assert.match(await noJS.locator('h1').innerText(), /PRANAV/); assert(await noJS.locator('[data-car-poster]').isVisible());
  await layout(noJS, 'no JavaScript'); await noJS.close();
  const fallback = await browser.newPage({ reducedMotion: 'reduce' }); watch(fallback);
  await fallback.route('**/assets/*.glb', route => route.abort());
  await fallback.goto(base); await fallback.waitForTimeout(4500);
  assert(await fallback.locator('[data-car-poster]').isVisible());
  assert.equal(await fallback.locator('[data-car]').getAttribute('tabindex'), '-1');
  assert(await fallback.locator('.wind-tunnel').isVisible()); await fallback.close();
  const saveData = await browser.newPage({ viewport: { width: 390, height: 844 } }); watch(saveData);
  await saveData.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g' } }));
  const saveDataRequests = [];
  saveData.on('request', request => { if (/three-car\.min\.js|car_mobile\.glb|car\.glb/.test(request.url())) saveDataRequests.push(request.url()); });
  await saveData.goto(base, { waitUntil: 'load' });
  await saveData.waitForFunction(() => window.__windTunnel?.quality?.of === 4000, { timeout: 30000 });
  assert.deepEqual(saveDataRequests, [], 'Save Data should use the poster without transferring the 3D car');
  assert(await saveData.locator('[data-car-poster]').isVisible());
  assert.equal(await saveData.evaluate(() => window.__windTunnel.quality.of), 4000, 'Save Data should select the lean wind tier');
  await saveData.close();
  const contextLoss = await browser.newPage({ reducedMotion: 'reduce' }); watch(contextLoss);
  await ready(contextLoss, base);
  await contextLoss.evaluate(() => { window.__loseCar = window.__car.renderer.getContext().getExtension('WEBGL_lose_context'); window.__loseCar.loseContext(); });
  await contextLoss.waitForFunction(() => !document.querySelector('[data-car-poster]').hidden);
  assert.equal(await contextLoss.locator('[data-car]').getAttribute('tabindex'), '-1');
  await contextLoss.waitForTimeout(150);
  await contextLoss.evaluate(() => window.__loseCar.restoreContext());
  await contextLoss.waitForFunction(() => document.querySelector('[data-car]').classList.contains('ready') && document.querySelector('[data-car-poster]').hidden);
  assert.equal(await contextLoss.locator('[data-car]').getAttribute('tabindex'), '0');
  await contextLoss.close();
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2)); console.log('PASS: layouts, mouse/touch/keyboard rotation, racing lights, navigation, hologram, motion, permanent tunnel, and fallbacks.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.kill(); });
