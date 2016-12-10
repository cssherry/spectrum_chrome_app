var render = function(url, context) {
    context = context || {};

    var html;
    $.ajax({
        url: url,
        success: function(data) {
            var template = Handlebars.compile(data);
            html = template(context);
        },
        async: false
    });

    return $(html);
};

// Article ---------------------------------------------------------------------

var Article = function(imageUrl, source, headLine, percentage, targetUrl) {
    var url = chrome.extension.getURL("html/article.html");

    this._$container = render(url, {
        imageUrl: imageUrl,
        source: source,
        headLine: headLine,
        target_url: targetUrl
    });
    this._$meterThumb = this._$container.find('.spectrum-meter-thumb');

    this.moveMeterThumb(percentage);

    return this;

};

Article.prototype.getContainer = function() {
    return this._$container;
};

Article.prototype.moveMeterThumb = function(percentage) {
    if (percentage < 0) {
        percentage = 0;
    } if (percentage > 100) {
        percentage = 100;
    }

    this._$meterThumb.velocity({
        properties: { 'left': percentage + '%' },
        options: { duration: 500 }
    });
};

// Popup -----------------------------------------------------------------------

var Popup = function(caption, numberOfVotes, percentage) {
    var url = chrome.extension.getURL("html/popup.html");

    this._$container = render(url,{
        caption: caption,
        numberOfVotes: numberOfVotes,
        percentage: percentage
    });
    this._$meterThumb = this._$container.find('.spectrum-meter-thumb');

    this.moveMeterThumb(percentage);

    return this;
};

Popup.prototype.getContainer = function() {
    return this._$container;
};

Popup.prototype.moveMeterThumb = function(percentage) {
    if (percentage < 0) {
        percentage = 0;
    } if (percentage > 100) {
        percentage = 100;
    }

    this._$meterThumb.velocity({
        properties: { 'left': percentage + '%' },
        options: { duration: 500 }
    });
};

var captionForSpectrumIndex = [
    "LEFT".toUpperCase(),
    "LEFT OF CENTER".toUpperCase(),
    "CENTER".toUpperCase(),
    "RIGHT OF CENTER".toUpperCase(),
    "RIGHT".toUpperCase()
];

var percentageForSpectrumIndex = [
    10,
    25,
    50,
    75,
    90
];

var content = {
    "http://fortune.com/2016/11/19/jeff-sessions-race-civil-rights/": {
        "num_votes": 356,
        "spectrum_index": 3,
        "left_article": {
            "url": "https://www.washingtonpost.com/news/wonk/wp/2016/11/19/how-jeff-sessions-went-from-fringe-figure-to-mainstream-republican",
            "image_url": "https://lh4.ggpht.com/5wzR5Tsj5fQ4Igs1R1HMBep99ufDzMr0028lxn2Ji4GTidrwwMM5D74JvGE6nmH6OcKH=w300",
            "source": "Washington Post",
            "headline": "How Jeff Sessions went from fringe figure to mainstream Republican",
            "spectrum_index": 1
        },
        "right_article":
        {
            "url": "http://www.nytimes.com/2016/11/19/us/politics/jeff-sessions-donald-trump-attorney-general.html",
            "image_url": "https://static01.nyt.com/images/icons/t_logo_291_black.png",
            "source": "New York Times",
            "headline": "Jeff Sessions, as Attorney General, Could Overhaul Department He’s Skewered",
            "spectrum_index": 1
        }
    },

    "https://www.washingtonpost.com/news/wonk/wp/2016/11/19/how-jeff-sessions-went-from-fringe-figure-to-mainstream-republican/": {
        "num_votes": 785,
        "spectrum_index": 1,
        "left_article": {
            "url": "http://www.foxnews.com/politics/2016/11/19/cities-defend-immigration-sanctuary-policies-under-fire-by-trump.html",
            "image_url": "http://global.fncstatic.com/static/v/all/img/og/og-fn-foxnews.jpg",
            "source": "Fox News",
            "headline": "Cities defend immigration sanctuary policies under fire by Trump",
            "spectrum_index": 4
        },
        "right_article":
        {
            "url": "http://www.nationalreview.com/article/442316/attorney-general-jeff-sessions-fair-civil-rights",
            "image_url": "http://www.nationalreview.com/sites/default/files/logo_nr_social_2016_600_D.jpg",
            "source": "National Review",
            "headline": "Jeff Sessions Will Be Just Fine on Civil Rights",
            "spectrum_index": 4
        }
    },

    "http://www.foxnews.com/politics/2016/11/19/cities-defend-immigration-sanctuary-policies-under-fire-by-trump.html": {
        "num_votes": 127,
        "spectrum_index": 4,
        "left_article": {
            "url": "https://theintercept.com/2016/11/18/donald-trumps-mass-deportations-would-cost-billions-and-take-years-to-process",
            "image_url": "https://openmedia.org/sites/default/files/TheIntercept_logo-23.png",
            "source": "The Intercept",
            "headline": "Donald Trump's Mass Deportations Would Cost Billions and Take Years to Process",
            "spectrum_index": 1
        },
        "right_article":
        {
            "url": "http://www.reuters.com/article/us-usa-trump-immigration-idUSKBN13B05C",
            "image_url": "https://pbs.twimg.com/profile_images/3379693153/1008914c0ae75c9efb5f9c0161fce9a2_400x400.png",
            "source": "Reuters",
            "headline": "Immigration hardliner says Trump team preparing plans for wall, mulling Muslim registry",
            "spectrum_index": 2
        }
    },
};

