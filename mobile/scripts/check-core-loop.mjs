import assert from "node:assert/strict";

function distinctBlankAnswers(blanks) {
  const seen = new Set();
  const out = [];
  for (const blank of blanks) {
    const key = blank.answer.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(blank.answer);
  }
  return out;
}

function canUseSelect(blanks) {
  return distinctBlankAnswers(blanks).length >= 2;
}

function optionPair(blanks) {
  const answers = distinctBlankAnswers(blanks);
  if (answers.length < 2) return null;
  return [answers[0], answers[1]];
}

function gradeFill(input, answer) {
  const a = input.trim().toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");
  const b = answer.trim().toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, "");
  return a.length > 0 && a === b;
}

const one = [{ id: "a", answer: "awesome" }];
const two = [
  { id: "a", answer: "awesome" },
  { id: "b", answer: "apple" }
];

assert.equal(canUseSelect(one), false);
assert.equal(canUseSelect(two), true);
assert.deepEqual(optionPair(two), ["awesome", "apple"]);
assert.equal(optionPair(one), null);
assert.equal(gradeFill("Awesome", "awesome"), true);
assert.equal(gradeFill("apple", "awesome"), false);

const SELECT_TOAST = "至少需要两个不同的填空，已切换到键盘填空";
assert.equal(canUseSelect(one) ? "select" : "fill", "fill");
assert.match(SELECT_TOAST, /至少需要两个不同的填空/);
console.log("core loop checks ok");
