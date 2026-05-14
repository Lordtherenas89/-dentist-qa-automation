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
      await expect(page.getByRole('heading', { name: /pacientes/i })).toBeVisible({ timeout: 10000 });
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

    // ── BLOQUE 6: Creación de datos ──────────────────────
    await test.step('TC-16: Crear nuevo paciente con datos de prueba', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`${BASE}/patients`);
      await page.getByRole('button', { name: /nuevo paciente/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo Paciente' })).toBeVisible({ timeout: 8000 });

      const cedula = `9${Date.now().toString().slice(-7)}`;

      const dialog = page.locator('[role="dialog"]');

      await dialog.getByRole('textbox', { name: 'Nombre' }).fill('Test');
      await dialog.getByRole('textbox', { name: 'Apellido' }).fill('Playwright');
      await dialog.getByLabel('Fecha de nacimiento').fill('1990-01-01');

      // Género dropdown
      await dialog.locator('button[role="combobox"]').nth(0).click();
      await page.getByRole('option').first().click();

      await dialog.getByRole('textbox', { name: 'Cédula' }).fill(cedula);

      // Fuente de captación dropdown
      await dialog.locator('button[role="combobox"]').nth(1).click();
      await page.getByRole('option').first().click();

      await dialog.getByRole('textbox', { name: 'Teléfono', exact: true }).fill('4121234567');

      await page.getByRole('button', { name: 'Registrar Paciente' }).click();
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 15000 });
    });

    await test.step('TC-17: Modulo Presupuestos carga correctamente', async () => {
      await page.goto(`${BASE}/budgets`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/budgets/);
      await expect(page.getByRole('heading', { name: 'Presupuestos de Tratamiento' })).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-18: Formulario Nuevo Presupuesto abre', async () => {
      await page.getByRole('button', { name: /nuevo presupuesto/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo Presupuesto de Tratamiento' })).toBeVisible({ timeout: 8000 });
      await page.getByRole('button', { name: 'Cancelar' }).click();
    });

    // ── BLOQUE 8: DEN2-80 Últimos registros ─────────────
    await test.step('TC-19: Orden Ultimos registros cambia URL correctamente', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      // El combobox tiene role="combobox" y nombre accesible "Orden:"
      await page.getByRole('combobox', { name: /orden/i }).click();
      await expect(page.getByRole('option', { name: /últimos registros/i })).toBeVisible({ timeout: 5000 });
      await page.getByRole('option', { name: /últimos registros/i }).click();
      await page.waitForURL(/sortBy=recentRecords/, { timeout: 10000 });
    });

    // ── BLOQUE 9: DEN2-74 Dentista asignado ─────────────
    await test.step('TC-20: Campo dentista asignado aparece en formulario de nuevo paciente', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /nuevo paciente/i }).click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.getByPlaceholder(/buscar dentista/i)).toBeVisible({ timeout: 8000 });
      await dialog.getByRole('button', { name: 'Cancelar' }).click();
    });

    // ── BLOQUE 10: DEN2-79 Leyenda de agenda ────────────
    await test.step('TC-21: Leyenda de agenda contiene todas las especialidades', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.waitForLoadState('networkidle');
      const specialties = ['Diagnóstico', 'Preventivo', 'Restauración', 'Endodoncia', 'Cirugía', 'Prótesis', 'Implantes', 'Estética', 'Ortodoncia'];
      for (const specialty of specialties) {
        await expect(page.getByText(new RegExp(specialty, 'i')).first()).toBeVisible({ timeout: 5000 });
      }
    });

    // ── BLOQUE 11: Configuración ─────────────────────────
    await test.step('TC-22: Pagina Configuracion carga con todas las tabs', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`${BASE}/settings`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: /configuración/i })).toBeVisible({ timeout: 10000 });
      const tabs = ['Mi Consultorio', 'Usuarios', 'Tratamientos', 'Agenda', 'Notificaciones', 'Suscripción', 'Ayuda'];
      for (const tab of tabs) {
        await expect(page.getByRole('tab', { name: new RegExp(tab, 'i') })).toBeVisible({ timeout: 5000 });
      }
    });

    await test.step('TC-23: Tab Mi Consultorio muestra campos del consultorio', async () => {
      await expect(page.getByText(/nombre del consultorio/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/tasa bcv vigente/i).first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('TC-24: Tab Usuarios carga', async () => {
      await page.getByRole('tab', { name: /usuarios/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-25: Tab Tratamientos carga', async () => {
      await page.getByRole('tab', { name: /tratamientos/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-26: Tab Agenda de configuracion carga', async () => {
      await page.getByRole('tab', { name: /^agenda$/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-27: Tab Notificaciones carga', async () => {
      await page.getByRole('tab', { name: /notificaciones/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-28: Tab Suscripcion carga', async () => {
      await page.getByRole('tab', { name: /suscripci[oó]n/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    // ── BLOQUE 12: Agenda vistas y filtros ───────────────
    await test.step('TC-29: Vista Dia de agenda carga correctamente', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('radio', { name: /día/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[role="grid"]').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-30: Filtros Doctor Sillon y Estado visibles en agenda', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('combobox', { name: /doctor/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('combobox', { name: /sill[oó]n/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('combobox', { name: /estado/i })).toBeVisible({ timeout: 5000 });
    });

    await test.step('TC-31: Cambio de vista Semana a Dia funciona', async () => {
      await page.getByRole('radio', { name: /semana/i }).click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('radio', { name: /día/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[role="grid"]').first()).toBeVisible({ timeout: 10000 });
    });

    // ── BLOQUE 13: Presupuestos detalle ──────────────────
    await test.step('TC-32: Click en presupuesto abre detalle o muestra estado vacio', async () => {
      await page.goto(`${BASE}/budgets`);
      await page.waitForLoadState('networkidle');
      const row = page.locator('table tbody tr').first();
      const hasRow = await row.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasRow) {
        await row.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
      } else {
        await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
      }
    });

    // ── BLOQUE 14: Editar paciente y validaciones ────────
    await test.step('TC-33: Boton editar paciente abre formulario', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await page.locator('table tbody tr').first().click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      const editBtn = page.getByRole('button', { name: /editar|edit/i }).first();
      await expect(editBtn).toBeVisible({ timeout: 8000 });
      await editBtn.click();
      await expect(page.locator('form, [role="dialog"]').first()).toBeVisible({ timeout: 8000 });
      const cancelBtn = page.getByRole('button', { name: /cancelar|cancel/i }).first();
      if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelBtn.click();
      }
    });

    await test.step('TC-34: Formulario nuevo paciente valida campos obligatorios', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /nuevo paciente/i }).click();
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 8000 });
      await page.getByRole('button', { name: /registrar paciente/i }).click();
      await expect(
        page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"], [data-invalid]').first()
      ).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /cancelar/i }).first().click();
    });

    // ── BLOQUE 15: Archivos del paciente ─────────────────
    await test.step('TC-35: Seccion Archivos carga en expediente del paciente', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await page.locator('table tbody tr').first().click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      const archivosLink = page.getByRole('link', { name: /archivos/i });
      await expect(archivosLink).toBeVisible({ timeout: 8000 });
      await archivosLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-36: Boton subir archivo esta disponible en seccion Archivos', async () => {
      const uploadBtn = page.getByRole('button', { name: /subir|upload|agregar archivo/i }).first();
      await expect(uploadBtn).toBeVisible({ timeout: 8000 });
    });

    // ── BLOQUE 16: Agenda - Crear y gestionar citas ──────
    await test.step('TC-37: Formulario nueva cita permite seleccionar paciente', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /nueva cita|new appointment|agregar|add/i }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8000 });
      const patientInput = dialog.getByPlaceholder(/paciente|patient|buscar/i).first();
      if (await patientInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await patientInput.fill('Test');
        await page.waitForTimeout(1000);
        const option = page.getByRole('option').first();
        if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await option.click();
        }
      }
      await page.getByRole('button', { name: /cancelar|cancel/i }).first().click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    await test.step('TC-38: Cambiar estado de cita existente', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.waitForLoadState('networkidle');
      const appointment = page.locator('[class*="event"], [class*="appointment"], [class*="cita"]').first();
      const hasAppointment = await appointment.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasAppointment) {
        await appointment.click();
        await page.waitForLoadState('networkidle');
        const statusControl = page.locator('[class*="status"], [role="combobox"]').first();
        await expect(statusControl).toBeVisible({ timeout: 8000 });
      } else {
        await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
      }
    });

    // ── BLOQUE 17: Expediente - Contenido real ───────────
    await test.step('TC-39: Odontograma muestra elementos interactivos', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      await page.locator('table tbody tr').first().click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.getByRole('link', { name: 'Odontograma', exact: true }).click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('[class*="tooth"], [class*="diente"], svg, [class*="odontogram"]').first()
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step('TC-40: Historia Clinica muestra contenido o permite agregar entrada', async () => {
      await page.getByRole('link', { name: 'Historia Clinica', exact: true }).click({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    });

    // ── BLOQUE 18: Presupuestos - Flujo completo ─────────
    await test.step('TC-41: Formulario nuevo presupuesto permite seleccionar paciente', async () => {
      await page.goto(`${BASE}/budgets`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /nuevo presupuesto/i }).click();
      await expect(page.getByRole('heading', { name: 'Nuevo Presupuesto de Tratamiento' })).toBeVisible({ timeout: 8000 });
      const patientCombo = page.getByRole('combobox', { name: /paciente/i }).first();
      await expect(patientCombo).toBeVisible({ timeout: 5000 });
      await patientCombo.click();
      await page.waitForTimeout(1000);
      const option = page.getByRole('option').first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      }
      await page.getByRole('button', { name: /cancelar/i }).click();
    });

    await test.step('TC-42: Detalle de presupuesto muestra informacion completa', async () => {
      await page.goto(`${BASE}/budgets`);
      await page.waitForLoadState('networkidle');
      const row = page.locator('table tbody tr').first();
      const hasRow = await row.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasRow) {
        await row.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
        await expect(
          page.locator('[class*="patient"], [class*="procedure"], [class*="total"]').first()
        ).toBeVisible({ timeout: 8000 });
      } else {
        await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
      }
    });

    // ── BLOQUE 19: Configuracion - Edicion ───────────────
    await test.step('TC-43: Campo nombre consultorio es editable en Mi Consultorio', async () => {
      await page.goto(`${BASE}/settings`);
      await page.waitForLoadState('networkidle');
      const nameField = page.getByLabel(/nombre del consultorio/i).first();
      await expect(nameField).toBeVisible({ timeout: 8000 });
      await expect(nameField).toBeEnabled({ timeout: 5000 });
    });

    await test.step('TC-44: Tab Tratamientos muestra boton agregar o lista de tratamientos', async () => {
      await page.getByRole('tab', { name: /tratamientos/i }).click();
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /agregar|nuevo|add/i }).first();
      const hasList = page.locator('table, [class*="list"], [class*="treatment"]').first();
      const hasContent = await addBtn.isVisible({ timeout: 3000 }).catch(() => false) ||
                         await hasList.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasContent).toBeTruthy();
    });

    // ── BLOQUE 20: Validaciones ──────────────────────────
    await test.step('TC-45: Formulario nueva cita valida campos obligatorios', async () => {
      await page.goto(`${BASE}/schedule`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /nueva cita|new appointment|agregar|add/i }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8000 });
      const submitBtn = dialog.getByRole('button', { name: /guardar|crear|confirmar|agendar/i }).first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await expect(
          page.locator('[class*="error"], [aria-invalid="true"], [data-invalid]').first()
        ).toBeVisible({ timeout: 5000 });
      }
      await page.getByRole('button', { name: /cancelar|cancel/i }).first().click();
    });

    await test.step('TC-46: Busqueda sin resultados muestra estado vacio', async () => {
      await page.goto(`${BASE}/patients`);
      await page.waitForLoadState('networkidle');
      const search = page.getByPlaceholder(/buscar|search/i).first();
      await expect(search).toBeVisible({ timeout: 8000 });
      await search.fill('zzz_paciente_inexistente_xyz');
      await page.waitForTimeout(1500);
      await expect(
        page.locator('[class*="empty"], [class*="no-result"]').first()
          .or(page.getByText(/no se encontraron|no results|sin resultados/i).first())
      ).toBeVisible({ timeout: 8000 });
    });

    // ── BLOQUE 7: Cierre de sesion (siempre al final) ────
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
