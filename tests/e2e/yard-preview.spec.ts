import { test, expect } from '@playwright/test';

test('yard: playable 3D scene, complete field loop and context-aware customer', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 960 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/review/yard');
  await expect(
    page.getByRole('button', { name: 'Save practice' }),
  ).toBeEnabled();
  await expect(page.locator('[data-scene-ready]')).toHaveAttribute(
    'data-scene-ready',
    'true',
    { timeout: 30000 },
  );
  await expect(page.locator('canvas')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Field tools' });
  for (const name of [
    'The low spot',
    'The back door',
    'The established tree',
    'The planted corner',
  ])
    await page.getByRole('button', { name: new RegExp(name) }).click();
  await nav.getByRole('button', { name: /Measure/ }).click();
  for (const c of ['A', 'B', 'C', 'D', 'E', 'F'])
    await page
      .getByRole('button', { name: `Measure corner ${c}`, exact: true })
      .click();
  await expect(page.locator('.yard-reading')).toContainText('736.0');
  await nav.getByRole('button', { name: /Slope/ }).click();
  await page.getByRole('button', { name: 'Read elevation S1' }).click();
  await page.getByRole('button', { name: 'Read elevation S2' }).click();
  await expect(page.locator('.yard-stations')).toContainText('0.66 ft');
  await expect(page.locator('.yard-stations')).toContainText('0.06 ft');
  await nav.getByRole('button', { name: /Materials/ }).click();
  await expect(
    page.getByRole('slider', { name: 'Separate installation layers' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Paver system', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Paver surface & joints' }),
  ).toBeVisible();
  await nav.getByRole('button', { name: /Design/ }).click();
  await page.getByRole('checkbox', { name: /Propose turf/ }).check();
  await page.getByRole('checkbox', { name: /Preview paver patio/ }).check();
  await page.getByRole('button', { name: 'Try a blocked layout' }).click();
  await expect(page.getByRole('status')).toContainText('Bench blocks');
  await nav.getByRole('button', { name: /Homeowner/ }).click();
  await page
    .getByLabel('Your message to Maya')
    .fill('What do you think about this layout?');
  await page.getByRole('button', { name: 'Send ↑' }).click();
  await expect(page.getByRole('log')).toContainText('blocks our route');
  await nav.getByRole('button', { name: /Design/ }).click();
  await page.getByRole('button', { name: 'Restore clear route' }).click();
  await nav.getByRole('button', { name: /Debrief/ }).click();
  await page.getByLabel('Lawn plan area (sqft)').fill('736');
  await page.getByLabel('Turf order with 10% waste (sqft)').fill('809.6');
  await page.getByLabel('Slope magnitude (%)').fill('3');
  await page.getByLabel('Ground falls…').selectOption('toward-house');
  await page.getByRole('button', { name: 'Check my field work' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Field assessment' })
      .or(page.locator('.yard-results')),
  ).toContainText('Complete ✓');
  await expect(page.locator('.yard-field-score')).toContainText('100');
  await page.reload();
  await nav.getByRole('button', { name: /Debrief/ }).click();
  await expect(page.locator('.yard-field-score')).toContainText('100');
  expect(errors).toEqual([]);
});
test('yard: phone navigation and accessible 2D measurement have no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/review/yard');
  await expect(
    page.getByRole('button', { name: 'Save practice' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: '2D accessible plan' }).click();
  await page
    .getByRole('navigation', { name: 'Field tools' })
    .getByRole('button', { name: /Measure/ })
    .click();
  for (const c of ['A', 'B', 'C', 'D', 'E', 'F'])
    await page
      .getByRole('button', { name: `Map point ${c}`, exact: true })
      .click();
  await expect(page.locator('.yard-reading')).toContainText('736.0');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('yard API: server computes feedback, hides budgets, and rejects forged results and cross-origin writes', async ({
  request,
}) => {
  const endpoint = '/review/yard/api';
  const state = await (await request.get(endpoint)).json();
  expect(state.run.name).toBe('Maya & Dan');
  expect(JSON.stringify(state)).not.toContain('hidden_budget');
  const headers = { Origin: 'http://127.0.0.1:3000' };
  const forged = await request.post(endpoint, {
    headers,
    data: {
      action: 'assess',
      score: 100,
      answers: { area: 736, order: 809.6, slope: 3, direction: 'toward-house' },
      evidence: state.evidence,
    },
  });
  expect(forged.status()).toBe(400);
  const result = await request.post(endpoint, {
    headers,
    data: {
      action: 'assess',
      answers: { area: 0, order: 0, slope: 0, direction: 'unsure' },
      evidence: state.evidence,
    },
  });
  expect(result.ok()).toBe(true);
  expect((await result.json()).result.score).toBe(10);
  const cross = await request.post(endpoint, {
    headers: { Origin: 'https://example.com' },
    data: { action: 'save', evidence: state.evidence },
  });
  expect(cross.status()).toBe(403);
});
