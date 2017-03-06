var publications = getLocalStorage('publications');
var mediaBias = {L: "Left-Wing", C: "Moderate", LC: "Left-Leaning", R: "Right-Wing", RC: "Right-Leaning"}
var associationApiUrl = 'https://spectrum-backend.herokuapp.com/feeds/associations';
var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June',
                  'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

var numOfArticlesToShow = 3

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

// Spectrum ---------------------------------------------------------------------

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
    var isNotClosed = getLocalStorage('hidden') !== 'spectrum-close';
    this.currentPublication = publications[location.host];

    if (isNotClosed && this.currentPublication) {
      this.getAssociations(2);
    }

    return this;
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
      if (_this._$container) {
        _this._addContainerCb(undefined, resp, numberArticles);
      } else {
        _this.showArticles(resp, numberArticles);
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

    if (isMinimize && !$currentPublicationIcon.attr('src')) {
      currentPublicationLink = chrome.extension.getURL('../images/icon-' + currentBias + '.png');
      $currentPublicationIcon.attr('src', currentPublicationLink);
    }

    this._$articleBorder.addClass('spectrum-expand-icon');
    this._$articleBorder.removeClass('spectrum-hide-panel');
    this._$container.addClass(hiddenType);
    this._$container.removeClass(removeClass);
  },

  showArticles: function (articleData, numberArticles) {
    render('../html/main.html', undefined, function ($el) {
      this._addContainerCb($el, articleData, numberArticles);
    }.bind(this));
  },

  _addContainerCb: function ($html, articleData, numberArticles) {
    var currPubData = this.currentPublication.fields;

    if ($html) {
      this._$container = $html;
      this._$articlesContainer = $html.find('#spectrum-articles-container');
      this._$articleBorder = $html.find('#spectrum-articles-container-top-border');
      $('body').append($html);

      // Add events here so only add once
      this._$container.on('click.spectrumReload', '.spectrum-more-link a', function () {
        this.getAssociations(3);
      }.bind(this));

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
      bias: mediaBias[currPubData.bias],
      target_url: currPubData.base_url,
      publication: currPubData.name,
    }, function ($el) {
      this._addCurrArticleCB($el, articleData, numberArticles);
    }.bind(this));
  },

  _addCurrArticleCB: function ($html, articleData, numberArticles) {
    var renderUrl, renderConfig, isMultiple;
    var renderCB = function ($el) {
      this._$articlesContainer.append($el);
    }.bind(this);

    if (numberArticles <= 2 || !articleData.length) {
      this._$articlesContainer.append($html);
    }

    if (articleData.length) {
      var singleArticleCB = function ($el) {
        this._$articlesContainer.append($el);
      }.bind(this);

      isMultiple = true;
      renderConfig = [];
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
      renderUrl = '../html/unknown.html';
      renderConfig = {
        imageUrl: chrome.extension.getURL('../images/unknown.png'),
      };
    }

    render(renderUrl, renderConfig, renderCB, isMultiple);
  },
};
