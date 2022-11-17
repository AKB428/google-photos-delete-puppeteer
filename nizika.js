const puppeteer = require('puppeteer'); // v13.0.0 or later
const commander = require('commander');
const {format} = require('util');
const fs = require('fs');

(async () => {
  const program = new commander.Command();

  program.description('Delete GooglePhoto tool. for puppeteer')
    .requiredOption("-c, --cokkie <file>", "(must) cookie file path (json) [.google.com and photos.google.com]")
    .option("-l, --loop <num>", "delete loop num", parseInt, 10)
    .option("-n, --not", "not headless option", false)
    .option("-s, --select <num>", "delete select file num", parseInt, 10)
    .option("-w, --wait <sec>", "wait init page load time (default: 25)", parseInt)
    .option("-u, --url <url>", "google photos url eg. https://photos.google.com/u/1/", "https://photos.google.com/")
    .parse();

  const options = program.opts();
  if (typeof options.wait === 'undefined') {
    options.wait = 25;
  }

  console.log(options);

  const headlessOption = options.not ? false : true
  const cookieFilePath = options.cokkie
  const browser = await puppeteer.launch({ headless: headlessOption });
  const page = await browser.newPage();
  const googlePhotoURL = options.url

  const timeout = 20000;
  const deleteSelectFileNum = options.select;
  const deleteLoop = options.loop;
  const waitFistLoad = options.wait * 1000; // TODO

  const cookies = JSON.parse(fs.readFileSync(cookieFilePath, 'utf-8'));
  await page.setCookie(...cookies);
  page.setDefaultTimeout(timeout);
  const start = new Date();
  {
    const targetPage = page;
    await targetPage.setViewport({ "width": 1151, "height": 843 })
  }
  {
    const targetPage = page;
    const promises = [];
    promises.push(targetPage.waitForNavigation());
    await targetPage.goto(googlePhotoURL);
    await Promise.all(promises);
  }

  let successCount = 0;

  for (let x = 0; x < deleteLoop; x++) {
    const loopProcTimeStart = new Date()
    // 画像がロードされるまで待つ
    // 処理画像がなくなってプログラムが暴走するのを防止するため20-30秒程度はまったほうが良い
    await new Promise((r) => setTimeout(r, waitFistLoad))
    for (let i = 0; i < deleteSelectFileNum; i++) {
      const targetPage = page;
      // waitかけないとキー操作が追いつかずに削除処理にはいるので10枚削除したくても5枚などになってしまう
      await targetPage.keyboard.down("ArrowRight");
      await new Promise((r) => setTimeout(r, 200))
      await targetPage.keyboard.up("ArrowRight");
      await new Promise((r) => setTimeout(r, 200))

      await targetPage.keyboard.down("x");
      await new Promise((r) => setTimeout(r, 200))
      await targetPage.keyboard.up("x");
      await new Promise((r) => setTimeout(r, 200))

      // TODO 「10枚選択しています」のメッセージを確認して足りない枚数分キー操作をリトライする
      // TODO 画像がないのを検知する仕組みが必要、親プロセスに終了を告知する
    }
    await new Promise((r) => setTimeout(r, 2000))

    try {
      const targetPage = page;
      await targetPage.keyboard.down("#");
      await new Promise((r) => setTimeout(r, 200))
      await targetPage.keyboard.up("#");
      // 削除確認ダイアログがでるのを待つ
      await new Promise((r) => setTimeout(r, 3000))
      await targetPage.keyboard.down("Enter");
      await new Promise((r) => setTimeout(r, (deleteSelectFileNum / 10) * 1000))
      successCount++;
    } catch {
      console.log("delete Fail");
      await new Promise((r) => setTimeout(r, 5000))
      continue;
    }

    {
      const targetPage = page;
      const promises = [];
      promises.push(targetPage.waitForNavigation());

      await targetPage.goto(googlePhotoURL);
      await Promise.all(promises);
    }
    const loopProcTime = new Date() - loopProcTimeStart
    const loopProcTimeSec = Math.floor(loopProcTime / 1000)
    const successCountPad = successCount.toString().padStart(3, '0')
    const timelog = format("successCount:%s %ds %s", successCountPad, loopProcTimeSec, getCurrentTime())
    console.log(timelog)
  }

  await browser.close();

  const procTime = new Date() - start
  const procTimeSec = Math.floor(procTime / 1000)
  const procTimeMin = Math.floor(procTimeSec / 60)
  const procTimelog = format("%dmin (%ds)", procTimeMin, procTimeSec)
  console.log(procTimelog)

  function getCurrentTime() {
    const now = new Date();
    const res = "" + now.getFullYear() + "/" + padZero(now.getMonth() + 1) + "/" + padZero(now.getDate()) + " " + padZero(now.getHours()) +
      ":" + padZero(now.getMinutes()) + ":" + padZero(now.getSeconds());
    return res;
  }

  function padZero(num) {
    return (num < 10 ? "0" : "") + num;
  }

  // gen chrome dev tool code

  // eslint-disable-next-line no-unused-vars
  async function waitForSelectors(selectors, frame, options) {
    for (const selector of selectors) {
      try {
        return await waitForSelector(selector, frame, options);
      } catch (err) {
        console.error(err);
      }
    }
    throw new Error('Could not find element for selectors: ' + JSON.stringify(selectors));
  }

  // eslint-disable-next-line no-unused-vars
  async function scrollIntoViewIfNeeded(element, timeout) {
    await waitForConnected(element, timeout);
    const isInViewport = await element.isIntersectingViewport({ threshold: 0 });
    if (isInViewport) {
      return;
    }
    await element.evaluate(element => {
      element.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'auto',
      });
    });
    await waitForInViewport(element, timeout);
  }

  async function waitForConnected(element, timeout) {
    await waitForFunction(async () => {
      return await element.getProperty('isConnected');
    }, timeout);
  }

  async function waitForInViewport(element, timeout) {
    await waitForFunction(async () => {
      return await element.isIntersectingViewport({ threshold: 0 });
    }, timeout);
  }

  // eslint-disable-next-line no-unused-vars
  async function waitForSelector(selector, frame, options) {
    if (!Array.isArray(selector)) {
      selector = [selector];
    }
    if (!selector.length) {
      throw new Error('Empty selector provided to waitForSelector');
    }
    let element = null;
    for (let i = 0; i < selector.length; i++) {
      const part = selector[i];
      if (element) {
        element = await element.waitForSelector(part, options);
      } else {
        element = await frame.waitForSelector(part, options);
      }
      if (!element) {
        throw new Error('Could not find element: ' + selector.join('>>'));
      }
      if (i < selector.length - 1) {
        element = (await element.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
      }
    }
    if (!element) {
      throw new Error('Could not find element: ' + selector.join('|'));
    }
    return element;
  }

  // eslint-disable-next-line no-unused-vars
  async function waitForElement(step, frame, timeout) {
    const count = step.count || 1;
    const operator = step.operator || '>=';
    const comp = {
      '==': (a, b) => a === b,
      '>=': (a, b) => a >= b,
      '<=': (a, b) => a <= b,
    };
    const compFn = comp[operator];
    await waitForFunction(async () => {
      const elements = await querySelectorsAll(step.selectors, frame);
      return compFn(elements.length, count);
    }, timeout);
  }

  async function querySelectorsAll(selectors, frame) {
    for (const selector of selectors) {
      const result = await querySelectorAll(selector, frame);
      if (result.length) {
        return result;
      }
    }
    return [];
  }

  async function querySelectorAll(selector, frame) {
    if (!Array.isArray(selector)) {
      selector = [selector];
    }
    if (!selector.length) {
      throw new Error('Empty selector provided to querySelectorAll');
    }
    let elements = [];
    for (let i = 0; i < selector.length; i++) {
      const part = selector[i];
      if (i === 0) {
        elements = await frame.$$(part);
      } else {
        const tmpElements = elements;
        elements = [];
        for (const el of tmpElements) {
          elements.push(...(await el.$$(part)));
        }
      }
      if (elements.length === 0) {
        return [];
      }
      if (i < selector.length - 1) {
        const tmpElements = [];
        for (const el of elements) {
          const newEl = (await el.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
          if (newEl) {
            tmpElements.push(newEl);
          }
        }
        elements = tmpElements;
      }
    }
    return elements;
  }

  async function waitForFunction(fn, timeout) {
    let isActive = true;
    setTimeout(() => {
      isActive = false;
    }, timeout);
    while (isActive) {
      const result = await fn();
      if (result) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out');
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
