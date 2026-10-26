// Run: node tests/reading-practice.test.cjs
// Test prerequisite: Playwright and a Chromium browser. The webpage itself
// has no dependencies and can be opened directly in a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
const choices = ['A', 'B', 'C', 'D'];
const allCorrect = [1, 0, 3, 2, 0, 2, 1, 2, 3, 0];
const partlyWrong = [1, 1, 3, 0, 0, 0, 1, 0, 3, 1];
const totalQuestions = 10;
const partlyCorrect = 5;

async function selectAnswers(page, answers) {
  for (let i = 0; i < answers.length; i++) {
    if (answers[i] !== null) await page.locator(`#q${i + 1}-${choices[answers[i]]}`).check();
  }
}

async function assertButtonFeedbackVisible(page, selector) {
  const geometry = await page.locator(selector).evaluate(node => {
    const status = node.getBoundingClientRect();
    const button = document.getElementById('submit-button').getBoundingClientRect();
    const pane = document.getElementById('practice').getBoundingClientRect();
    const x = status.left + status.width / 2;
    const y = status.top + status.height / 2;
    const topElement = document.elementFromPoint(x, y);
    return {
      visible: status.width > 0 && status.height > 0 && status.top >= 0 && status.bottom <= innerHeight,
      withinPane: status.top >= pane.top && status.bottom <= pane.bottom,
      nextToButton: Math.abs(button.top - status.bottom) <= 16,
      notCovered: !!topElement && node.contains(topElement)
    };
  });
  assert.deepEqual(geometry, { visible: true, withinPane: true, nextToButton: true, notCovered: true });
}

async function assertReset(page) {
  await page.locator('#reset-button').click();
  assert.equal(await page.locator('input:checked,input:disabled').count(), 0);
  assert.equal(await page.locator('.feedback,.answer-badge,.wrong-option,.correct-option').count(), 0);
  assert.equal(await page.locator('#results').isVisible(), false);
  assert.equal(await page.locator('#error-summary').isVisible(), false);
  assert.equal(await page.locator('.question-error:visible').count(), 0);
  assert.equal(await page.locator('#submit-button').isEnabled(), true);
  assert.equal(await page.locator('#progress-label').textContent(), `已答 0 / ${totalQuestions} 题`);
  assert.match(await page.locator('#submission-status').textContent(), /已清空/);
}

