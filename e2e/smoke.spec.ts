import { test, expect } from '@playwright/test';

test('首页与关于页可访问，三条免责声明齐全', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '猫狗性格志' })).toBeVisible();
  await expect(page.getByRole('link', { name: '开始测试' })).toBeVisible();
  await expect(page.getByRole('link', { name: '关于与隐私' })).toBeVisible();

  await page.getByRole('link', { name: '关于与隐私' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { name: '关于与隐私' })).toBeVisible();
  await expect(
    page.getByText('本测试基于日常行为观察，仅供自我了解与参考，不构成兽医学或动物行为学诊断。'),
  ).toBeVisible();
  await expect(
    page.getByText('毛孩的行为会随年龄、健康状况与环境变化，建议定期复测。'),
  ).toBeVisible();
  await expect(
    page.getByText('若你或宠物存在紧急风险或健康问题，请及时寻求专业机构与持证人士帮助。'),
  ).toBeVisible();
});

test('结果页渲染 15 维雷达，分享卡可下载且画布非空', async ({ page }) => {
  await page.goto('/result/8JJOQ');
  await expect(page.getByRole('heading', { name: '15 维行为画像' })).toBeVisible();
  await expect(page.getByRole('img', { name: '15 维行为画像雷达图' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '保存分享卡' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^pawscribe-.*\.png$/);

  const nonBlank = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 250 || data[i + 1] !== 250 || data[i + 2] !== 249) return true;
    }
    return false;
  });
  expect(nonBlank).toBe(true);
});

test('猫册测试流可完成 34 步并落到结果页', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/test');
  await expect(page.getByText(/第 1 \/ 30 题/)).toBeVisible();

  for (let i = 0; i < 34; i++) {
    const option = page.locator('main button').filter({ hasNotText: '上一题' }).first();
    await expect(option).toBeVisible();
    await option.click();
  }

  await expect(page).toHaveURL(/\/result\/[0-9A-Z]+$/);
  await expect(page.getByRole('heading', { name: '15 维行为画像' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('狗册结果页使用狗册数据渲染雷达', async ({ page }) => {
  await page.goto('/dog/result/JI');
  await expect(page.getByRole('heading', { name: '15 维行为画像' })).toBeVisible();
  await expect(page.getByRole('img', { name: '15 维行为画像雷达图' })).toBeVisible();
  await expect(page.getByRole('link', { name: '查看类型库' })).toHaveAttribute(
    'href',
    '/library?species=dog',
  );
});

test('双宠对照计算合作度，跨物种明确拒绝', async ({ page }) => {
  await page.goto('/compare?a=0&b=8JJOQ');
  await expect(page.getByRole('heading', { name: '两只毛孩的合作度' })).toBeVisible();
  await expect(page.getByText(/^15 维距离/)).toBeVisible();

  await page.goto('/compare?speciesA=cat&speciesB=dog&a=0&b=0');
  await expect(page.getByRole('heading', { name: '跨物种不能做维度距离对照' })).toBeVisible();
});
