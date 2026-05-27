chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ tc_demo: true });
});
