var associationApiUrl = 'https://spectrum-backend.herokuapp.com/feeds/associations';
var currentVersion = chrome.runtime.getManifest().version;
var unique_id;

var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June',
                  'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

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
  init: function (location, publications, mediaBias) {
    // Add mediaBias and publications
    var _this = this;
    _this.location = location;
    _this.publications = publications;
    _this.mediaBias = mediaBias;

    chrome.runtime.sendMessage({
      action: 'getLocalStorage',
      localValues: ['hidden', 'hiddenIcon', 'username'],
    }, function (items) {
      _this.isNotClosed = items.hidden !== 'spectrum-close';
      unique_id = items.unique_id;
      _this.username = items.username;
      _this.is_internal_user = items.is_internal_user;
      _this.hidden = items.hidden;
      _this.hiddenIcon = items.hiddenIcon;

      if (_this.isNotClosed) {
        chrome.runtime.sendMessage({
          action: 'setIcon',
          url: '../images/icon.png',
        });
      } else {
        chrome.runtime.sendMessage({
          action: 'setIcon',
          url: '../images/icon-inactive.png',
        });
      }

      var domain = cleanUrl(location.hostname);
      var isHomepage = location.origin + '/' === location.href ||
                       location.origin === location.href;
      _this.currentPublication = _this.publications[domain];

      if (_this.currentPublication && !isHomepage) {
        _this.getAssociations();
      }
    });

    return this;
  },

  getAssociations: function () {
    var _this = this;
    _this.currentURL = location.href.split('?')[0];
    var data = {
      url: _this.currentURL,
      unique_id: unique_id,
      username: _this.username,
      is_internal_user: _this.is_internal_user,
    };

    $.ajax({
      url: associationApiUrl,
      data: data,
      type: 'POST',
    })
    .fail(function (req, textstatus, errorthrown) {
      logError('Failed to get associations', req, textstatus, errorthrown);
    })
    .done(function (resp) {
      _this.associatedArticles = resp.top_associations;
      _this.currentArticle = resp.current_article;
      if (resp) {
        if (_this.isNotClosed) {
          if (_this._$container) {
            _this._addContainerCb(undefined);
          } else {
            _this.showArticles();
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
    this.isNotClosed = true;

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

      this.isNotClosed = false;
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

  showArticles: function () {
    render('../html/main.html', undefined, function ($el) {
      this._addContainerCb($el);
    }.bind(this));
  },

  _addContainerCb: function ($html) {
    var currPubData = this.currentPublication.fields;
    var _this = this;

    var hidden = _this.hidden;
    var hiddenIcon = _this.hiddenIcon;
    if ($html) {
      _this._$container = $html;
      _this._$articlesContainer = $html.find('#spectrum-articles-container');
      _this._$articleBorder = $html.find('#spectrum-articles-container-top-border');
      $('body').append($html);

      // Properly minimize container container if user hasn't maximized it before
      if (hidden === null) {
        _this._showContainer();
      } else {
        _this._hideContainer('spectrum-minimize');
      }

      // Add events here so only add once
      _this._$container.on('click.spectrumHide', '.spectrum-hide-panel', function (e) {
        var typeButton = e.target.dataset.hideType;
        chrome.runtime.sendMessage({
          action: 'setLocalStorage',
          localValues: { hidden: typeButton },
        });
        _this._hideContainer(typeButton);
      });

      _this._$container.on('click.spectrumExpand', '.spectrum-expand-icon', function () {
        chrome.runtime.sendMessage({
          action: 'setLocalStorage',
          localValues: { hidden: null },
        });
        _this._showContainer();
      });

      _this._$container.on('click.sendClick', function (e) {
        var elementSelector;
        e.stopPropagation();

        if (e.target.id) {
          elementSelector = '#' + e.target.id;
        } else {
          elementSelector = '.' + e.target.className.replace(/ /g, '.');
        }

        var clickData = {
          element_selector: elementSelector,
          clicked_item_dict: JSON.stringify({
            element_id: e.target.id,
            element_class: e.target.className,
            element_data: e.target.dataset,
            element_text: e.target.textContent,
          }),
        };

        chrome.runtime.sendMessage({
          action: 'sendClick',
          dataParam: clickData,
        });
      });
    } else {
      _this._$articlesContainer.empty();
    }

    if (hidden) {
      _this._hideContainer(hidden);
    } else {
      _this._showContainer();
    }

    if (hiddenIcon) {
      _this._hideIcon();
    }

    render('../html/publication_detail.html', {
      imageUrl: chrome.extension.getURL('../images/dial-' + currPubData.bias + '.png'),
      bias: _this.mediaBias[currPubData.bias],
      biasAbbr: currPubData.bias,
      target_url: currPubData.base_url,
      publication: currPubData.name,
      feed_item_id: this.currentPublication.id,
    }, function ($el) {
      _this._addCurrArticleCB($el);
    });
  },

  _addCurrArticleCB: function ($publicationHtml) {
    var renderUrl, renderConfig, isMultiple;
    var _this = this;
    var renderCB = function ($el) {
      _this._$articlesContainer.append($el);
    };

    _this._$articlesContainer.append($publicationHtml);

    if (_this.associatedArticles.length) {
      var singleArticleCB = function ($el) {
        _this._$articlesContainer.append($el);
        $(window).trigger('resize.show-or-hide');
      };

      isMultiple = true;
      renderConfig = [];
      renderCB = [];
      renderUrl = '../html/article.html';

      var $leftButton = $('<a role="button" class="spectrum-carousel-control spectrum-carousel-prev">');
      $leftButton.append('<span class="spectrum-icon-prev" aria-hidden="true"></span>');
      var $rightButton = $('<a role="button" class="spectrum-carousel-control spectrum-carousel-next">');
      $rightButton.append('<span class="spectrum-icon-next" aria-hidden="true"></span>');
      _this._$articlesContainer.append($leftButton);
      $leftButton.hide();
      _this._$articlesContainer.append($rightButton);

      _this.associatedArticles.forEach(function (article) {
        var moreText = _this.mediaBias[article.publication_bias];
        var publicationDate = new Date(article.publication_date);

        var imageUrl = article.image_url || article.publication_logo;
        if (location.host === 'www.nytimes.com') {
          imageUrl = article.publication_logo.replace(/^http:/, 'https:');
        }

        renderConfig.push({
          imageUrl: imageUrl,
          feed_item_id: _this.currentArticle.id,
          association_id: article.association_id,
          source: article.publication_name,
          headLine: article.title,
          target_url: article.url,
          more_text: moreText,
          bias: article.publication_bias,
          publication_date: monthNames[publicationDate.getMonth()] + ' ' + publicationDate.getDate(),
        });

        renderCB.push(singleArticleCB);
      });

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
            goPreviouse = $clickedControl.hasClass('spectrum-carousel-prev'),
            numberShown,
            numberToShow;

        getArticles();

        var articlesToShowOrHide =  $articles.filter(function () {
          var isInViewPort = isElementInViewport(this);
          var isHidden = !$(this).is(':visible');
          if (isInViewPort && !isHidden && !numberShown) {
            numberShown = getNumberItems(this);
          }

          if (goPreviouse) {
            if (isHidden) {
              if (numberToShow === undefined) {
                numberToShow = 1;
              } else {
                numberToShow++;
              }
            }
            return isHidden;
          }
            if (isInViewPort) {
              numberToShow = 0;
            } else if ($.isNumeric(numberToShow)) {
              numberToShow++;
            }
            return isInViewPort;
        });

        if (numberToShow <= numberShown) {
          $clickedControl.hide();
        }

        if (goPreviouse) {
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
          if (_this.associatedArticles.length === currentArticles.length) {
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
        currentURL: _this.currentURL,
        location: encodeURIComponent(_this.location.href),
        currentVersion: currentVersion,
        feed_item_id: _this.currentArticle.id,
      };
    }

    render(renderUrl, renderConfig, renderCB, isMultiple);
  },
};
