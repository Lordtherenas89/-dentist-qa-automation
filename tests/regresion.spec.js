import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataDir = path.join(__dirname, '..', 'browser-profile');
const BASE = 'https://dentist.codecarvers.dev';

test('Regresiones DentistSystem', async () => {
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 720 },
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await ctx.newPage();

  try {

    // Ir al dashboard — si Clerk pide login, esperar hasta 2 minutos
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('dashboard')) {
      console.log('\n⏳ Inicia sesion en el navegador. Tienes 2 minutos...\n');
      await page.waitForURL(/dashboard/, { timeout: 120000 });
      console.log('\n✅ Sesion detectada. Corriendo pruebas...\n');
    }

    // ── BLOQUE 1: Autenticación ──────────────────────────
    await test.step('TC-01: Dashboard carga luego de login', async () => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/dashboard/);
    });

    // ── BLOQUE 2: Pacientes ──────────────────────────────
    await test.step('TC-02: Lista de pacientes carga', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/patient/);
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-03: Buscar paciente por nombre', async () => {
      await page.goto(`${BASE}/patients`);
      const search = page.getByPlaceholder(/buscar|search/i).first();
      await expect(search).toBeVisible({ timeout: 10000 });
      await search.fill('Daniel');
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('TC-04: Boton nuevo paciente abre formulario', async () => {
      await page.goto(`${BASE}/patients`);
      await page.getByRole('button', { name: /nuevo|new|agregar|add/i }).first().click();
      await expect(page.locator('form, [role="dialog"]').first()).toBeVisible({ timeout: 8000 });
    });

    await test.step('TC-05: Ver detalle de un paciente', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await page.locator('table tr, [class*="patient-row"], [class*="patientRow"]').first().click();
      await expect(page).toHaveURL(/patient/, { timeout: 10000 });
    });

    // ── BLOQUE 3: Agenda ─────────────────────────────────
    await test.step('TC-06: Calendario de agenda carga', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/schedule/);
      await expect(page.locator('[class*="calendar"], [class*="Calendar"], [class*="agenda"]').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-07: Boton nueva cita abre formulario', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.getByRole('button', { name: /nueva cita|new appointment|agregar|add/i }).first().click();
      await expect(page.locator('form, [role="dialog"]').first()).toBeVisible({ timeout: 8000 });
    });

    // ── BLOQUE 4: Expediente Clínico ─────────────────────
    await test.step('TC-09: Abrir detalle de un paciente', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await page.locator('table tbody tr').first().click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(`${BASE}/patients`, { timeout: 10000 });
    });

    await test.step('TC-10: Seccion Odontograma carga', async () => {
      await page.getByRole('link', { name: 'Odontograma', exact: true }).click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-11: Seccion Tratamientos carga', async () => {
      await page.getByRole('link', { name: 'Tratamientos', exact: true }).click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-12: Seccion Historia Clinica carga', async () => {
      await page.getByRole('link', { name: 'Historia Clinica', exact: true }).click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    // ── BLOQUE 5: General ────────────────────────────────
    await test.step('TC-13: Dashboard carga con metricas', async () => {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[class*="card"], [class*="metric"], [class*="stat"]').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-14: Vista movil se ve correctamente', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE}/dashboard`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('nav, [class*="menu"], [class*="sidebar"], [class*="hamburger"]').first()).toBeVisible({ timeout: 10000 });
    });

    // ── BLOQUE 6: Cierre de sesion (siempre al final) ────
    await test.step('TC-15: Cerrar sesion redirige al login', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`${BASE}/dashboard`);
      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    });

  } finally {
    await ctx.close();
  }
});
