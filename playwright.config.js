import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: 'html',
  timeout: 120000,
});
