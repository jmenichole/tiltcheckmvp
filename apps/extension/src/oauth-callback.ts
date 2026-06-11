/** Runs at document_start on API OAuth callback — before inline postMessage. */
import { isDiscordAuthPayload, saveDiscordAuth } from './extension-auth.js';

function onAuthPayload(data: unknown): void {
  if (!isDiscordAuthPayload(data)) return;
  void saveDiscordAuth(data.token, data.username ?? 'discord');
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  onAuthPayload(event.data);
});
