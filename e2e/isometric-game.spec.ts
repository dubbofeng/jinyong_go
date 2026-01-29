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

  test('hong qigong win grants skill and rewards', async ({ page }) => {
    const uniqueId = Date.now();
    const email = `e2e_${uniqueId}@example.com`;
    const password = 'test1234';
    const username = `e2e_${uniqueId}`;

    await page.goto('/zh/register');
    await page.fill('#username', username);
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL(/\/zh\/login/);

    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL(/\/zh\/game/);

    await page.request.post('/api/player/stats');
    const initialStatsResponse = await page.request.get('/api/player/stats');
    expect(initialStatsResponse.ok()).toBe(true);
    const initialStats = await initialStatsResponse.json();

    await page.goto('/zh/isometric-test?e2e=1');
    await page.waitForFunction(() => Boolean(window.__e2e));

    await page.evaluate(() => window.__e2e?.openDialogue('hong_qigong'));
    await expect(page.getByTestId('dialogue-box')).toBeVisible();

    await page.getByTestId('dialogue-text').click();
    await expect(page.getByTestId('dialogue-continue')).toBeVisible();
    await page.getByTestId('dialogue-continue').click();

    await page.getByRole('button', { name: '请前辈指教！' }).click();

    await page.getByTestId('dialogue-text').click();
    await page.getByTestId('dialogue-continue').click();

    await page.getByTestId('dialogue-text').click();
    await page.getByRole('button', { name: '好！请前辈指教！' }).click();

    await page.getByTestId('go-challenge-accept').click();
    await page.getByTestId('go-test-win').click();

    await expect(page.getByTestId('go-test-win')).toHaveCount(0);
    await expect(page.getByTestId('dialogue-box')).toBeVisible();

    await page.getByTestId('dialogue-text').click();
    await page.getByTestId('dialogue-continue').click();

    await expect.poll(async () => {
      const skillsResponse = await page.request.get('/api/player/skills');
      if (!skillsResponse.ok()) return false;
      const skillsData = await skillsResponse.json();
      const skills = skillsData?.data || [];
      return skills.some((skill: { skillId: string }) => skill.skillId === 'kanglong_youhui');
    }).toBe(true);

    const updatedStatsResponse = await page.request.get('/api/player/stats');
    expect(updatedStatsResponse.ok()).toBe(true);
    const updatedStats = await updatedStatsResponse.json();

    const expOrLevelIncreased =
      updatedStats.data.level > initialStats.data.level ||
      updatedStats.data.experience > initialStats.data.experience;
    expect(expOrLevelIncreased).toBe(true);
    expect(updatedStats.data.silver).toBeGreaterThan(initialStats.data.silver);
  });
});
