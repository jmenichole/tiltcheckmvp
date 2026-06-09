const DISMISS_KEY = 'tc_onboarding_wizard_dismissed';

export function isOnboardingWizardDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissOnboardingWizard(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

export function notifyExtensionLogout(): void {
  if (typeof window === 'undefined') return;
  window.postMessage({ type: 'tc-web-logout' }, window.location.origin);
}
