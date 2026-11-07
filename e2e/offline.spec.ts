import { expect, test } from '@playwright/test';

/**
 * Offline-first: the service worker serves the app, IndexedDB the data, and writes wait in the
 * outbox until the connection is back - then arrive exactly once.
 */
test('works offline and sends queued reports when back online', async ({
  page,
  context,
  request,
}) => {
  // First visit online: the service worker installs and precaches every file.
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => {
    const key = (await caches.keys()).find((k) => k.includes('precache'));
    return key ? (await (await caches.open(key)).keys()).length > 40 : false;
  });
  await page.reload(); // now controlled by the service worker
  await expect(page.getByText('People sheltered')).toBeVisible();
  await page.waitForTimeout(1500); // let the cache be written to IndexedDB

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/You.re offline/)).toBeVisible();
  await expect(page.getByText('People sheltered')).toBeVisible(); // saved data

  // A page never opened before still works (its code was precached).
  await page.goto('/report');
  const marker = `E2E offline ${Date.now()}`;
  await page.getByLabel('District').selectOption('kollam');
  await page.getByLabel('Where exactly?').fill(marker);
  await page.getByLabel('Description').fill('Queued while offline.');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('waiting for a connection')).toBeVisible();
  await expect(page.getByText('1 waiting to send')).toBeVisible();

  // Survives closing and reopening the app while still offline.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByText('1 waiting to send')).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('waiting to send')).toHaveCount(0, { timeout: 20_000 });

  const res = await request.get('/api/incidents?limit=100');
  const items = (await res.json()).items as { locationText: string }[];
  expect(items.filter((i) => i.locationText === marker)).toHaveLength(1);
});
