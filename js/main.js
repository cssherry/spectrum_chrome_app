$(document).ready(function () {
  var publications = getLocalStorage('publications');
  var mediaBias = getLocalStorage('mediaBias');
  var publicationUrl = 'http://spectrum-backend.herokuapp.com/feeds/publications';

  // Store publications in hash with base_url
  // TODO: Consider if we should be only taking last 2 fields of base_url
  //      (ie ap.org instead of hosted.ap.org)
  function processPublicationUrls(pubs) {
    var result = {};
    pubs.forEach(function (p) {
      if (!p.fields.skip_scaping) {
        result[p.fields.base_url] = p;
      }
    });
    return result;
  }

  // Main function ---------------------------------------------------------------------
  // Only get publications/media bias if not in local storage and less than 7-days old
  function getAssociations() {
    var currentLocation = window.location;
    spectrum.init(currentLocation);
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
