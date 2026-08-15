import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveErrorCode } from "../services/convertError";
import { conversionEnglish, HOME_COPY_ACTION, HOME_LISTEN_ACTION } from "../services/homeChat";
import type { Conversion } from "../types";
import { ERROR_COPY } from "../types";
import { colors } from "../theme";

export function ChatTurn({
  item,
  listening,
  copied,
  isAnonymous,
  onOpenResult,
  onCopy,
  onListen,
  onRetry
}: {
  item: Conversion;
  listening: boolean;
  copied: boolean;
  isAnonymous: boolean;
  onOpenResult: () => void;
  onCopy: () => void;
  onListen: () => void;
  onRetry: () => void;
}) {
  const english = conversionEnglish(item);
  const errorText = item.status === "failed" ? ERROR_COPY[resolveErrorCode(item.errorCode)] : null;

  return (
    <View style={styles.turn}>
      <View style={styles.userWrap}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.sourceText}</Text>
        </View>
      </View>
      {item.status === "loading" ? (
        <View style={styles.appWrap}>
          <View style={styles.appBubble}>
            <Text style={styles.loading}>转换中…</Text>
          </View>
        </View>
      ) : null}
      {item.status === "failed" ? (
        <View style={styles.appWrap}>
          <View style={styles.appBubble}>
            <Text style={styles.error}>{errorText}</Text>
            {item.errorCode === "quota_exceeded" && isAnonymous ? (
              <Text style={styles.hint}>绑定后每天 80 次</Text>
            ) : null}
            <Pressable onPress={onRetry} hitSlop={8}>
              <Text style={styles.retry}>再试一次</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {item.status === "ready" ? (
        <View style={styles.appWrap}>
          <Pressable style={styles.appBubble} onPress={onOpenResult}>
            <Text style={styles.english}>{english || "—"}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  onCopy();
                }}
                hitSlop={8}
              >
                <Text style={styles.action}>{copied ? "已复制" : HOME_COPY_ACTION}</Text>
              </Pressable>
              <Text style={styles.pipe}>|</Text>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  onListen();
                }}
                hitSlop={8}
              >
                <Text style={listening ? styles.actionOn : styles.action}>
                  {listening ? "停止" : HOME_LISTEN_ACTION}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  turn: { gap: 8 },
  userWrap: { alignItems: "flex-end" },
  userBubble: {
    maxWidth: "82%",
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    borderBottomRightRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  userText: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  appWrap: { alignItems: "flex-start" },
  appBubble: {
    maxWidth: "88%",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  loading: { color: colors.muted, fontSize: 15 },
  error: { color: colors.warn, fontSize: 15, lineHeight: 22 },
  hint: { color: colors.ink, fontSize: 14 },
  retry: { color: colors.accent, fontWeight: "700", fontSize: 15 },
  english: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  action: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  actionOn: { color: colors.accent, fontWeight: "700", fontSize: 15 },
  pipe: { color: colors.muted, fontSize: 15 }
});