test('Submission feedback and reset work on desktop and mobile', async t => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const systemChromium = '/usr/bin/chromium';
  let browser;
  try {
    browser = await chromium.launch({
      ...(fs.existsSync(systemChromium) ? { executablePath: systemChromium } : {}),
      headless: true,
      args: ['--no-sandbox']
    });
    for (const viewport of [{ width: 1440, height: 1080 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
      await t.test(`${viewport.width}px: missing answers, 10/10, 5/10, and reset`, async () => {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          const runtimeErrors = [];
          const requests = [];
          page.on('pageerror', error => runtimeErrors.push(error.message));
          page.on('request', request => requests.push({ url: request.url(), method: request.method() }));
          await page.goto(url);
          assert.equal(await page.locator('#runtime-notice').isVisible(), false);
          assert.equal(await page.locator('#submit-button').isEnabled(), true);
          assert.equal(await page.locator('.question').count(), totalQuestions);
          assert.equal(await page.locator('input[type=radio]').count(), totalQuestions * 4);
          assert.equal(await page.locator('.question-nav a').count(), totalQuestions);
          assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuemax'), String(totalQuestions));
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          for (const number of [7, 8, 9]) {
            assert.match(await page.locator(`#question-${number} .question-kind`).textContent(), /四\/六级/);
          }
          assert.equal(await page.locator('#question-10 .question-kind').textContent(), '文章结构');
          assert.equal(await page.locator('.feedback,.answer-badge').count(), 0);

          // The four new questions must be completed before scoring is possible.
          await selectAnswers(page, allCorrect.slice(0, 6));
          await page.locator('#submit-button').click();
          assert.match(await page.locator('#error-summary').textContent(), /还有 4 题未作答：第 7、8、9、10 题/);
          assert.equal(await page.locator(':focus').getAttribute('id'), 'q7-A');
          assert.equal(await page.locator('#progress-label').textContent(), '已答 6 / 10 题');
          assert.equal(await page.locator('#results').isVisible(), false);
          assert.equal(await page.locator('.feedback,.answer-badge').count(), 0);
          await assertButtonFeedbackVisible(page, '#error-summary');

          // Regression: the original error was far above the visible question.
          await selectAnswers(page, allCorrect.map((answer, index) => index === totalQuestions - 1 ? null : answer));
          await page.locator('#submit-button').click();
          assert.match(await page.locator('#error-summary').textContent(), /还有 1 题未作答：第 10 题/);
          assert.equal(await page.locator(':focus').getAttribute('id'), 'q10-A');
          assert.equal(await page.locator('.question-error:visible').count(), 1);
          assert.equal(await page.locator('#results').isVisible(), false);
          assert.equal(await page.locator('.feedback,.answer-badge').count(), 0);
          await assertButtonFeedbackVisible(page, '#error-summary');
          const firstMissingVisible = await page.locator('#question-10 legend').evaluate(node => {
            const rect = node.getBoundingClientRect();
            const footer = document.querySelector('.quiz-actions').getBoundingClientRect();
            return rect.top >= document.querySelector('.site-header').getBoundingClientRect().bottom && rect.bottom < footer.top;
          });
          assert.equal(firstMissingVisible, true);

          // Filling the missing response allows this exact attempt to submit.
          await page.locator('#q10-A').check();
          assert.equal(await page.locator('#error-summary').isVisible(), false);
          await page.locator('#submit-button').click();
          assert.equal((await page.locator('.score').textContent()).trim(), '10 / 10');
          assert.match(await page.locator('#submission-status').textContent(), /提交成功！总分 10 \/ 10/);
          await assertButtonFeedbackVisible(page, '#submission-status');
          assert.equal(await page.locator('.feedback').count(), totalQuestions);
          assert.equal(await page.locator('.correct-option').count(), totalQuestions);
          assert.equal(await page.locator('.wrong-option').count(), 0);
          assert.equal(await page.locator('input:disabled').count(), totalQuestions * 4);
          assert.match(await page.locator('#results').textContent(), /正确答案：1.B · 2.A · 3.D · 4.C · 5.A · 6.C · 7.B · 8.C · 9.D · 10.A/);
          for (const feedback of await page.locator('.feedback').allTextContents()) {
            assert.match(feedback, /中文解析：/);
            assert.match(feedback, /原文依据：/);
          }
          const allEvidenceMatches = await page.evaluate(() => [...document.querySelectorAll('.feedback blockquote')].every(quote => {
            const target = document.querySelector(quote.nextElementSibling.getAttribute('href'));
            return target.textContent.includes(quote.textContent.slice(1, -1));
          }));
          assert.equal(allEvidenceMatches, true);

          await assertReset(page);
          await selectAnswers(page, partlyWrong);
          await page.locator('#submit-button').click();
          assert.equal((await page.locator('.score').textContent()).trim(), `${partlyCorrect} / ${totalQuestions}`);
          assert.equal(await page.locator('.wrong-option').count(), totalQuestions - partlyCorrect);
          assert.equal(await page.locator('.feedback').count(), totalQuestions);
          await assertButtonFeedbackVisible(page, '#submission-status');

          await assertReset(page);
          await selectAnswers(page, allCorrect);
          await page.locator('#submit-button').click();
          assert.equal((await page.locator('.score').textContent()).trim(), '10 / 10');
          assert.equal(await page.locator('.feedback').count(), totalQuestions, 'Repeated attempts must not duplicate explanations');
          await assertReset(page);

          // An empty attempt also displays an actionable notice at the button.
          await page.locator('#submit-button').click();
          assert.match(await page.locator('#error-summary').textContent(), /还有 10 题未作答/);
          assert.equal(await page.locator(':focus').getAttribute('id'), 'q1-A');
          await assertButtonFeedbackVisible(page, '#error-summary');
          await assertReset(page);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
          assert.deepEqual(runtimeErrors, []);
          assert.deepEqual(requests, [{ url, method: 'GET' }], 'No result uploads or external requests');
        } finally {
          await context.close();
        }
      });
    }
    await t.test('A preview that blocks JavaScript shows an explicit explanation', async () => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(url);
        assert.equal(await page.locator('#runtime-notice').isVisible(), true);
        assert.match(await page.locator('#runtime-notice').textContent(), /下载本页并用浏览器打开/);
        assert.equal(await page.locator('#submit-button').isDisabled(), true);
        assert.equal(await page.locator('#reset-button').isDisabled(), true);
        assert.equal(await page.locator('.source-page').count(), 3);
      } finally {
        await context.close();
      }
    });
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
