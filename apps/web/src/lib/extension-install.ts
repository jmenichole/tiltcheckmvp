export const EXTENSION_SETUP_PATH = '/extension';
export const DEFAULT_CHROME_WEB_STORE_URL = ''; // empty until published

export function chromeWebStoreUrl(): string {
  return process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL?.trim() || '';
}

export function extensionInstallHref(): string {
  const cws = chromeWebStoreUrl();
  return cws || EXTENSION_SETUP_PATH;
}

export function isChromeWebStoreLive(): boolean {
  return Boolean(chromeWebStoreUrl());
}
