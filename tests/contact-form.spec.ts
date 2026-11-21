import { test, expect } from '@playwright/test';

/*
 * Форма контакта (2026-11-21): отправка без перезагрузки, через fetch тем же POST, что ждёт Netlify Forms.
 * Ответ сервера подменён — проверяем только поведение страницы: успех заменяет поля карточкой «отправлено»,
 * сбой (напр. 404, пока в Netlify не включено распознавание форм) — показывает почту, введённый текст не теряется.
 */
async function fill(page) {
  await page.goto('/#contact');
  await page.fill('#name', 'Test');
  await page.fill('#email', 'test@example.com');
  await page.fill('#message', 'Hello from the test');
}

test('contact form: success shows the sent card and sends Netlify fields', async ({ page }) => {
  let body = '';
  await page.route('**/', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    body = route.request().postData() || '';
    return route.fulfill({ status: 200, body: 'ok' });
  });
  await fill(page);
  await page.click('.contact-form button[type="submit"]');
  await expect(page.locator('.form-sent')).toBeVisible();
  await expect(page.locator('#name')).toBeHidden();
  expect(body).toContain('form-name=contact');
  expect(body).toContain('message=Hello+from+the+test');
});

test('contact form: failure shows the email fallback and keeps the text', async ({ page }) => {
  await page.route('**/', (route) =>
    route.request().method() === 'POST' ? route.fulfill({ status: 404, body: 'nope' }) : route.continue());
  await fill(page);
  await page.click('.contact-form button[type="submit"]');
  await expect(page.locator('.form-error')).toBeVisible();
  await expect(page.locator('.form-sent')).toBeHidden();
  await expect(page.locator('#message')).toHaveValue('Hello from the test');
});
