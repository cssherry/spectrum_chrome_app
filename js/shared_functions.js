var associationApiUrl = 'https://spectrum-backend.herokuapp.com/feeds/associations';
var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June',
                  'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

// Get local storage info
// name: identifier/variable name for data (will be transformed and saved as 'spectrum-NAME')
// _earliestAcceptableDate: OPTIONAL string that can be parsed into date (eg 'March 25, 2017')
function getLocalStorage(name, _earliestAcceptableDate) {
  var localData = localStorage.getItem('spectrum-' + name);
  if (!localData) {
    return undefined;
  }

  localData = JSON.parse(localData);

  // if older than 7 days, disregard
  var sevenDays = 1000 * 60 * 24 * 7;

  // If there's a _earliestAcceptableDate, figure out if it's older than dateSaved (good)
  var dateSavedAcceptable = true;
  var dateSaved = new Date(localData.dateSaved);
  if (_earliestAcceptableDate) {
    dateSavedAcceptable = new Date(_earliestAcceptableDate) < dateSaved;
  }

  if (dateSavedAcceptable && new Date() - dateSaved < sevenDays) {
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

// Spectrum ---------------------------------------------------------------------

// Removes subdomain of url hostname
function cleanUrl(hostname) {
  return hostname.split('.').slice(-2).join('.');
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

var spectrum = {
  init: function (location) {
    // Add mediaBias and publications
    this.publications = getLocalStorage('publications', 'March 25, 2017');
    this.mediaBias = getLocalStorage('mediaBias');
    this.isNotClosed = getLocalStorage('hidden') !== 'spectrum-close';

    if (this.isNotClosed) {
      chrome.runtime.sendMessage({
        action: 'setIcon',
        url: '../images/icon-inactive.png',
      });
    } else {
      chrome.runtime.sendMessage({
        action: 'setIcon',
        url: '../images/icon.png',
      });
    }

    var domain = cleanUrl(location.hostname);
    var isHomepage = location.origin + '/' === location.href ||
                     location.origin === location.href
    this.currentPublication = this.publications[domain];

    if (this.currentPublication && !isHomepage) {
      this.getAssociations();
    }

    return this;
  },

  getAssociations: function () {
    var _this = this;
    var urlToQuery = encodeURIComponent(location.href.split('?')[0]);

    $.ajax({
      url: associationApiUrl + '?url=' + urlToQuery,
      type: 'GET',
    })
    .fail(function (req, textstatus, errorthrown) {
      logError('Failed to get associations', req, textstatus, errorthrown);
    })
    .done(function (resp) {
      // API will return false if url is not in database
      // In that case, don't show panel
      _this.currentArticle = resp;
      if (resp) {
        if (_this.isNotClosed) {
          if (_this._$container) {
            _this._addContainerCb(undefined, resp);
          } else {
            _this.showArticles(resp);
          }
        }
      }
    });
  },

  _hideIcon: function () {
    this._$container.addClass('spectrum-no-button');
  },

  _showIcon: function () {
    this._$container.removeClass('spectrum-no-button');
  },

  _showContainer: function () {
    chrome.runtime.sendMessage({
      action: 'setIcon',
      url: '../images/icon.png',
    });

    if (this._$articleBorder) {
      this._$articleBorder.addClass('spectrum-hide-panel');
      this._$articleBorder.removeClass('spectrum-expand-icon');
      this._$container.removeClass('spectrum-close spectrum-minimize');
      this._$container.addClass('spectrum-not-minimize');
    }
  },

  _hideContainer: function (hiddenType) {
    var $currentPublicationIcon = this._$container.find('#spectrum-current-publication-icon');
    var currentPublicationLink;
    var isMinimize = hiddenType === 'spectrum-minimize';
    var removeClass = isMinimize ? 'spectrum-close' : 'spectrum-minimize';
    var currentBias = this.currentPublication.fields.bias;
    removeClass += ' spectrum-not-minimize';

    if (hiddenType === 'spectrum-close') {
      chrome.runtime.sendMessage({
        action: 'setIcon',
        url: '../images/icon-inactive.png',
      });
    }

    if (isMinimize && !$currentPublicationIcon.attr('src')) {
      currentPublicationLink = chrome.extension.getURL('../images/icon-' + currentBias + '.png');
      $currentPublicationIcon.attr('src', currentPublicationLink);
    }

    this._$articleBorder.addClass('spectrum-expand-icon');
    this._$articleBorder.removeClass('spectrum-hide-panel');
    this._$container.addClass(hiddenType);
    this._$container.removeClass(removeClass);
  },

  showArticles: function (articleData) {
    render('../html/main.html', undefined, function ($el) {
      this._addContainerCb($el, articleData);
    }.bind(this));
  },

  _addContainerCb: function ($html, articleData) {
    var currPubData = this.currentPublication.fields;

    if ($html) {
      this._$container = $html;
      this._$articlesContainer = $html.find('#spectrum-articles-container');
      this._$articleBorder = $html.find('#spectrum-articles-container-top-border');
      $('body').append($html);

      // Properly minimize container container if user hasn't maximized it before
      if (getLocalStorage('hidden') === null) {
        this._showContainer();
      } else {
        this._hideContainer('spectrum-minimize');
      }

      // Add events here so only add once
      this._$container.on('click.spectrumHide', '.spectrum-hide-panel', function (e) {
        var typeButton = e.target.dataset.hideType;
        setLocalStorage('hidden', typeButton);
        this._hideContainer(typeButton);
      }.bind(this));

      this._$container.on('click.spectrumExpand', '.spectrum-expand-icon', function () {
        setLocalStorage('hidden', null);
        this._showContainer();
      }.bind(this));
    } else {
      this._$articlesContainer.empty();
    }

    var hiddenType = getLocalStorage('hidden');
    if (hiddenType) {
      this._hideContainer(hiddenType);
    }

    if (getLocalStorage('hiddenIcon')) {
      this._hideIcon();
    }

    render('../html/publication_detail.html', {
      imageUrl: chrome.extension.getURL('../images/dial-' + currPubData.bias + '.png'),
      bias: this.mediaBias[currPubData.bias],
      biasAbbr: currPubData.bias,
      target_url: currPubData.base_url,
      publication: currPubData.name,
    }, function ($el) {
      this._addCurrArticleCB($el, articleData);
    }.bind(this));
  },

  _addCurrArticleCB: function ($publicationHtml, articleData) {
    var renderUrl, renderConfig, isMultiple;
    var _this = this;
    var renderCB = function ($el) {
      this._$articlesContainer.append($el);
    }.bind(this);

    this._$articlesContainer.append($publicationHtml);

    if (articleData.length) {
      var singleArticleCB = function ($el) {
        this._$articlesContainer.append($el);
        $(window).trigger('resize.show-or-hide');
      }.bind(this);

      isMultiple = true;
      renderConfig = [];
      renderCB = [];
      renderUrl = '../html/article.html';

      var $leftButton = $('<a role="button" class="spectrum-carousel-control spectrum-carousel-prev">');
      $leftButton.append('<span class="spectrum-icon-prev" aria-hidden="true"></span>');
      var $rightButton = $('<a role="button" class="spectrum-carousel-control spectrum-carousel-next">');
      $rightButton.append('<span class="spectrum-icon-next" aria-hidden="true"></span>');
      this._$articlesContainer.append($leftButton);
      $leftButton.hide();
      this._$articlesContainer.append($rightButton);

      articleData.forEach(function (article) {
        var moreText = this.mediaBias[article.publication_bias];
        var publicationDate = new Date(article.publication_date);

        var imageUrl = article.image_url || article.publication_logo;
        if (location.host === 'www.nytimes.com') {
          imageUrl = article.publication_logo.replace(/^http:/, 'https:');
        }

        renderConfig.push({
          imageUrl: imageUrl,
          source: article.publication_name,
          headLine: article.title,
          target_url: article.url,
          more_text: moreText,
          bias: article.publication_bias,
          publication_date: monthNames[publicationDate.getMonth()] + ' ' + publicationDate.getDate(),
        });

        renderCB.push(singleArticleCB);
      }.bind(this));

      // When window resizes, hide the "next" arrow if there aren't any articles
      // that are visible AND not in viewport
      var $articles;
      $(window).off('resize.show-or-hide').on('resize.show-or-hide', function () {
        getArticles();

        // wait to run so that div has time to update (hide excess articles, etc)
        setTimeout(function () {
          if ($articles) {
            var numberItems,
                numberArticlesToShow = 0,
                numberArticlesShown = 0;
            var moreArticles = $articles.filter(function () {
              var elementInViewport = isElementInViewport(this);
              var elementIsVisible = $(this).is(':visible');
              if (numberItems === undefined && elementIsVisible && elementInViewport) {
                numberItems = getNumberItems(this);
              }

              if (!elementInViewport && elementIsVisible) {
                numberArticlesToShow++;
              }

              if (elementInViewport && elementIsVisible) {
                numberArticlesShown++;
              }

              return !elementIsVisible;
            });

            if (numberArticlesToShow) {
              $rightButton.show();
            } else {
              $rightButton.hide();
            }

            if (numberArticlesShown < numberItems) {
              var numberToShow = numberItems - numberArticlesShown;
              var numberHiddenArticles = moreArticles.length;
              for (var j = numberHiddenArticles; j > numberHiddenArticles - numberToShow; j--) {
                $(moreArticles[j - 1]).show();
              }

              if (numberHiddenArticles === numberToShow) {
                $leftButton.hide();
              }
            }
          }
        }, 100);
      });

      // Add event handler to show previous or next articles
      this._$articlesContainer.off('click.show-or-hide').on('click.show-or-hide', 'a.spectrum-carousel-control', function (e) {
        var $clickedControl = $(e.currentTarget),
            goPrevious = $clickedControl.hasClass('spectrum-carousel-prev'),
            numberShown,
            numberToShow;

        getArticles();

        var articlesToShowOrHide =  $articles.filter(function () {
          var isInViewPort = isElementInViewport(this);
          var isHidden = !$(this).is(':visible');
          if (isInViewPort && !isHidden && !numberShown) {
            numberShown = getNumberItems(this);
          }

          if (goPrevious) {
            if (isHidden) {
              if (numberToShow === undefined) {
                numberToShow = 1;
              } else {
                numberToShow++;
              }
            }
            return isHidden;
          } else {
            if (isInViewPort) {
              numberToShow = 0;
            } else if ($.isNumeric(numberToShow)) {
              numberToShow++;
            }
            return isInViewPort;
          }
        });

        if (numberToShow <= numberShown) {
          $clickedControl.hide();
        }

        if (goPrevious) {
          var arrayLength = articlesToShowOrHide.length;
          for (var i = arrayLength; i > arrayLength - numberShown; i--) {
            $(articlesToShowOrHide[i - 1]).show();
          }
          $rightButton.show();
        } else {
          articlesToShowOrHide.hide();
          $leftButton.show();
        }
      });

      function getArticles() {
        if (!$articles) {
          var currentArticles = _this._$articlesContainer.find('.spectrum-article-container');
          if (articleData.length === currentArticles.length) {
            $articles = currentArticles;
          }
        }
      }

      function isElementInViewport(el) {
        // special bonus for those using jQuery
        if (typeof jQuery === 'function' && el instanceof jQuery) {
          el = el[0];
        }

        var rect = el.getBoundingClientRect();

        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
          rect.left <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
        );
      }

      function getNumberItems(item) {
        return Math.floor((item.parentElement.clientWidth - 170) / item.clientWidth);
      }
    } else {
      renderUrl = '../html/unknown.html';
      renderConfig = {
        imageUrl: chrome.extension.getURL('../images/unknown.png'),
      };
    }

    render(renderUrl, renderConfig, renderCB, isMultiple);
  },
};
