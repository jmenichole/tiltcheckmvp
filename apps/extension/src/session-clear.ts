/** Clear extension auth + synced account config (logout / disconnect). */

const SESSION_KEYS = [
  'tc_session_token',
  'tc_username',
  'tc_vault_rules',
  'tc_game_exclusions',
  'tc_risk_profile',
  'tc_notifications_enabled',
] as const;

export async function clearExtensionSession(): Promise<void> {
  await chrome.storage.local.remove([...SESSION_KEYS]);
  await chrome.storage.local.set({ tc_demo: true });
}
