import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Conversion } from "../types";
import { ERROR_COPY } from "../types";
import {
  conversationOrder,
  conversionEnglish,
  conversionSpeakable,
  failedTurnShowsQuotaHint,
  failedTurnShowsRetry,
  homeListenShouldStop,
  threadTime,
  HOME_COPY_ACTION,
  HOME_COPY_TOAST,
  HOME_EMPTY_HINT,
  HOME_INPUT_PLACEHOLDER,
  HOME_LISTEN_ACTION,
  HOME_LOADING_TEXT,
  HOME_OFFLINE_BANNER,
  HOME_QUOTA_BIND_HINT,
  HOME_RETRY_ACTION,
  HOME_SEND_ACTION,
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

  it("keeps a retried turn in its first place when createdAt is refreshed", () => {
    const retried = row({ id: "a", status: "loading", createdAt: 99, threadAt: 10 });
    const later = row({ id: "b", status: "ready", createdAt: 20, threadAt: 20 });
    assert.equal(threadTime(retried), 10);
    assert.deepEqual(
      conversationOrder([later, retried]).map((item) => item.id),
      ["a", "b"]
    );
  });
});

describe("homeListenShouldStop", () => {
  it("stops the same bubble, including a pending start, and starts a different one", () => {
    assert.equal(homeListenShouldStop("a", "a"), true);
    assert.equal(homeListenShouldStop(null, "a"), false);
    assert.equal(homeListenShouldStop("a", "b"), false);
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
      conversionSpeakable(item).map((line) => line.id),
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
    assert.equal(HOME_SEND_ACTION, "发送");
    assert.equal(HOME_RETRY_ACTION, "重试");
    assert.equal(HOME_COPY_TOAST, "已复制");
  });

  it("keeps existing error copy and only retries when it is not quota", () => {
    assert.equal(ERROR_COPY.quota_exceeded, "今天的转换次数用完了");
    assert.equal(HOME_QUOTA_BIND_HINT, "绑定后每天 80 次");
    assert.equal(failedTurnShowsRetry("gemini_timeout"), true);
    assert.equal(failedTurnShowsRetry("parse_error"), true);
    assert.equal(failedTurnShowsRetry("quota_exceeded"), false);
    assert.equal(failedTurnShowsQuotaHint("quota_exceeded", true), true);
    assert.equal(failedTurnShowsQuotaHint("quota_exceeded", false), false);
    assert.equal(failedTurnShowsQuotaHint("parse_error", true), false);
  });
});

describe("Home conversation window", () => {
  it("no longer auto-navigates on convert and keeps locked chat copy", () => {
    const home = readFileSync(new URL("../screens/HomeScreen.tsx", import.meta.url), "utf8");
    const turn = readFileSync(new URL("../components/ChatTurn.tsx", import.meta.url), "utf8");
    const composer = readFileSync(new URL("../components/ChatComposer.tsx", import.meta.url), "utf8");
    const helpers = readFileSync(new URL("./homeChat.ts", import.meta.url), "utf8");
    const appState = readFileSync(new URL("../context/AppState.tsx", import.meta.url), "utf8");
    const sendFn = home.match(/const send = \(\): void => \{[\s\S]*?\n  \};/)?.[0] ?? "";
    assert.match(home, /sendFromComposer/);
    assert.match(home, /startConversion/);
    assert.match(sendFn, /sendFromComposer/);
    assert.doesNotMatch(sendFn, /navigate/);
    assert.match(home, /openResult/);
    assert.match(home, /onOpenResult=\{\(\) => openResult/);
    assert.match(home, /extraData=\{listenId\}/);
    assert.match(home, /HOME_COPY_TOAST/);
    assert.match(home, /useFocusEffect/);
    assert.match(home, /scrollToEnd/);
    assert.match(helpers, /先说一句你想怎么讲，比如“这个周末有空吗”/);
    assert.match(helpers, /说中文或英文，转成地道的美式说法/);
    assert.match(helpers, /没有网，没法转换/);
    assert.match(helpers, /正在改成更地道的说法…/);
    assert.match(composer, /HOME_INPUT_PLACEHOLDER/);
    assert.match(composer, /HOME_SEND_ACTION/);
    assert.match(composer, /multiline/);
    assert.doesNotMatch(composer, /showMic|MicButton|startListening/);
    assert.match(turn, /HOME_COPY_ACTION/);
    assert.match(turn, /HOME_LISTEN_ACTION/);
    assert.match(turn, /HOME_LOADING_TEXT/);
    assert.match(turn, /HOME_RETRY_ACTION/);
    assert.match(turn, /onFocusInput/);
    const resultPressable = turn.match(/<Pressable[^>]*onPress=\{onOpenResult\}[^>]*>[\s\S]*?<\/Pressable>/)?.[0] ?? "";
    assert.match(resultPressable, /onPress=\{onOpenResult\}/);
    assert.doesNotMatch(resultPressable, /onCopy|HOME_COPY_ACTION|onListen|HOME_LISTEN_ACTION/);
    assert.doesNotMatch(turn, /stopPropagation/);
    const listenHook = readFileSync(new URL("../hooks/useHomeArticleListen.ts", import.meta.url), "utf8");
    assert.match(listenHook, /homeListenShouldStop/);
    assert.match(listenHook, /mode !== "idle"/);
    assert.doesNotMatch(turn, /已复制/);
    assert.doesNotMatch(turn, /再试一次/);
    assert.doesNotMatch(turn, /转换中/);
    assert.doesNotMatch(turn, /复读|单听|点词/);
    assert.doesNotMatch(home, /最近/);
    assert.doesNotMatch(home, /ComposeCard/);
    assert.doesNotMatch(home, /showMic/);
    assert.doesNotMatch(home, /loadSample/);
    assert.doesNotMatch(home, /startListening/);
    assert.match(appState, /threadAt: createdAt/);
    assert.match(appState, /threadAt: current.threadAt \?\? current.createdAt/);
    assert.equal(HOME_EMPTY_HINT, "先说一句你想怎么讲，比如“这个周末有空吗”");
    assert.equal(HOME_INPUT_PLACEHOLDER, "说中文或英文，转成地道的美式说法");
    assert.equal(HOME_OFFLINE_BANNER, "没有网，没法转换");
    assert.equal(HOME_LOADING_TEXT, "正在改成更地道的说法…");
  });
});
