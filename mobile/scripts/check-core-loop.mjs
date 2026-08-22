/**
 * Compiles the pure logic modules (no React Native imports) and asserts the
 * Android 1.0.8 practice rules: 填 grading, 选 needing two distinct blanks,
 * the option pair, and the feed / detail timestamp formats.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const out = mkdtempSync(path.join(tmpdir(), "didao-check-"));

try {
  execFileSync(
    "npx",
    [
      "tsc",
      "src/types.ts",
      "src/services/cloze.ts",
      "src/services/dates.ts",
      "src/services/mockRewrite.ts",
      "src/data/seed.ts",
      "--outDir",
      out,
      "--module",
      "commonjs",
      "--target",
      "es2022",
      "--skipLibCheck",
      "--ignoreConfig"
    ],
    { stdio: "inherit" }
  );

  const load = (rel) => require(path.join(out, rel));
  const cloze = load("services/cloze.js");
  const dates = load("services/dates.js");
  const rewrite = load("services/mockRewrite.js");

  const sentence = { id: "s2", text: "Oh, it's awesome." };
  const apple = { id: "s5", text: "Give me this apple and I'll sell it every day." };

  // 挖空 builds a blank from the tapped word span.
  let blanks = cloze.addBlank([], sentence, 9, 16);
  assert.equal(blanks.length, 1);
  assert.equal(blanks[0].answer, "awesome");

  // One blank: 选 is not allowed, so the toolbar falls back to 填.
  assert.equal(cloze.canUseSelect(blanks), false);
  assert.equal(cloze.optionPair(blanks), null);

  // Two distinct blanks: 选 is allowed and the chips are the answers, in order.
  blanks = cloze.addBlank(blanks, apple, 13, 18);
  assert.equal(cloze.canUseSelect(blanks), true);
  assert.deepEqual(cloze.optionPair(blanks), ["awesome", "apple"]);

  // Duplicate and overlapping 挖空 are ignored.
  assert.equal(cloze.addBlank(blanks, sentence, 9, 16).length, 2);
  assert.equal(cloze.addBlank(blanks, sentence, 10, 14).length, 2);

  // 删除填空 drops just that blank.
  assert.equal(cloze.removeBlank(blanks, blanks[0].id).length, 1);

  // 填 grading: case-insensitive match, wrong input stays wrong (pink).
  assert.equal(cloze.gradeFill("Awesome", "awesome"), true);
  assert.equal(cloze.gradeFill(" awesome ", "awesome"), true);
  assert.equal(cloze.gradeFill("a", "awesome"), false);
  assert.equal(cloze.gradeFill("", "awesome"), false);

  // Feed and detail stamps match the device strings.
  assert.equal(dates.formatFeedStamp(Date.UTC(2026, 7, 20, 22, 55)), "Aug 20 · 10:55 PM");
  assert.equal(dates.formatFeedStamp(Date.UTC(2026, 7, 17, 16, 15)), "Aug 17 · 4:15 PM");
  assert.equal(dates.formatDetailStamp(Date.UTC(2026, 7, 20, 22, 55)), "August 20, 2026 · 10:55 PM");
  assert.equal(dates.formatMonthTitle(2026, 7), "August 2026");

  // The month grid pads to whole Sunday-first weeks.
  const cells = dates.monthCells(2026, 7);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0].day, null, "Aug 1 2026 is a Saturday, so the row starts padded");
  assert.equal(cells[6].day, 1);

  // The mock rewrite always yields practiceable sentences, with no network.
  const result = rewrite.mockRewrite("今天事情好多。");
  assert.ok(result.rewrite.length > 0);
  assert.ok(result.sentences.length > 0);
  assert.equal(rewrite.mockRewrite("你好 今天去哪里？").rewrite, "Hey, where are you going today?");
  assert.equal(rewrite.mockRewrite("大家好，我今天真的非常高兴！").rewrite, "Hey everyone, I'm really so happy today!");
  assert.ok(!/[\u4e00-\u9fff]/.test(rewrite.mockRewrite("你好 今天去哪里？").rewrite));
  assert.ok(!rewrite.mockRewrite("今天事情好多。").rewrite.includes("Just noting"));
  assert.equal(rewrite.applyRadio("今天事情好多。", 0).rewrite, "", "radio 0 keeps the original only");
  assert.equal(rewrite.applyRadio("今天事情好多。", 1).reply, "", "radio 1 rewrites without a reply");
  assert.ok(rewrite.applyRadio("今天事情好多。", 2).reply.length > 0, "radio 2 adds a reply");

  // Seed cards bucket into the day cells the 记录日历 and 回忆 tiles read.
  const seed = load("data/seed.js");
  const keys = seed.SEED_CARDS.map((entry) => dates.dateKey(entry.createdAt));
  assert.equal(keys.filter((key) => key === "2026-08-20").length, 1);
  assert.equal(keys.filter((key) => key === "2026-08-17").length, 3);
  const busyDay = seed.SEED_CARDS.find((entry) => entry.id === "c-busy-day");
  assert.equal(dates.formatFeedStamp(busyDay.createdAt), "Aug 20 · 10:55 PM");

  // The two seeded blanks are the ones 选 offers, and each really is that word.
  assert.equal(cloze.canUseSelect(busyDay.blanks), true);
  assert.deepEqual(cloze.optionPair(busyDay.blanks), ["awesome", "apple"]);
  for (const blank of busyDay.blanks) {
    const line = busyDay.sentences.find((item) => item.id === blank.sentenceId);
    assert.equal(line.text.slice(blank.start, blank.end), blank.answer);
  }

  // Copy that must match the device exactly.
  const source = (rel) => readFileSync(path.join("src", rel), "utf8");
  const expected = [
    ["hooks/usePractice.ts", "至少需要两个不同的填空，已切换到键盘填空"],
    ["screens/RecordCalendarScreen.tsx", "本月记录"],
    ["screens/RecordCalendarScreen.tsx", "记录日历"],
    ["screens/MemoriesScreen.tsx", "没有 Card"],
    ["screens/MemoriesScreen.tsx", "继续上次"],
    ["screens/MemoriesScreen.tsx", "输入关键词"],
    ["screens/NewCollectionScreen.tsx", "新建生活集"],
    ["screens/NewCollectionScreen.tsx", "生活集名称"],
    ["screens/SearchScreen.tsx", "搜索原文、AI 改写和学过的表达"],
    ["screens/CreateCardScreen.tsx", "记录此刻想说的事……"],
    ["screens/CreateCardScreen.tsx", "原文"],
    ["screens/CreateCardScreen.tsx", "保留原文"],
    ["screens/CreateCardScreen.tsx", "目标语言"],
    ["screens/CreateCardScreen.tsx", "改写+回复"],
    ["components/LanguageSettingsModal.tsx", "初级"],
    ["components/LanguageSettingsModal.tsx", "中级"],
    ["components/LanguageSettingsModal.tsx", "进阶"],
    ["screens/CardDetailScreen.tsx", "目标语言改写"],
    ["screens/AiAssistantScreen.tsx", "直接说或输入，默认帮你自然改写"],
    ["components/WordMenu.tsx", "查词"],
    ["components/WordMenu.tsx", "挖空"],
    ["components/WordMenu.tsx", "删除填空"],
    ["components/AppDrawer.tsx", "记录天数"]
  ];
  for (const [file, text] of expected) {
    assert.ok(source(file).includes(text), `${file} must contain ${text}`);
  }

  // Wording the Android build does not use.
  for (const [file] of expected) {
    const body = source(file);
    for (const wrong of ["生活圈", "瞬间", "查询", "累计记录"]) {
      assert.ok(!body.includes(wrong), `${file} must not contain ${wrong}`);
    }
  }

  console.log("core loop checks ok");
} finally {
  rmSync(out, { recursive: true, force: true });
}
