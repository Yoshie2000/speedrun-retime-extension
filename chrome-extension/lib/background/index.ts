import 'webextension-polyfill';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
      chrome.tabs.sendMessage(tabId, {
          message: "urlChanged"
      })
  }
})