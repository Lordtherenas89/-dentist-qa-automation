import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.join(__dirname, 'browser-profile');

const browser = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 720 },
  args: ['--disable-blink-features=AutomationControlled'],
  ignoreDefaultArgs: ['--enable-automation'],
});

const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://dentist.codecarvers.dev/sign-in');

console.log('');
console.log('Inicia sesion en el navegador.');
console.log('Cuando estes en el dashboard, cierra el navegador.');
console.log('La sesion quedara guardada para siempre.');
console.log('');

browser.on('disconnected', () => {
  console.log('Sesion guardada. Ya puedes correr: npx playwright test');
  process.exit(0);
});
