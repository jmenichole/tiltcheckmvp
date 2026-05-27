import { TiltDetector } from './tilt-detector.js';
import { loadSidebarState, renderSidebar } from './sidebar.js';

const hostname = window.location.hostname.toLowerCase();
const excluded =
  hostname.includes('discord.com') ||
  (hostname === 'localhost' && ['3000', '3001'].includes(window.location.port));

if (!excluded) {
  const detector = new TiltDetector();
  const host = document.createElement('div');
  host.id = 'tiltcheck-sidebar-host';
  document.documentElement.appendChild(host);

  loadSidebarState().then((state) => renderSidebar(host, state));

  document.addEventListener(
    'click',
    () => {
      detector.recordClick();
      const indicators = detector.analyze();
      if (indicators.some((i) => i.severity === 'high' || i.severity === 'critical')) {
        console.warn('[TiltCheck] Tilt signal:', indicators);
      }
    },
    true,
  );

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'discord-auth-success') {
      chrome.storage.local.set({ tc_username: 'discord', tc_demo: false });
      loadSidebarState().then((state) => renderSidebar(host, state));
    }
  });
}
