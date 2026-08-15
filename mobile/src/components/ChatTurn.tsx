import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveErrorCode } from "../services/convertError";
import {
  conversionEnglish,
  failedTurnShowsQuotaHint,
  failedTurnShowsRetry,
  HOME_COPY_ACTION,
  HOME_LISTEN_ACTION,
  HOME_LOADING_TEXT,
  HOME_QUOTA_BIND_HINT,
  HOME_RETRY_ACTION
} from "../services/homeChat";
import type { Conversion } from "../types";
import { ERROR_COPY } from "../types";
import { colors } from "../theme";

export function ChatTurn({
  item,
  listening,
  isAnonymous,
  onOpenResult,
  onCopy,
  onListen,
  onRetry,
  onFocusInput
}: {
  item: Conversion;
  listening: boolean;
  isAnonymous: boolean;
  onOpenResult: () => void;
  onCopy: () => void;
  onListen: () => void;
  onRetry: () => void;
  onFocusInput: () => void;
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
            <Text style={styles.loading}>{HOME_LOADING_TEXT}</Text>
          </View>
        </View>
      ) : null}
      {item.status === "failed" ? (
        <View style={styles.appWrap}>
          <View style={styles.appBubble}>
            <Text style={styles.error}>{errorText}</Text>
            {failedTurnShowsQuotaHint(item.errorCode, isAnonymous) ? (
              <Pressable onPress={onFocusInput} hitSlop={8}>
                <Text style={styles.retry}>{HOME_QUOTA_BIND_HINT}</Text>
              </Pressable>
            ) : null}
            {failedTurnShowsRetry(item.errorCode) ? (
              <Pressable onPress={onRetry} hitSlop={8}>
                <Text style={styles.retry}>{HOME_RETRY_ACTION}</Text>
              </Pressable>
            ) : null}
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
                <Text style={styles.action}>{HOME_COPY_ACTION}</Text>
              </Pressable>
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
  retry: { color: colors.accent, fontWeight: "700", fontSize: 15 },
  english: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  action: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  actionOn: { color: colors.accent, fontWeight: "700", fontSize: 15 }
});
