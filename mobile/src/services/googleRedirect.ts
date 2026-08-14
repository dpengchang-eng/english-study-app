/**
 * Expo Go cannot claim `didao://`, and a phone cannot open the computer's localhost.
 * Let expo-auth-session use the current experience URL (`exp://host/--/oauthredirect`).
 */
export function googleRedirectUriOptions(): { path: "oauthredirect" } {
  return { path: "oauthredirect" };
}
