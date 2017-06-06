var publications;
var mediaBias;
var publicationUrl = 'https://spectrum-backend.herokuapp.com/feeds/publications';

// Store publications in hash with base_url
// TODO: Consider if we should be only taking last 2 fields of base_url
//      (ie ap.org instead of hosted.ap.org)
function processPublicationUrls(pubs) {
  var result = {};
  pubs.forEach(function (p) {
    if (!p.fields.skip_scraping) {
      result[cleanUrl(p.fields.base_url)] = p;
    }
  });
  return result;
}

// Main function ---------------------------------------------------------------------
// Only get publications/media bias if not in local storage and less than 7-days old
function getAssociations() {
  var currentLocation = window.location;
  var spectrumInstance = spectrum.init(currentLocation, publications, mediaBias);

  // Add most message listeners
  // hideSpectrumPanel and showSpectrumPanel hide/show spectrum from popover
  // getLocalStorage returns data from local storage
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var changeParam = {};
    if (request.action === 'hideSpectrumPanel') {
      changeParam[request.showType] = request.typeButton;
      chrome.runtime.sendMessage({
        action: 'setLocalStorage',
        localValues: changeParam,
      });
      if (request.showType === 'hidden') {
        spectrumInstance._hideContainer(request.typeButton);
      } else {
        spectrumInstance._hideIcon();
      }
      return true;
    } else if (request.action === 'showSpectrumPanel') {
      changeParam[request.showType] = null;
      chrome.runtime.sendMessage({
        action: 'setLocalStorage',
        localValues: changeParam,
      });
      if (request.showType === 'hidden') {
        spectrumInstance._showContainer();
        spectrumInstance.getAssociations();
      } else {
        spectrumInstance._showIcon();
      }
      return true;
    } else if (request.action === 'hasCurrentArticle') {
      sendResponse && sendResponse(!!spectrumInstance.currentArticle);
    }
  });
}


chrome.runtime.sendMessage({
  action: 'processValue',
  keyData: JSON.parse(localStorage.getItem('publications')),
}, function (processedValue) {
  publications = processedValue;

  // save publications list on localstorage because otherwise, exceeds QUOTA_BYTES_PER_ITEM
  chrome.runtime.sendMessage({
    action: 'getLocalStorage',
    localValues: ['mediaBias'],
  }, function (items) {
    mediaBias = items.mediaBias;
    if (publications && mediaBias) {
      getAssociations();
    } else {
      $.ajax({
        url: publicationUrl,
        type: 'GET',
      })
      .fail(function (req, textstatus, errorthrown) {
        logError('Failed to get publications and media biases', req, textstatus, errorthrown);
      })
      .done(function (resp) {
        publications = processPublicationUrls(resp.publications);
        mediaBias = resp.media_bias;
        localStorage.setItem('publications', JSON.stringify({
          dateSaved: new Date().toString(),
          data: publications,
        }));
        chrome.runtime.sendMessage({
          action: 'setLocalStorage',
          checkDate: true,
          localValues: {
            mediaBias: mediaBias,
          },
        });
      });
    }
  });
  return true;
});
