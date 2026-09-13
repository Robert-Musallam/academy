import { test, expect } from '@playwright/test';
import { ids, query, seed } from '../support/database';
import { loadContent } from '../../lib/content/loader';
test('trainee completes M1 at 90%, explanation unlocks M2, durable history and locked URLs', async ({
  page,
  context,
}) => {
  await seed(ids.trainee, 'trainee');
  await context.addCookies([
    {
      name: 'academy-test-roster',
      value: ids.trainee,
      url: 'http://127.0.0.1:3000',
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/learn');
  await expect(
    page.getByRole('region', { name: 'Products & Selling Points' }),
  ).toContainText('locked');
  const locked = await page.goto('/learn/products');
  expect(locked?.status()).toBe(404);
  await page.goto('/learn/foundations');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  const pool = loadContent()
    .find((m) => m.slug === 'foundations')!
    .quizzes.find((q) => q.slug === 'exam')!.data.questions;
  const fields = page.locator('fieldset');
  await expect(fields).toHaveCount(10);
  for (let i = 0; i < 10; i++) {
    const field = fields.nth(i),
      text = await field.locator('legend').innerText(),
      q = pool.find((q) => text.endsWith(q.prompt))!;
    const answer =
      i === 0
        ? ((q.correct_answer as number) + 1) % q.options.length
        : (q.correct_answer as number);
    await field.getByRole('radio').nth(answer).check();
  }
  await page
    .getByRole('button', { name: 'Submit answers', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('90% · Passed');
  await page
    .getByLabel('Your response')
    .fill(
      'I build trust by listening to the homeowner’s goals, measuring carefully, and explaining our materials, installation and warranty before presenting the complete proposal and financing.',
    );
  await page.getByRole('button', { name: 'Submit explanation' }).click();
  await expect(
    page.getByText('Mock assessment: practice response received.', {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto('/learn');
  await expect(
    page.getByRole('region', { name: 'Products & Selling Points' }),
  ).toContainText('unlocked');
  await page.goto('/learn/history');
  await expect(page.getByText('90% · Passed', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('90% · Passed', { exact: false })).toBeVisible();
  const attempt = (
    await query('select id from quiz_attempts where roster_id=$1', [
      ids.trainee,
    ])
  )[0];
  const replay = await page.request.post('/learn/api', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: {
      action: 'submit',
      module: 'foundations',
      id: attempt.id,
      answers: {},
    },
  });
  expect(replay.status()).toBe(400);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('trainee warm sim persists conversation, grade and costs; ownership and caps enforced', async ({
  page,
  context,
}) => {
  await seed(ids.sim, 'sim');
  await context.addCookies([
    {
      name: 'academy-test-roster',
      value: ids.sim,
      url: 'http://127.0.0.1:3000',
    },
  ]);
  await page.goto('/sim');
  await page.getByRole('button', { name: 'Start appointment' }).click();
  await page
    .getByRole('textbox')
    .fill('What would you like this backyard to do for your family?');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(
    page.getByText('What would you like this backyard to do for your family?', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'End & see feedback' }).click();
  await expect(page.getByText('80', { exact: true })).toBeVisible();
  await expect(page.getByText('Three lines to improve')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /History/ }).click();
  await expect(page.getByText('80/100', { exact: false })).toBeVisible();
  const [grade] = await query(
    'select passed from sim_grades where roster_id=$1',
    [ids.sim],
  );
  expect(grade.passed).toBe(true);
  const costs = await query(
    'select operation from sim_cost_log where roster_id=$1',
    [ids.sim],
  );
  expect(costs).toHaveLength(2);
  const [run] = await query('select id from sim_runs where roster_id=$1', [
    ids.sim,
  ]);
  const data = await (await page.request.get('/sim/api')).json();
  expect(JSON.stringify(data)).not.toContain('hidden_budget');
  await context.addCookies([
    {
      name: 'academy-test-roster',
      value: ids.trainee,
      url: 'http://127.0.0.1:3000',
    },
  ]);
  const forbidden = await page.request.post('/sim/api', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: { action: 'end', id: run.id },
  });
  expect(forbidden.status()).toBe(400);
});
