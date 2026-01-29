import { expect, test } from '@playwright/test';

test.describe('Isometric game E2E', () => {
  test('loads canvas and exposes E2E helpers', async ({ page }) => {
    await page.goto('/zh/isometric-test?e2e=1');
    await page.waitForFunction(() => {
      return Boolean(window.__e2e && window.__e2e.getPlayerPosition);
    });
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('auto move and trigger dialogue', async ({ page }) => {
    await page.goto('/zh/isometric-test?e2e=1');
    await page.waitForFunction(() => Boolean(window.__e2e));
    await page.waitForFunction(() => {
      const pos = window.__e2e?.getPlayerPosition();
      return Boolean(pos && Number.isFinite(pos.x) && Number.isFinite(pos.y));
    });

    const target = await page.evaluate(() => {
      const npc = window.__e2e?.getTestNpcPosition();
      if (!npc) return null;
      return { x: Math.max(0, npc.x - 1), y: npc.y };
    });

    expect(target).not.toBeNull();

    const moveResult = await page.evaluate((pos) => {
      if (!pos) return null;
      return window.__e2e?.movePlayerTo(pos.x, pos.y);
    }, target);

    expect(moveResult?.success).toBe(true);

    await page.waitForFunction(() => {
      const pos = window.__e2e?.getPlayerPosition();
      const npc = window.__e2e?.getTestNpcPosition();
      if (!pos || !npc) return false;
      return pos.x >= npc.x - 1 && pos.y >= npc.y;
    });

    const dialogueOpened = await page.evaluate(() => window.__e2e?.openDialogue('hong_qigong'));
    expect(dialogueOpened).toBe(true);

    await expect(page.getByTestId('dialogue-box')).toBeVisible();
    await expect(page.getByTestId('dialogue-text')).toBeVisible();
  });

  test('hong qigong rematch option after win', async ({ page }) => {
    await page.goto('/zh/isometric-test?e2e=1');
    await page.waitForFunction(() => Boolean(window.__e2e));

    await page.evaluate(() => window.__e2e?.openDialogue('hong_qigong'));
    await expect(page.getByTestId('dialogue-box')).toBeVisible();

    await page.getByTestId('dialogue-text').click();
    await expect(page.getByTestId('dialogue-continue')).toBeVisible();
    await page.getByTestId('dialogue-continue').click();

    await expect(page.getByRole('button', { name: '前辈，我想再跟您切磋一局' })).toHaveCount(0);

    await page.getByRole('button', { name: '请前辈指教！' }).click();

    await page.getByTestId('dialogue-text').click();
    await page.getByTestId('dialogue-continue').click();

    await page.getByTestId('dialogue-text').click();
    await page.getByRole('button', { name: '好！请前辈指教！' }).click();

    await page.getByTestId('go-challenge-accept').click();
    await page.getByTestId('go-test-win').click();

    await expect(page.getByTestId('go-test-win')).toHaveCount(0);

    await page.evaluate(() => window.__e2e?.openDialogue('hong_qigong'));
    await expect(page.getByTestId('dialogue-box')).toBeVisible();
    await page.getByTestId('dialogue-text').click();
    await expect(page.getByTestId('dialogue-continue')).toBeVisible();
    await page.getByTestId('dialogue-continue').click();
    await expect(page.getByRole('button', { name: '前辈，我想再跟您切磋一局' })).toBeVisible();
  });
});
