import { expect, test } from '@playwright/test';

test('shows the Academy introduction on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Academy', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Learn. Practice. Apply. Serve. Succeed.'),
  ).toBeVisible();
});
