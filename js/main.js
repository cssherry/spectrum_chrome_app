$(document).ready(function () {
  var publications = getLocalStorage('publications', 'March 25, 2017');
  var mediaBias = getLocalStorage('mediaBias');
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
    var spectrumInstance = spectrum.init(currentLocation);

    chrome.runtime.onMessage.addListener(function (request){
      if (request.action === 'hideSpectrumPanel') {
        setLocalStorage(request.showType, request.typeButton);
        if (request.showType === 'hidden') {
          spectrumInstance._hideContainer(request.typeButton);
        } else {
          spectrumInstance._hideIcon();
        }
      }
    });

    chrome.runtime.onMessage.addListener(function (request) {
      if (request.action === 'showSpectrumPanel') {
        setLocalStorage(request.showType, null);
        if (request.showType === 'hidden') {
          spectrumInstance._showContainer();
          spectrumInstance.getAssociations(2);
        } else {
          spectrumInstance._showIcon();
        }
      }
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.action === 'getLocalStorage') {
        var results = {};
        request.localValues.forEach(function (lv) {
          results[lv] = getLocalStorage(lv);
        });
        results.currentPublication = spectrumInstance.currentPublication;
        sendResponse(results);
      }
    });
  }

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
      setLocalStorage('publications', publications);
      setLocalStorage('mediaBias', mediaBias);
      getAssociations();
    });
  }
});
