import { expect, test } from '@playwright/test';

test.describe('public visitor', () => {
  test('dashboard shows real numbers and a map of Kerala', async ({ page }) => {
    // Anything blocked by the Content Security Policy shows up as a console error.
    const cspViolations: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) {
        cspViolations.push(msg.text());
      }
    });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Relief coordination for Kerala/ }),
    ).toBeVisible();
    await expect(page.getByText('Open camps')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    // Camps are drawn as circles, incidents as diamond markers.
    await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();
    await expect(page.getByText('Live', { exact: true })).toBeVisible(); // live updates connected
    await page.locator('.cl-incident').first().click(); // open a popup
    await expect(page.locator('.leaflet-popup')).toBeVisible();
    expect(cspViolations).toEqual([]);
  });

  test('finds the nearest camps with space from the phone location', async ({ browser }) => {
    // Pretend the visitor stands in Meppadi (Wayanad).
    const context = await browser.newContext({
      geolocation: { latitude: 11.52, longitude: 76.12 },
      permissions: ['geolocation'],
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Find camps near me' }).click();
    const list = page.getByRole('list', { name: 'Nearest camps with space' });
    await expect(list.getByRole('listitem').first()).toContainText('GHSS Meppadi');
    await expect(list.getByRole('link', { name: 'Directions' }).first()).toHaveAttribute(
      'href',
      /google\.com\/maps\/dir/,
    );
    await context.close();
  });

  test('reports an incident without logging in', async ({ page }) => {
    await page.goto('/report');
    await page.getByLabel('District').selectOption('thrissur');
    await page.getByLabel('Where exactly?').fill('E2E bridge');
    await page.getByLabel('Description').fill('End-to-end test report.');
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Report received' })).toBeVisible();
  });

  test('validates the form before sending', async ({ page }) => {
    await page.goto('/report');
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/report$/);
  });

  test('works on a phone screen without sideways scrolling', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    for (const path of ['/', '/needs', '/incidents', '/report', '/alerts']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
    await context.close();
  });
});
