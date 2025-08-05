// Sets default configuration when the extension is first installed.
// Enables FauxPost by default using chrome.storage.local.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ fauxPostEnabled: true });
});