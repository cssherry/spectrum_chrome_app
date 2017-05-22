chrome.runtime.onMessage.addListener(function (request, sender) {
  console.log('visited!!');
  if (request.action === 'setIcon') {
    var url = chrome.extension.getURL(request.url);
    chrome.browserAction.setIcon({ path: url });
  }
});
