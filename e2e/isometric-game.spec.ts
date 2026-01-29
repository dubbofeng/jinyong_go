import { expect, test } from '@playwright/test';

test.describe('Isometric game E2E', () => {
  test('loads canvas and exposes E2E helpers', async ({ page }) => {
    await page.goto('/zh/isometric-test?e2e=1');
    await expect(page.getByTestId('isometric-canvas')).toBeVisible();

    await page.waitForFunction(() => {
      return Boolean(window.__e2e && window.__e2e.getPlayerPosition);
    });
  });

  test('auto move and trigger dialogue', async ({ page }) => {
    await page.goto('/zh/isometric-test?e2e=1');
    await page.waitForFunction(() => Boolean(window.__e2e));

    const moveResult = await page.evaluate(() => window.__e2e?.movePlayerTo(25, 25));
    expect(moveResult?.success).toBe(true);

    await page.waitForFunction(() => {
      const pos = window.__e2e?.getPlayerPosition();
      return Boolean(pos && pos.x >= 24 && pos.y >= 24);
    });

    const dialogueOpened = await page.evaluate(() => window.__e2e?.openDialogue('hong_qigong'));
    expect(dialogueOpened).toBe(true);

    await expect(page.getByTestId('dialogue-box')).toBeVisible();
    await expect(page.getByTestId('dialogue-text')).toBeVisible();
  });
});
