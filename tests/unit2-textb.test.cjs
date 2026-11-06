const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');

// Expected values transcribed independently from the supplied teacher answer key.
const fixture = [
  ['c1-n14','C'],['c1-n1924','F'],['c1-n360','A'],['c1-n70','E'],['c1-n30','H'],['c1-n230','G'],['c1-n700','B'],['c1-n1000','D'],
  ['c2-q1','innovative'],['c2-q2','adaptable'],['c2-q3','apprenticeship'],['c2-q4','Watchmaking'],['c2-q5','hands-on'],['c2-q6','dead'],['c2-q7','applied'],['c2-q8','project'],['c2-q9','backpack'],['c2-q10','SMEs'],
  ['c3-a','VET'],['c3-b','Traditional universities'],['c3-c','UAS'],['c3-d','VET'],['c3-e','UAS'],['c3-f','VET'],['c3-g','UAS'],
  ['c4-q1','Fake'],['c4-q2','Fact'],['c4-q3','Fake'],['c4-q4','Fact'],['c4-q5','Fake'],
  ['c5-q1','E'],['c5-q2','C'],['c5-q3','A'],['c5-q4','F'],['c5-q5','D'],['c5-q6','B']
];
async function fill(page,entries) {
  for(const [id,value] of entries) {
    if(id.startsWith('c2-')) await page.locator(`#${id}`).fill(value);
    else if(id.startsWith('c4-')) await page.locator(`#${id}-${value}`).check();
    else await page.locator(`#${id}`).selectOption(value);
  }
}
async function dockVisible(page) {
  assert.equal(await page.locator('#submission-status').evaluate(node=>{
    const r=node.getBoundingClientRect(),b=document.getElementById('submit-button').getBoundingClientRect();
    return r.top>=0&&r.bottom<=innerHeight&&b.top>=0&&b.bottom<=innerHeight&&Math.abs(b.top-r.bottom)<75;
  }),true);
}
async function reset(page) {
  await page.locator('#reset-button').click();
  assert.equal(await page.locator('#results').isVisible(),false);
  assert.equal(await page.locator('.feedback,.question.correct,.question.incorrect,.needs-answer').count(),0);
  assert.equal(await page.locator('#extra-words').isVisible(),false);
  assert.equal(await page.locator('#worksheet :disabled').count(),0);
  assert.equal(await page.locator('#worksheet input:checked').count(),0);
  assert.equal(await page.locator('#progress-label').textContent(),'0 / 36');
  assert.equal(await page.locator('#submit-button').isEnabled(),true);
  assert.equal(await page.locator('#worksheet').evaluate(form=>[...form.querySelectorAll('select,input[type=text],textarea')].every(input=>input.value==='')),true);
}
test('Text B: the document-based 36-point worksheet',async t=>{
  const html=fs.readFileSync(path.join(__dirname,'..','unit2-textb.html'));
  const server=http.createServer((request,response)=>{response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end(html);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/unit2-textb.html`;
  let browser;
  try {
    browser=await chromium.launch({...(fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
    for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:720}]) {
      await t.test(`${viewport.width}px: 36/36, 31/36, 0/36, missing answers, reset and privacy`,async()=>{
        const context=await browser.newContext({viewport,reducedMotion:'reduce'});
        try {
          const page=await context.newPage(),errors=[],requests=[];
          page.on('pageerror',error=>errors.push(error.message));
          page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
          await page.goto(url);
          assert.equal(await page.locator('#runtime-notice').isVisible(),false);
          assert.equal(await page.locator('.question').count(),36);
          assert.deepEqual(await page.locator('.case-card:not(.bonus) .case-points').allTextContents(),['8分','10分','7分','5分','6分']);
          assert.equal(await page.locator('.feedback').count(),0);
          assert.equal(await page.locator('#results').isVisible(),false);
          assert.equal(await page.locator('#extra-words').isVisible(),false);
          assert.equal(await page.locator('.source-figure img').count(),4);
          assert.equal(await page.locator('input[name*=name],input[name*=class],input[type=email]').count(),0);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
          await page.locator('#bonus-major').fill('Chemistry');
          await page.locator('#bonus-skill1').fill('Data science');
          assert.equal(await page.locator('#progress-label').textContent(),'0 / 36');
          await page.locator('#submit-button').click();
          assert.match(await page.locator('#submission-status').textContent(),/还有36项未作答/);
          assert.equal(await page.locator(':focus').getAttribute('id'),'c1-n14');
          assert.equal(await page.locator('.feedback').count(),0);
          await dockVisible(page);
          await reset(page);

          const normalized=fixture.map(([id,value])=>[id,id==='c2-q4'?' WATCHMAKING ':id==='c2-q5'?'hands–on':value]);
          await fill(page,normalized.slice(0,-1));
          await page.locator('#submit-button').click();
          assert.match(await page.locator('#submission-status').textContent(),/还有1项未作答/);
          assert.equal(await page.locator(':focus').getAttribute('id'),'c5-q6');
          assert.equal(await page.locator('#results').isVisible(),false);
          assert.equal(await page.locator('.feedback').count(),0);
          await dockVisible(page);
          await page.locator('#c5-q6').selectOption('B');
          await page.locator('#submit-button').click();
          assert.equal((await page.locator('.total-score').textContent()).trim(),'36 / 36');
          assert.equal(await page.locator('.question.correct').count(),36);
          assert.equal(await page.locator('.question.incorrect').count(),0);
          assert.equal(await page.locator('.feedback').count(),36);
          assert.deepEqual(await page.locator('.breakdown-item strong').allTextContents(),['8 / 8','10 / 10','7 / 7','5 / 5','6 / 6']);
          assert.equal(await page.locator('#extra-words').isVisible(),true);
          assert.equal(await page.locator('#submit-button').isDisabled(),true);
          assert.equal(await page.locator('#results').evaluate(node=>node===document.activeElement),true);
          for(const [id,value] of fixture) {
            const feedback=await page.locator(`#question-${id} .feedback`).textContent();
            assert.ok(feedback.includes(`正确答案：${value}`),`${id}: teacher key`);
            assert.match(feedback,/中文讲解：/);
            assert.match(feedback,/段落提示：P/);
          }
          await dockVisible(page);
          await reset(page);
          const wrong=new Map([['c1-n14','A'],['c2-q7','fundamental'],['c3-b','UAS'],['c4-q2','Fake'],['c5-q6','A']]);
          await fill(page,fixture.map(([id,value])=>[id,wrong.get(id)||value]));
          await page.locator('#submit-button').click();
          assert.equal((await page.locator('.total-score').textContent()).trim(),'31 / 36');
          assert.equal(await page.locator('.question.incorrect').count(),5);
          assert.deepEqual(await page.locator('.breakdown-item strong').allTextContents(),['7 / 8','9 / 10','6 / 7','4 / 5','5 / 6']);
          assert.match(await page.locator('#question-c4-q5 .feedback').textContent(),/参考改写/);
          await reset(page);
          const allWrong=fixture.map(([id,value])=>[id,id.startsWith('c2-')?'London':id.startsWith('c4-')?(value==='Fact'?'Fake':'Fact'):id.startsWith('c3-')?(value==='VET'?'UAS':'VET'):(value==='A'?'B':'A')]);
          await fill(page,allWrong);
          await page.locator('#submit-button').click();
          assert.equal((await page.locator('.total-score').textContent()).trim(),'0 / 36');
          assert.equal(await page.locator('.question.incorrect').count(),36);
          assert.equal(await page.locator('.feedback').count(),36);
          await reset(page);
          for(const details of await page.locator('.source-figure').all()) {
            await details.locator('summary').click();
            await details.locator('img').evaluate(image=>image.decode());
            assert.equal(await details.locator('img').evaluate(image=>image.naturalWidth===1344),true);
            await details.locator('summary').click();
          }
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
          await page.locator('#c2-q1').fill('innovative');
          await page.reload();
          assert.equal(await page.locator('#progress-label').textContent(),'0 / 36');
          assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
          assert.equal(await page.locator('.feedback').count(),0);
          assert.deepEqual(errors,[]);
          assert.ok(requests.every(request=>request.url===url&&request.method==='GET'),'No external requests or score uploads');
        } finally {await context.close();}
      });
    }
  } finally {
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
