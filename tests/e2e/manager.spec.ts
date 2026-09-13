import { test, expect } from '@playwright/test';
import { ids, seed, query } from '../support/database';
test('manager sees own tenant, completes both evaluations with HCP sign-off and passes M7', async ({
  page,
  context,
}) => {
  await seed(ids.manager, 'manager');
  await seed(ids.foreign, 'foreign');
  await seed(ids.field, 'field');
  await context.addCookies([
    {
      name: 'academy-test-roster',
      value: ids.manager,
      url: 'http://127.0.0.1:3000',
    },
  ]);
  await page.goto('/manager');
  await expect(
    page.getByRole('link', { name: 'field@academy-test.invalid', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('foreign@academy-test.invalid')).toHaveCount(0);
  const denied = await page.goto(`/manager/${ids.foreign}`);
  expect(denied?.status()).toBe(404);
  await page.goto(`/manager/${ids.field}`);
  await page.setViewportSize({ width: 390, height: 844 });
  const hcp = page.getByRole('region', { name: 'hcp_exercise' });
  await hcp.getByRole('checkbox').check();
  await hcp.getByRole('button', { name: 'Save HCP sign-off' }).click();
  await expect(page.getByRole('status')).toHaveText('Evaluation saved.');
  const ride = page.getByRole('region', { name: 'ride_along' });
  for (const select of await ride.getByRole('combobox').all())
    await select.selectOption('4');
  await ride.getByRole('button', { name: 'Save ride-along' }).click();
  await expect(page.getByRole('status')).toHaveText('Evaluation saved.');
  const day = page.getByRole('region', { name: 'day5_eval' });
  for (const select of await day.getByRole('combobox').all())
    await select.selectOption('4');
  await day
    .getByLabel('Strengths', { exact: true })
    .fill('Builds trust and explains installation clearly.');
  await day
    .getByLabel('Weaknesses and coaching plan')
    .fill('Practice diagram labels and summarizing next steps.');
  await day.getByRole('checkbox').check();
  await day.getByRole('button', { name: 'Save Day 5' }).click();
  await expect(page.getByText('M7 Field: passed')).toBeVisible();
  const progress = await query(
    'select status from module_progress p join modules m on m.id=p.module_id where roster_id=$1 and position=7',
    [ids.field],
  );
  expect(progress[0].status).toBe('passed');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Withdrawing sign-off must remove completion, not leave a stale passed status.
  await page
    .getByRole('region', { name: 'hcp_exercise' })
    .getByRole('checkbox')
    .uncheck();
  await page.getByRole('button', { name: 'Save HCP sign-off' }).click();
  await expect(page.getByText('M7 Field: unlocked')).toBeVisible();
});
test('admin creates and archives roster membership; trainee cannot open admin page', async ({
  page,
  context,
}) => {
  await seed(ids.admin, 'admin');
  await context.addCookies([
    {
      name: 'academy-test-roster',
      value: ids.admin,
      url: 'http://127.0.0.1:3000',
    },
  ]);
  const email = `added-${Date.now()}@academy-test.invalid`;
  await page.goto('/admin/roster');
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add to roster' }) });
  await form.getByLabel('Email', { exact: true }).fill(email);
  const [{ id: tenant }] = await query(
    "select id from tenants where slug='rnb'",
  );
  const [{ id: track }] = await query(
    "select id from tracks where slug='sales-design-consultant'",
  );
  await form
    .getByRole('combobox', { name: 'Tenant', exact: true })
    .selectOption(tenant);
  await form
    .getByRole('combobox', { name: 'Track', exact: true })
    .selectOption(track);
  await form.getByRole('button', { name: 'Add to roster' }).click();
  const row = page
    .locator('li')
    .filter({ has: page.getByText(email, { exact: true }) });
  await row.getByText('Edit membership').click();
  await row.getByLabel('Active membership').uncheck();
  await row.getByRole('button', { name: 'Save membership' }).click();
  await expect(row).toContainText('inactive');
  await context.addCookies([
    {
      name: 'academy-test-roster',
      value: ids.field,
      url: 'http://127.0.0.1:3000',
    },
  ]);
  await page.goto('/admin/roster');
  await expect(page).toHaveURL(/\/learn$/);
  await query('delete from roster where email=$1', [email]);
});