var spectrum = {
    init: function(currentUrl) {
        var articleData = content[currentUrl];

        if (articleData) {
            var url = chrome.extension.getURL('html/main.html');
            this._$container = render(url);
            this._$articlesContainer = this._$container.find('#spectrum-articles-container');
            $('body').append(this._$container);

            this._popup = new Popup(
                captionForSpectrumIndex[articleData.spectrum_index],
                articleData.num_votes,
                percentageForSpectrumIndex[articleData.spectrum_index]
            );
            this._$popup = this._popup.getContainer();
            $('body').append(this._$popup);

            var leftArticle = new Article(
                articleData.left_article.image_url,
                articleData.left_article.source.toUpperCase(),
                articleData.left_article.headline,
                percentageForSpectrumIndex[articleData.left_article.spectrum_index],
                articleData.left_article.url
            );

            var rightArticle = new Article(
                articleData.right_article.image_url,
                articleData.right_article.source.toUpperCase(),
                articleData.right_article.headline,
                percentageForSpectrumIndex[articleData.right_article.spectrum_index],
                articleData.right_article.url
            );

            this._$articlesContainer.append(leftArticle.getContainer(), rightArticle.getContainer());


            this._hideIfNecessary(false);

            this._bindEvents();
        } else {
            console.log("Unrecognized source: " + currentUrl);
        }
    },

    _bindEvents: function() {
        $(window).scroll(this._onScroll.bind(this));
    },

    _onScroll: function() {
        this._hideIfNecessary(true);
    },

    _hideIfNecessary: function(animate) {
        var height = $(document).height();
        var scrollBottom = $(window).scrollTop() + $(window).height();

        if (height * 0.75 < scrollBottom) {
            this.showArticles(animate);
        } else {
            this.hideArticles(animate);
        }
    },

    hideArticles: function(animate) {
        if (this._hidden) {
            return;
        }
        this._hidden = true;

        this._$popup.css('top', 'auto');
        this._$popup.css('bottom', 0);

        if (animate) {
            this._$container.velocity('transition.slideDownOut', {
                duration: 300
            });
        } else {
            this._$container.hide();
        }
    },

    showArticles: function(animate) {
        if (!this._hidden) {
            return;
        }
        this._hidden = false;

        this._$popup.css('top', 0);
        this._$popup.css('bottom', 'auto');

        if (animate) {
            this._$container.velocity('transition.slideUpIn', {
                duration: 300
            });
        } else {
            this._$container.show();
        }
    }
};

$(document).ready(function() {
    var currentUrl = window.location.toString();
    spectrum.init(currentUrl);
});
