import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });
test('simulator preview: choose scenario, chat, sample feedback, resume history', async ({
  page,
}) => {
  await page.goto('/review/simulator');
  await expect(
    page.getByText('Interactive preview', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Maya & Dan/ }).click();
  await page.getByRole('radio', { name: /The shaded corner/ }).check();
  await page.getByRole('button', { name: 'Start appointment' }).click();
  await expect(
    page.getByRole('heading', { name: 'Maya & Dan', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('The shaded corner', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Your reply')
    .fill('Hi, what matters most about how you will use this space?');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.getByRole('log')).toContainText(
    'odor is the biggest concern',
  );
  await page.getByRole('button', { name: 'End & see feedback' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sample assessment' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Three lines to improve' }),
  ).toBeVisible();
  await expect(page.locator('.sim-fixes article')).toHaveCount(3);
  await expect(page.locator('.sim-dimension')).toHaveCount(7);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: /History/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Your appointment history' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Maya & Dan.*The shaded corner/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Sample assessment' }),
  ).toBeVisible();
});
test('preview API: rejects cross-origin writes, invalid messages, cross-session run access; hides brief', async ({
  request,
}) => {
  const endpoint = '/review/simulator/api';
  const rejected = await request.post(endpoint, {
    headers: { Origin: 'https://example.com' },
    data: { action: 'start', persona: 'maya-and-dan', scenario: 'dog-yard' },
  });
  expect(rejected.status()).toBe(403);
  const created = await request.post(endpoint, {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { action: 'start', persona: 'maya-and-dan', scenario: 'dog-yard' },
  });
  expect(created.ok()).toBe(true);
  const body = await created.json();
  expect(JSON.stringify(body)).not.toContain('hidden_budget');
  expect(JSON.stringify(body)).not.toContain('trust_unlock');
  const invalid = await request.post(endpoint, {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { action: 'send', id: body.run.id, text: '' },
  });
  expect(invalid.status()).toBe(400);
  const foreign = await request.post(endpoint, {
    headers: {
      Origin: 'http://127.0.0.1:3000',
      Cookie: 'academy-preview=other-session',
    },
    data: { action: 'send', id: body.run.id, text: 'Hello' },
  });
  expect(foreign.status()).toBe(400);
  expect((await foreign.json()).error).toBe('Appointment not found');
});
