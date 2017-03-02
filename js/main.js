$(document).ready(function () {
  var publications = getLocalStorage('publications');
  var mediaBias = getLocalStorage('mediaBias');
  var publicationUrl = 'http://spectrum-backend.herokuapp.com/feeds/publications';
  var associationApiUrl = 'http://spectrum-backend.herokuapp.com/feeds/test_api';
  var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June',
                    'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  // Helper Functions ---------------------------------------------------------------------

  // Get local storage info
  function getLocalStorage(name) {
    var localData = localStorage.getItem('spectrum-' + name);
    if (!localData) {
      return undefined;
    }

    localData = JSON.parse(localData);

    // if older than 7 days, disregard
    var sevenDays = 1000 * 60 * 24 * 7;
    if (new Date() - new Date(localData.dateSaved) < sevenDays) {
      return localData.data;
    }

    return null;
  }

  // Set local storage info
  function setLocalStorage(name, data) {
    var result = {
      dateSaved: new Date().toString(),
      data: data,
    };

    localStorage.setItem('spectrum-' + name, JSON.stringify(result));
  }

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

  // logs errors
  function logError(message, req, textstatus, errorthrown) {
    console.log(message);
    console.log('req', req);
    console.log('textstatus', textstatus);
    console.log('errorthrown', errorthrown);
  }

  // Render bar
  function render(url, context, callback, isMultiple) {
    url = chrome.extension.getURL(url);
    context = context || {};

    var html;
    $.ajax({
      url: url,
      type: 'GET',
    })
    .fail(function (req, textstatus, errorthrown) {
      logError('Failed to get template: ' + url, req, textstatus, errorthrown);
    })
    .done(function (data) {
      var template = Handlebars.compile(data);
      if (isMultiple) {
        context.forEach(function (ctx, i) {
          html = template(ctx);
          callback[i]($(html));
        });
      } else {
        html = template(context);
        callback($(html));
      }
    });
  }

  // Spectrum ---------------------------------------------------------------------

  var spectrum = {
    init: function (location) {
      if (publications[location.host]) {
        this.getAssociations(2);
      }
    },

    getAssociations: function (numberArticles) {
      // TODO: Use numberArticles to return back specific number of articles
      var _this = this;
      $.ajax({
        url: associationApiUrl,
        type: 'GET',
      })
      .fail(function (req, textstatus, errorthrown) {
        logError('Failed to get associations', req, textstatus, errorthrown);
      })
      .done(function (resp) {
        _this.showArticles(resp, publications[location.host], numberArticles);
      });
    },

    hideContainer: function (animate) {
      if (animate) {
        this._$container.velocity('transition.slideDownOut', {
          duration: 300,
        });
      } else {
        this._$container.hide();
      }
    },

    showArticles: function (articleData, currentPublication, numberArticles, animate) {
      render('../html/main.html', undefined, function ($el) {
        this._addContainerCb($el, articleData, currentPublication, numberArticles, animate);
      }.bind(this));
    },

    _addContainerCb: function ($html, articleData, currentPublication, numberArticles, animate) {      var currPubData = currentPublication.fields;
      var currPubData = currentPublication.fields;

      this._$container = $html;
      this._$articlesContainer = $html.find('#spectrum-articles-container');
      $('body').append($html);

      render('../html/publication_detail.html', {
        imageUrl: chrome.extension.getURL('../images/dial-' + currPubData.bias + '.png'),
        bias: mediaBias[currPubData.bias],
        target_url: currPubData.base_url,
        publication: currPubData.name,
      }, function ($el) {
        this._addCurrArticleCB($el, articleData, numberArticles, animate);
      }.bind(this))
    },

    _addCurrArticleCB: function ($html, articleData, numberArticles, animate) {
      var renderUrl, renderConfig, isMultiple;
      var renderCB = function ($el) {
        this._$articlesContainer.append($el);
      }.bind(this);

      if (numberArticles <= 2 || !articleData.length) {
        this._$articlesContainer.append($html);
      }

      if (articleData.length) {
        var singleArticleCB = function ($html) {
          this._$articlesContainer.append($html);
        }.bind(this);
        isMultiple = true;
        renderConfig= [];
        renderCB = [];
        renderUrl = '../html/article.html';

        articleData.forEach(function (article) {
          // TODO: change number of articles depending on screen size
          if (renderConfig.length >= numberArticles) {
            return;
          }

          var more_text = 'More From the ' + mediaBias[article.publication_bias] + ' »';
          var publication_date = new Date(article.publication_date);

          renderConfig.push({
            imageUrl: article.image_url,
            source: article.publication_name,
            headLine: article.title,
            target_url: article.url,
            more_text: more_text,
            bias: article.publication_bias,
            publication_date: monthNames[publication_date.getMonth()] + ' ' + publication_date.getDate(),
          });

          renderCB.push(singleArticleCB);
        });
      } else {
        renderUrl = '../html/publication_detail.html';
        renderConfig = {
          imageUrl: chrome.extension.getURL('../images/unknown.png'),
        };
      }

      render(renderUrl, renderConfig, renderCB, isMultiple);
      this._showArticle(animate);

      this._$container.on('click', '.spectrum-more-link a', function () {
        this.getAssociations(3);
      }.bind(this));
    },

    _showArticle: function (animate) {
      if (animate) {
        this._$container.velocity('transition.slideUpIn', {
          duration: 300,
        });
      } else {
        this._$container.show();
      }
    },
  };

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
