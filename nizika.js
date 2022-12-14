const puppeteer = require('puppeteer'); // v13.0.0 or later
const commander = require('commander');
const { format } = require('util');
const fs = require('fs');

const program = new commander.Command();

program.description('Delete GooglePhoto tool. for puppeteer')
  .requiredOption("-c, --cookie <file>", "(must) cookie file path (json) [.google.com and photos.google.com]")
  .option("-d, --daemon", "execute daemon mode", false)
  .option("-l, --loop <num>", "delete loop num", myParseInt, 10)
  .option("-n, --not", "not headless option", false)
  .option("-s, --select <num>", "delete select file num", myParseInt, 10)
  .option("-t, --timeout <sec>", "page initialize timeout", myParseInt, 180)
  .option("-u, --url <url>", "google photos url eg. https://photos.google.com/u/1/", "https://photos.google.com/")
  .parse();

const options = program.opts();
console.log(options);

const headlessOption = options.not ? false : true
const cookieFilePath = options.cookie
const googlePhotoURL = options.url
const deleteSelectFileNum = options.select;
const deleteLoop = options.loop;
const timeout = options.timeout * 1000;
const width = 1151;
const height = 843;

function myParseInt(value) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new commander.InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}

(async () => {
  let exeFlag = true;
  while (exeFlag) {
    const browser = await puppeteer.launch({ headless: headlessOption });
    const page = await browser.newPage();

    const cookies = JSON.parse(fs.readFileSync(cookieFilePath, 'utf-8'));
    await page.setCookie(...cookies);
    page.setDefaultTimeout(timeout);
    const start = new Date();
    // ブラウザを閉じたら初期値にリセットする
    let _deleteSelectFileNum = deleteSelectFileNum
    await page.setViewport({ "width": width, "height": height })
    const promises = [];
    promises.push(page.waitForNavigation());
    await page.goto(googlePhotoURL);
    await Promise.all(promises);

    let successCount = 0;

    for (let x = 0; x < deleteLoop; x++) {
      const loopProcTimeStart = new Date()
      let targetDate

      try {
        //画像がロードされるまで待つ画像の日付文字列を待機する
        const dateElm = await waitForSelectors(['.xA0gfb'], page);
        targetDate = await (await dateElm.getProperty('textContent')).jsonValue();
      }
      catch (err) {
        console.error(err);
        // 画面戦闘にある画像が欠損していると想定(灰色の画像)
        // 右のカレンダー時系列バーの真ん中をクリックして移動
        try {
          // これだとうまくいかない
          /*page.evaluate(_ => {
           window[1].scrollBy(0, window.innerHeight);
          });*/
          const timeout = 100
          const element = await waitForSelectors([["#yDmH0d"]], page, { timeout, visible: true });
          await scrollIntoViewIfNeeded(element, timeout);
          await element.click({
            offset: {
              x: width - 10,
              y: height / 2,
            },
          });
        }
        catch (err) {
          console.error(err);
        }
        continue
      }

      for (let i = 0; i < _deleteSelectFileNum; i++) {

        await page.keyboard.down("ArrowRight");
        await new Promise((r) => setTimeout(r, 200))
        await page.keyboard.up("ArrowRight");
        await new Promise((r) => setTimeout(r, 200))

        await page.keyboard.down("x");
        await new Promise((r) => setTimeout(r, 200))
        await page.keyboard.up("x");
        await new Promise((r) => setTimeout(r, 200))

        // TODO 削除し終わって画像がないのを検知する仕組みが必要
      }
      const selectNumlogElm = await waitForSelectors(['.rtExYb'], page);
      const selectNumlog = await (await selectNumlogElm.getProperty('textContent')).jsonValue();

      //選択した画像が指定した枚数に大幅に満たない場合、キー操作が巡回していると判断して枚数を減らす
      //11以上だったら10に、そうでなく6以上だったら5に
      {
        const regex = /[^0-9]/g;
        const numLogVal = parseInt(selectNumlog.replace(regex, ""), 10);
        let old = _deleteSelectFileNum
        const diff = _deleteSelectFileNum - numLogVal
        if (_deleteSelectFileNum > 10 && diff >= 10) {
          _deleteSelectFileNum = _deleteSelectFileNum - 10;
          const fixLog = format("Fix _deleteSelectFileNum  %d -> %d numLogVal=%d diff=%d", old, _deleteSelectFileNum, numLogVal, diff)
          console.log(fixLog)
        }
        else if (_deleteSelectFileNum <= 10 && _deleteSelectFileNum > 5 && diff >= 5) {
          _deleteSelectFileNum = 5;
          const fixLog = format("Fix _deleteSelectFileNum  %d -> %d numLogVal=%d diff=%d", old, _deleteSelectFileNum, numLogVal, diff)
          console.log(fixLog)
        }
      }

      try {
        await page.keyboard.down("#");
        await new Promise((r) => setTimeout(r, 200))
        await page.keyboard.up("#");

        // 削除しますか？ダイアログを待つ
        await waitForSelector('[id^="dwrFZd"]', page);//dwrFZd0 -> dwrFZd1
        successCount++;
      } catch {
        console.log("Fail: delete");
        continue;
      }

      {
        const promises = [];
        promises.push(page.keyboard.down("Enter"))

        // 描写が変わるのを待つ
        // TODO CSSセレクタでなんとかする
        // 10枚削除の場合  1 + 1 = 2秒,  20枚削除の場合 2 + 1 = 3秒
        const waitNextProcSec = ((_deleteSelectFileNum / 10) * 1000) + 1000
        promises.push(new Promise((r) => setTimeout(r, waitNextProcSec)))

        await Promise.all(promises);
      }
      const loopProcTime = new Date() - loopProcTimeStart
      const loopProcTimeSec = Math.floor(loopProcTime / 1000)
      const successCountPad = successCount.toString().padStart(3, '0')
      const timelog = format("count:%s %ds %s target=%s log=%s", successCountPad, loopProcTimeSec, getCurrentTime(), targetDate, selectNumlog)
      console.log(timelog)
    }

    await browser.close();

    const procTime = new Date() - start
    const procTimeSec = Math.floor(procTime / 1000)
    const procTimeMin = Math.floor(procTimeSec / 60)
    const procTimelog = format("%dmin (%ds)", procTimeMin, procTimeSec)
    console.log(procTimelog)

    if (!options.daemon) {
      exeFlag = false;
    }
  }

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
  //process.exit(1);
});
