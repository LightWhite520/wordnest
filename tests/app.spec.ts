import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
const url = pathToFileURL(resolve('dist/index.html')).href;
async function nav(page: Page, name: string) {
  await page.locator('.desktop-nav').getByRole('button', { name, exact: true }).click();
}
async function backup(page: Page, path: string) {
  await nav(page, '学习设置');
  const result = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click();
  const file = await result;
  await file.saveAs(path);
  return JSON.parse(await readFile(path, 'utf8'));
}
test('single HTML opens offline with no external resources and persists a theme', async ({
  page,
  context
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const requests: string[] = [];
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await context.setOffline(true);
  await page.goto(url);
  await expect(page.getByRole('heading', { name: '每一天，离更好的自己近一点。' })).toBeVisible();
  await expect(page.locator('.book-info')).toContainText('43 个词条');
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/desktop-home.png', fullPage: true });
  await page.getByRole('button', { name: '切换深色主题' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'artifacts/desktop-dark.png', fullPage: true });
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
test('create, import, resume learning, practice, and restore a full backup', async ({
  page,
  context
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await context.setOffline(true);
  await page.goto(url);
  await nav(page, '我的词书');
  await page.getByRole('button', { name: '新建词书', exact: true }).click();
  await page.getByLabel('词书名称').fill('验收词书');
  await page.getByRole('button', { name: '创建词书', exact: true }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: '导入', exact: true }).click();
  await page
    .getByLabel('粘贴词表')
    .fill(
      '英文,释义,例句\norchard,果园,We walk in the orchard.\npath,小路,Follow this path.\nORCHARD,重复词,Duplicate.\ninvalid,,'
    );
  await page.getByRole('button', { name: '整理粘贴内容' }).click();
  await page.getByRole('button', { name: '预览词条' }).click();
  await expect(page.locator('.import-counts')).toContainText('2 新词');
  await expect(page.locator('.import-counts')).toContainText('1 重复');
  await expect(page.locator('.import-counts')).toContainText('1 错误行');
  await page.getByRole('button', { name: '确认导入', exact: true }).click();
  await expect(page.locator('.success-state')).toContainText('新增 2 词');
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.getByRole('button', { name: '添加单词', exact: true }).click();
  await page.getByLabel('英文或短语').fill('grow');
  await page.getByLabel('中文释义').fill('成长');
  await page.getByRole('button', { name: '保存词条', exact: true }).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: '收藏 orchard', exact: true }).click();
  await nav(page, '今日学习');
  await page.getByRole('button', { name: '开始今日学习' }).click();
  await expect(page.locator('.flashcard-main h1')).toHaveText('orchard');
  await page.getByRole('button', { name: '查看释义' }).click();
  await page.getByRole('button', { name: /^轻松/ }).click();
  await expect(page.locator('.flashcard-main h1')).toHaveText('path');
  await page.reload();
  await expect(page.locator('.flashcard-main h1')).toHaveText('path');
  await page.screenshot({ path: 'artifacts/study.png', fullPage: true });
  const before = await backup(page, testInfo.outputPath('before.json'));
  expect(before.data.logs).toHaveLength(1);
  const cardBefore = before.data.words.find((w: any) => w.word === 'orchard').card;
  await nav(page, '专项练习');
  await page.getByLabel('练习词数').selectOption('5');
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    const prompt = await page.locator('.spelling-prompt').innerText();
    await page
      .getByLabel('英文答案')
      .fill(({ 果园: 'ORCHARD', 小路: 'path', 成长: 'grow' } as Record<string, string>)[prompt]);
    await page.getByRole('button', { name: '检查答案' }).click();
    await expect(page.locator('.answer-feedback')).toContainText('记住了，真好。');
    await page
      .getByRole('button', { name: i === 2 ? '查看练习结果' : '下一个词', exact: true })
      .click();
  }
  await expect(page.getByRole('heading', { name: '一次练习，一点进步。' })).toBeVisible();
  const after = await backup(page, testInfo.outputPath('after.json'));
  expect(after.data.words.find((w: any) => w.word === 'orchard').card).toEqual(cardBefore);
  expect(after.data.practices).toHaveLength(3);
  expect(after.data.logs).toHaveLength(1);
  await page.getByLabel('每日新词量').fill('99');
  await page.getByRole('button', { name: '保存学习偏好' }).click();
  await expect(page.getByRole('status')).toContainText('学习偏好已保存');
  await page.locator('input[type=file]').setInputFiles(testInfo.outputPath('after.json'));
  await expect(page.getByRole('heading', { name: '恢复这份学习备份？' })).toBeVisible();
  await page.getByRole('button', { name: '确认替换并恢复' }).click();
  await expect(page.getByLabel('每日新词量')).toHaveValue('20');
  await page.reload();
  await expect(page.getByLabel('每日新词量')).toHaveValue('20');
  await nav(page, '学习统计');
  await expect(page.locator('.stat-tile').first()).toContainText('3');
  await page.screenshot({ path: 'artifacts/statistics.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('responsive layouts, long phrases and mobile dialogs stay within the viewport', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.locator('.mobile-nav')).toBeVisible();
  await expect(page.getByRole('heading', { name: '每一天，离更好的自己近一点。' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/mobile-home.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.mobile-nav').getByRole('button', { name: '我的词书' }).click();
  await page.getByLabel('搜索词条').fill('the happy experiences');
  await expect(page.locator('.word-title')).toHaveText(
    'the happy experiences outweigh the unpleasant ones'
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/mobile-long-phrase.png', fullPage: true });
  await page.getByRole('button', { name: '添加单词', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 460 });
  await page.getByLabel('英文或短语').fill('mobile test');
  await page.getByLabel('中文释义').fill('手机键盘可视区域测试');
  await page.getByRole('button', { name: '保存词条', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.locator('.desktop-nav').getByRole('button', { name: '今日学习' }).click();
  await page.screenshot({ path: 'artifacts/tablet-home.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('imports the selected Excel worksheet entirely offline and rejects a corrupt backup', async ({
  page,
  context
}, testInfo) => {
  await context.setOffline(true);
  await page.goto(url);
  await nav(page, '我的词书');
  await page.getByRole('button', { name: '导入', exact: true }).click();
  await page
    .locator('dialog input[type=file]')
    .setInputFiles(resolve('tests/fixtures/two-sheets.xlsx'));
  await page.getByLabel('工作表', { exact: true }).selectOption({ label: '词汇' });
  await page.getByRole('button', { name: '预览词条' }).click();
  await expect(page.locator('.import-preview')).toContainText('meadow');
  await expect(page.locator('.import-counts')).toContainText('2 新词');
  await page.screenshot({ path: 'artifacts/import-preview.png', fullPage: true });
  await page.getByRole('button', { name: '确认导入', exact: true }).click();
  await expect(page.locator('.success-state')).toContainText('新增 2 词');
  await page.getByRole('button', { name: '完成', exact: true }).click();
  const saved = await backup(page, testInfo.outputPath('xlsx.json'));
  expect(saved.data.words).toHaveLength(45);
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}')
  });
  await expect(page.getByRole('alert')).toContainText('版本不受支持');
  const still = await backup(page, testInfo.outputPath('unchanged.json'));
  expect(still.data.words).toHaveLength(45);
});
test('two open tabs observe atomic study progress', async ({ page, context }, testInfo) => {
  await page.goto(url);
  await page.getByRole('button', { name: '开始今日学习' }).click();
  const second = await context.newPage();
  await second.goto(url + '#learn');
  await expect(second.locator('.flashcard-main h1')).toHaveText('pledge');
  await page.getByRole('button', { name: '查看释义' }).click();
  await page.getByRole('button', { name: /^良好/ }).click();
  await expect(second.locator('.flashcard-main h1')).toHaveText('attain');
  await expect(second.getByRole('button', { name: '查看释义' })).toBeVisible();
  const result = await backup(page, testInfo.outputPath('tabs.json'));
  expect(result.data.logs).toHaveLength(1);
  expect(result.data.session.position).toBe(1);
  await second.close();
});
test('keyboard rating works after using the reveal button and completion renders', async ({
  page
}) => {
  await page.goto(url);
  await nav(page, '学习设置');
  await page.getByLabel('每日新词量').fill('1');
  await page.getByRole('button', { name: '保存学习偏好' }).click();
  await nav(page, '今日学习');
  await page.getByRole('button', { name: '开始今日学习' }).click();
  await page.getByRole('button', { name: '查看释义' }).click();
  await page.keyboard.press('4');
  await expect(page.getByRole('heading', { name: '又向前走了一小步。' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/completed.png', fullPage: true });
});
test('duplicate-word validation stays visible above the editor dialog', async ({ page }) => {
  await page.goto(url);
  await nav(page, '我的词书');
  await page.getByRole('button', { name: '添加单词', exact: true }).click();
  await page.getByLabel('英文或短语').fill('pledge');
  await page.getByLabel('中文释义').fill('重复词');
  await page.getByRole('button', { name: '保存词条', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('已存在这个单词');
  await expect(page.locator('.toast')).toHaveJSProperty('popover', 'manual');
  await expect(page.getByRole('dialog')).toBeVisible();
});
