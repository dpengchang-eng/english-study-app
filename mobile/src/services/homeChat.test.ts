import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Conversion } from "../types";
import {
  conversationOrder,
  conversionEnglish,
  conversionSpeakable,
  HOME_COPY_ACTION,
  HOME_LISTEN_ACTION,
  sendFromComposer,
  shouldOpenResultOnPress
} from "./homeChat";

function row(partial: Partial<Conversion> & Pick<Conversion, "id" | "status" | "createdAt">): Conversion {
  return {
    sourceText: "我想喝咖啡",
    sourceType: "text",
    sentences: [],
    clientRequestId: partial.id,
    ...partial
  };
}

describe("conversationOrder", () => {
  it("puts oldest turns at the top and newest at the bottom", () => {
    const newest = row({ id: "c", status: "ready", createdAt: 30 });
    const oldest = row({ id: "a", status: "ready", createdAt: 10 });
    const mid = row({ id: "b", status: "ready", createdAt: 20 });
    assert.deepEqual(
      conversationOrder([newest, oldest, mid]).map((item) => item.id),
      ["a", "b", "c"]
    );
  });
});

describe("conversionEnglish", () => {
  it("joins sentences and falls back to outputText", () => {
    const withSentences = row({
      id: "a",
      status: "ready",
      createdAt: 1,
      sentences: [
        { id: "s0", text: "I'd like coffee." },
        { id: "s1", text: "Does that work?" }
      ],
      outputText: "ignored"
    });
    assert.equal(conversionEnglish(withSentences), "I'd like coffee. Does that work?");
    const outputOnly = row({
      id: "b",
      status: "ready",
      createdAt: 2,
      outputText: "Let's grab coffee."
    });
    assert.equal(conversionEnglish(outputOnly), "Let's grab coffee.");
  });
});

describe("conversionSpeakable", () => {
  it("uses sentences, or outputText as one article line", () => {
    const item = row({
      id: "a",
      status: "ready",
      createdAt: 1,
      sentences: [
        { id: "s0", text: "First." },
        { id: "s1", text: "  " },
        { id: "s2", text: "Third." }
      ]
    });
    assert.deepEqual(
      conversionSpeakable(item).map((row) => row.id),
      ["s0", "s2"]
    );
    const fallback = row({ id: "b", status: "ready", createdAt: 2, outputText: "Hello." });
    assert.deepEqual(conversionSpeakable(fallback), [{ id: "b-all", text: "Hello." }]);
  });
});

describe("sendFromComposer", () => {
  it("starts convert and does not open Result", () => {
    const started: string[] = [];
    const result = sendFromComposer("  你好  ", true, (text) => {
      started.push(text);
      return "conv-1";
    });
    assert.deepEqual(started, ["你好"]);
    assert.equal(result.conversionId, "conv-1");
    assert.equal(result.openResult, false);
  });

  it("does not convert when empty or offline", () => {
    let called = 0;
    const start = (): string => {
      called += 1;
      return "x";
    };
    assert.equal(sendFromComposer("   ", true, start).conversionId, null);
    assert.equal(sendFromComposer("hi", false, start).conversionId, null);
    assert.equal(called, 0);
  });
});

describe("home bubble actions", () => {
  it("opens Result only from the English bubble, not send/copy/listen", () => {
    assert.equal(shouldOpenResultOnPress("english"), true);
    assert.equal(shouldOpenResultOnPress("copy"), false);
    assert.equal(shouldOpenResultOnPress("listen"), false);
    assert.equal(shouldOpenResultOnPress("send"), false);
    assert.equal(HOME_COPY_ACTION, "复制全文");
    assert.equal(HOME_LISTEN_ACTION, "听");
  });
});

describe("Home conversation window", () => {
  it("no longer auto-navigates on convert and keeps copy/listen on the reply", () => {
    const home = readFileSync(new URL("../screens/HomeScreen.tsx", import.meta.url), "utf8");
    const turn = readFileSync(new URL("../components/ChatTurn.tsx", import.meta.url), "utf8");
    const helpers = readFileSync(new URL("./homeChat.ts", import.meta.url), "utf8");
    const sendFn = home.match(/const send = \(\): void => \{[\s\S]*?\n  \};/)?.[0] ?? "";
    assert.match(home, /sendFromComposer/);
    assert.match(home, /startConversion/);
    assert.match(sendFn, /sendFromComposer/);
    assert.doesNotMatch(sendFn, /navigate/);
    assert.match(home, /openResult/);
    assert.match(home, /onOpenResult=\{\(\) => openResult/);
    assert.match(helpers, /复制全文/);
    assert.match(helpers, /"听"/);
    assert.match(turn, /HOME_COPY_ACTION/);
    assert.match(turn, /HOME_LISTEN_ACTION/);
    assert.doesNotMatch(home, /最近/);
    assert.doesNotMatch(home, /ComposeCard/);
    assert.doesNotMatch(home, /showMic/);
    assert.doesNotMatch(home, /loadSample/);
    assert.doesNotMatch(home, /startListening/);
  });
});
