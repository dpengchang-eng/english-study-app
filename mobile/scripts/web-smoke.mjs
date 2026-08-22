/**
 * Drives the Expo web build through Chrome DevTools Protocol and asserts the
 * Android 1.0.8 practice loop end to end: 挖空 -> 填 (wrong = pink) ->
 * 选 one-blank toast -> 选 with two blanks -> green fill.
 *
 * Usage: npx expo start --web --port 8081   (in another shell)
 *        node scripts/web-smoke.mjs
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL = process.env.SMOKE_URL ?? "http://127.0.0.1:8081/";
const PORT = 9333;
const PROFILE = "/tmp/didao-smoke-profile";
const SHOTS = process.env.SMOKE_SHOTS ?? "/tmp/didao-shots";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--window-size=412,915",
    URL
  ],
  { stdio: "ignore" }
);

let ws;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(`page error: ${result.exceptionDetails.text} ${JSON.stringify(result.result?.value ?? "")}`);
  }
  return result.result.value;
}

const text = () => evaluate("document.body.innerText");

/** Placeholders are DOM attributes, so innerText never contains them. */
const placeholders = () =>
  evaluate("[...document.querySelectorAll('input,textarea')].map((el) => el.placeholder || '')");

/** Center of the first element whose trimmed text is exactly `label`. */
async function centerOfExact(label) {
  return evaluate(`(() => {
    const want = ${JSON.stringify(label)};
    const nodes = [...document.querySelectorAll('div,span')];
    const hit = nodes.reverse().find((el) => el.textContent.trim() === want && el.getClientRects().length);
    if (!hit) return null;
    const r = hit.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
}

/** Center of the first element containing `needle` and no element child. */
async function centerOfLeaf(needle) {
  return evaluate(`(() => {
    const want = ${JSON.stringify(needle)};
    const nodes = [...document.querySelectorAll('div,span')];
    const hit = nodes.find(
      (el) => el.children.length === 0 && el.textContent.includes(want) && el.getClientRects().length
    );
    if (!hit) return null;
    const r = hit.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
}

async function mouse(type, point, extra = {}) {
  await send("Input.dispatchMouseEvent", {
    type,
    x: Math.round(point.x),
    y: Math.round(point.y),
    button: "left",
    clickCount: 1,
    ...extra
  });
}

async function tap(point) {
  await mouse("mousePressed", point);
  await sleep(40);
  await mouse("mouseReleased", point);
  await sleep(450);
}

async function longPress(point, holdMs = 1100) {
  await mouse("mouseMoved", point, { button: "none", clickCount: 0 });
  await mouse("mousePressed", point);
  await sleep(holdMs);
  await mouse("mouseReleased", point);
  await sleep(500);
}

async function typeText(value) {
  for (const char of value) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", text: char });
    await send("Input.dispatchKeyEvent", { type: "keyUp", text: char });
  }
  await sleep(300);
}

async function shot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const file = path.join(SHOTS, `${name}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  return file;
}

async function tapExact(label, what) {
  const point = await centerOfExact(label);
  assert.ok(point, `could not find tappable "${label}" (${what})`);
  await tap(point);
}

/** How many yellow (un-answered) blanks are on screen. */
const blankCount = () =>
  evaluate(`[...document.querySelectorAll('div,span')].filter((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    return bg === 'rgb(246, 226, 122)';
  }).length`);

const pinkCount = () =>
  evaluate(`[...document.querySelectorAll('div,span')].filter((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    return bg === 'rgb(244, 196, 196)';
  }).length`);

const greenWords = () =>
  evaluate(`[...document.querySelectorAll('div,span')]
    .filter((el) => el.children.length === 0 && getComputedStyle(el).color === 'rgb(46, 125, 79)')
    .map((el) => el.textContent.trim())`);

async function main() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        break;
      }
    } catch {
      // chrome still starting
    }
    await sleep(500);
  }
  assert.ok(ws, "could not attach to Chrome");

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });

  await send("Page.enable");
  await send("Runtime.enable");

  // Start from clean demo data.
  await evaluate("(() => { try { localStorage.clear(); } catch {} return 1; })()");
  await send("Page.reload");

  let home = "";
  for (let i = 0; i < 60; i += 1) {
    await sleep(1000);
    home = (await text()) ?? "";
    if (home.includes("生活集") && home.includes("回顾今天")) break;
  }
  assert.ok(home.includes("生活集"), `home never rendered. Saw: ${home.slice(0, 400)}`);

  // --- Home feed copy (image 1) ---
  for (const needle of ["生活集", "回顾今天", "回顾昨天", "记忆盲盒", "忙碌日检查语言功能", "Aug 20 · 10:55 PM"]) {
    assert.ok(home.includes(needle), `home missing ${needle}`);
  }
  await shot("01-home");

  // --- Drawer (image 2) ---
  await tapExact("☰", "hamburger");
  const drawer = await text();
  for (const needle of ["OIO-377YEQ", "PRO", "卡片", "记录天数", "AI 助手 Beta", "回忆", "收藏夹", "生活集", "未分类"]) {
    assert.ok(drawer.includes(needle), `drawer missing ${needle}`);
  }
  assert.ok(drawer.includes("Jun") && drawer.includes("Aug"), "drawer heatmap month labels missing");
  await shot("02-drawer");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(600);

  // --- Card detail, second card has no blanks yet ---
  await tapExact("1688义乌购买纸箱更便宜", "second feed card");
  let detail = await text();
  assert.ok(detail.includes("目标语言改写"), `card detail missing 目标语言改写. Saw: ${detail.slice(0, 300)}`);
  assert.ok(detail.includes("填") && detail.includes("选"), "practice toolbar 填/选 did not render");
  assert.equal(await blankCount(), 0, "second card should start with no blanks");
  await shot("03-card-detail");

  // --- 挖空 via tap (web) / long-press still works on device ---
  const cheaper = await centerOfLeaf("cheaper");
  assert.ok(cheaper, "could not locate the word cheaper");
  await tap(cheaper);
  detail = await text();
  assert.ok(detail.includes("查词"), "tap did not open the word menu (查词)");
  assert.ok(detail.includes("挖空"), "word menu missing 挖空");
  assert.ok(!detail.includes("查询"), "menu must say 查词, never 查询");
  await shot("04-longpress-menu");

  await tapExact("挖空", "cloze the word");
  assert.equal(await blankCount(), 1, "挖空 should leave exactly one yellow blank");
  await shot("05-one-blank");

  // --- 选 with one blank: toast + fall back to 填 (image 7) ---
  await tapExact("选", "select mode with one blank");
  detail = await text();
  assert.ok(
    detail.includes("至少需要两个不同的填空，已切换到键盘填空"),
    `one-blank toast text wrong. Saw: ${detail.slice(0, 600)}`
  );
  await shot("06-select-toast");

  // --- 填 wrong answer turns pink (image 6) ---
  const blankInput = await evaluate(`(() => {
    const el = document.querySelector('input');
    if (!el) return null;
    el.focus();
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  assert.ok(blankInput, "填 fallback did not produce an inline input");
  await tap(blankInput);
  await typeText("a");
  await tapExact("✓", "check the typed answer");
  assert.equal(await pinkCount(), 1, "a wrong 填 answer should turn the blank pink");
  await shot("07-fill-wrong-pink");

  // --- Second blank, then 选 shows two plain chips (image 8) ---
  const tough = await centerOfLeaf("Tough");
  assert.ok(tough, "could not locate the word Tough");
  await tap(tough);
  await tapExact("挖空", "cloze the second word");
  await tapExact("选", "select mode with two blanks");
  detail = await text();
  assert.ok(detail.includes("cheaper"), "option chip cheaper missing");
  assert.ok(detail.includes("Tough"), "option chip Tough missing");
  for (const banned of ["检查", "提交"]) {
    assert.ok(!detail.includes(banned), `选 must not show a ${banned} button`);
  }
  await shot("08-select-two-chips");

  // --- Correct pick fills green (image 9) ---
  await tapExact("cheaper", "correct option chip");
  const green = await greenWords();
  assert.ok(green.includes("cheaper"), `correct pick should fill green. Green words: ${JSON.stringify(green)}`);
  await shot("09-select-green");

  // --- 回忆 hub (image 15) ---
  await tapExact("‹", "back to the feed");
  await tapExact("☰", "hamburger");
  await tapExact("回忆", "memories");
  let memories = await text();
  for (const needle of ["回忆", "今天", "昨天", "选择日期", "关键词搜索", "记忆盲盒"]) {
    assert.ok(memories.includes(needle), `回忆 missing ${needle}`);
  }
  assert.ok(memories.includes("没有 Card"), "empty 今天/昨天 tiles must read 没有 Card");
  await shot("10-memories");

  // --- 记录日历 (image 10) ---
  await tapExact("选择日期", "open the record calendar");
  const calendar = await text();
  for (const needle of ["记录日历", "月", "年", "张卡片", "字", "本月记录"]) {
    assert.ok(calendar.includes(needle), `记录日历 missing ${needle}`);
  }
  assert.ok(!calendar.includes("累计记录"), "calendar must say 本月记录");
  assert.ok(/\d{4}/.test(calendar), "calendar should show a month title with a year");
  await shot("11-record-calendar");

  // --- 关键词搜索 dialog (image 11) ---
  await tapExact("✕", "close the calendar");
  await tapExact("关键词搜索", "open the keyword dialog");
  const dialog = await text();
  assert.ok(dialog.includes("关键词搜索"), "keyword dialog missing its title");
  assert.ok(
    (await placeholders()).includes("输入关键词"),
    `keyword dialog missing its 输入关键词 field. Saw: ${JSON.stringify(await placeholders())}`
  );
  await shot("12-keyword-dialog");

  // --- 新建生活集 (image 12) ---
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(500);
  await tapExact("‹", "back to the feed");
  await tapExact("☰", "hamburger");
  await tapExact("+", "new collection");
  const collection = await text();
  for (const needle of ["取消", "新建生活集", "确定"]) {
    assert.ok(collection.includes(needle), `新建生活集 missing ${needle}`);
  }
  assert.ok((await placeholders()).includes("生活集名称"), "新建生活集 missing its 生活集名称 field");
  await shot("13-new-collection");

  console.log("web smoke ok — screenshots in", SHOTS);
}

try {
  await main();
} finally {
  try {
    ws?.close();
  } catch {
    // ignore
  }
  chrome.kill("SIGKILL");
}
