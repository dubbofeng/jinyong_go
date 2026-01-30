import { expect, test } from '@playwright/test';

async function registerAndLogin(page: import('@playwright/test').Page) {
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

  return { email, password, username };
}

test.describe('Isometric game E2E', () => {
  test('musang story plays once then dialogue opens', async ({ page }) => {
    await registerAndLogin(page);

    await page.goto('/zh/game?e2e=1&e2eStory=1');
    await page.waitForFunction(() => Boolean(window.__e2e));

    const opened = await page.evaluate(() => window.__e2e?.openDialogue('musang_daoren'));
    expect(opened).toBe(true);

    await expect(page.getByText('千变万劫')).toBeVisible();

    const nextButton = page.getByRole('button', { name: /下一句|继续/ });
    const rewardChoice = page.getByRole('button', { name: '收下棋谱与护符' });

    for (let i = 0; i < 40; i += 1) {
      if (await rewardChoice.isVisible()) break;
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    await expect(rewardChoice).toBeVisible();
    await rewardChoice.click();

    await expect(page.getByTestId('dialogue-box')).toBeVisible();

    await page.evaluate(() => window.__e2e?.openDialogue('musang_daoren'));
    await expect(page.getByTestId('dialogue-box')).toBeVisible();
    await expect(page.getByText('千变万劫')).toHaveCount(0);
  });
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
    await registerAndLogin(page);
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
      return skills.some((skill: { skillId: string; unlocked?: boolean }) =>
        skill.skillId === 'kanglong_youhui' && skill.unlocked
      );
    }).toBe(true);

    const updatedStatsResponse = await page.request.get('/api/player/stats');
    expect(updatedStatsResponse.ok()).toBe(true);
    const updatedStats = await updatedStatsResponse.json();

    const expOrLevelIncreased =
      updatedStats.data.level > initialStats.data.level ||
      updatedStats.data.experience > initialStats.data.experience;
    expect(expOrLevelIncreased).toBe(true);
    expect(updatedStats.data.silver).toBeGreaterThanOrEqual(initialStats.data.silver);
  });

  test('npc dialogue first-time tracking works', async ({ page }) => {
    await registerAndLogin(page);

    const firstDialogue = await page.request.post('/api/npcs/hong_qigong/dialogue');
    expect(firstDialogue.ok()).toBe(true);
    const firstData = await firstDialogue.json();
    expect(firstData.data.isFirstTime).toBe(true);
    expect(firstData.data.dialoguesCount).toBe(1);

    const secondDialogue = await page.request.post('/api/npcs/hong_qigong/dialogue');
    expect(secondDialogue.ok()).toBe(true);
    const secondData = await secondDialogue.json();
    expect(secondData.data.isFirstTime).toBe(false);
    expect(secondData.data.dialoguesCount).toBe(2);
  });

  test('dialogue flags can be recorded without increment', async ({ page }) => {
    await registerAndLogin(page);

    const recordFlag = await page.request.post('/api/npcs/hong_qigong/dialogue', {
      data: { flag: 'skill:kanglong_youhui', increment: false },
    });
    expect(recordFlag.ok()).toBe(true);
    const recordData = await recordFlag.json();
    expect(recordData.data.dialoguesCount).toBe(0);
    expect(recordData.data.dialogueFlags).toContain('skill:kanglong_youhui');

    const incrementDialogue = await page.request.post('/api/npcs/hong_qigong/dialogue');
    expect(incrementDialogue.ok()).toBe(true);
    const incrementData = await incrementDialogue.json();
    expect(incrementData.data.dialoguesCount).toBe(1);
    expect(incrementData.data.dialogueFlags).toContain('skill:kanglong_youhui');
  });

  test('interactions reflect dialogue count', async ({ page }) => {
    await registerAndLogin(page);

    const dialogue = await page.request.post('/api/npcs/hong_qigong/dialogue');
    expect(dialogue.ok()).toBe(true);

    const interactions = await page.request.get('/api/npcs/hong_qigong/interactions');
    expect(interactions.ok()).toBe(true);
    const interactionsData = await interactions.json();
    expect(interactionsData.data.relationship.dialoguesCount).toBe(1);
  });

  test('battle result updates relationship stats (teacher npc)', async ({ page }) => {
    await registerAndLogin(page);

    const battleResult = await page.request.post('/api/npcs/hong_qigong/battle-result', {
      data: { playerWon: true, experienceGained: 0, skillsUsed: [] },
    });
    expect(battleResult.ok()).toBe(true);
    const battleData = await battleResult.json();
    expect(battleData.data.relationship.defeated).toBe(true);
    expect(battleData.data.relationship.battlesWon).toBe(1);

    const interactions = await page.request.get('/api/npcs/hong_qigong/interactions');
    expect(interactions.ok()).toBe(true);
    const interactionsData = await interactions.json();
    expect(interactionsData.data.relationship.defeated).toBe(true);
    expect(interactionsData.data.npcType).toBe('teacher');
    expect(interactionsData.data.battle).toBeUndefined();
  });

  test('battle loss updates relationship stats', async ({ page }) => {
    await registerAndLogin(page);

    const battleResult = await page.request.post('/api/npcs/hong_qigong/battle-result', {
      data: { playerWon: false, experienceGained: 0, skillsUsed: [] },
    });
    expect(battleResult.ok()).toBe(true);
    const battleData = await battleResult.json();
    expect(battleData.data.relationship.defeated).toBe(false);
    expect(battleData.data.relationship.battlesLost).toBe(1);

    const interactions = await page.request.get('/api/npcs/hong_qigong/interactions');
    expect(interactions.ok()).toBe(true);
    const interactionsData = await interactions.json();
    expect(interactionsData.data.relationship.battlesLost).toBe(1);
  });

  test('opponent interactions include battle info', async ({ page }) => {
    await registerAndLogin(page);

    const interactions = await page.request.get('/api/npcs/duan_yanqing/interactions');
    expect(interactions.ok()).toBe(true);
    const interactionsData = await interactions.json();
    expect(interactionsData.data.npcType).toBe('opponent');
    expect(interactionsData.data.battle).toBeTruthy();
    expect(typeof interactionsData.data.battle.available).toBe('boolean');
  });
});
