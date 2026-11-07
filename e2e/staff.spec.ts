import { expect, test, type Page } from '@playwright/test';
import { E2E_PASSWORD } from './env';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('button', { name: 'Log out' }).first()).toBeAttached();
}

async function openMeppadi(page: Page) {
  await page.goto('/manage');
  await page
    .getByRole('link', { name: /GHSS Meppadi/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'GHSS Meppadi Relief Camp' })).toBeVisible();
}

test.describe('coordinator', () => {
  test('checks a family in; the public page updates live, without reloading', async ({
    page,
    browser,
  }) => {
    await login(page, 'coordinator@crisislink.test');
    await openMeppadi(page);
    const campUrl = page.url().replace('/manage/camps/', '/camps/');

    // A member of the public is looking at the camp's public page in another browser.
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto(campUrl);
    const occupancy = visitor.getByText(/\d+ \/ 300/).first();
    const before = Number((await occupancy.textContent())!.match(/(\d+) \//)![1]);

    await page.getByRole('button', { name: 'Check someone in' }).click();
    await page.getByLabel('Full name').fill('Meera E2E');
    await page.getByLabel('Home address / village').fill('Chooralmala');
    await page.getByRole('button', { name: 'Check in', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Meera E2E' })).toBeVisible();

    // The family stays together: the next form keeps the address, clears the name.
    await expect(page.getByLabel('Full name')).toHaveValue('');
    await expect(page.getByLabel('Home address / village')).toHaveValue('Chooralmala');

    await expect(visitor.getByText(`${before + 1} / 300`).first()).toBeVisible();
  });

  test('cannot open admin pages', async ({ page }) => {
    await login(page, 'coordinator@crisislink.test');
    await page.goto('/admin/users');
    await expect(page.getByText(/don.t have (permission|access)/i)).toBeVisible();
  });
});

test.describe('volunteer', () => {
  test('claims a task and works through it', async ({ page }) => {
    await login(page, 'volunteer@crisislink.test');
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Claim task' }).first().click();
    await page.getByRole('tab', { name: 'My tasks' }).click();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByText('Started').first()).toBeVisible();
    await page.getByRole('button', { name: 'Mark done' }).first().click();
    await expect(page.getByText('Marked as done - great work!')).toBeVisible();
  });
});
