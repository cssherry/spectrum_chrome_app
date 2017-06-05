var clickURL = 'https://spectrum-backend.herokuapp.com/feeds/click';

function sendMessage(requestObject, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0].id;
    chrome.tabs.sendMessage(currentTab, requestObject, callback);
  });
}

function addSpectrumEvents() {
  var currentPublication;
  var $popupBody = $('.spectrum-popup-body');
  var $panelOptions = $popupBody.find('.spectrum-close');
  var $minimizedOptions = $popupBody.find('.spectrum-minimize');
  var $iconOptions = $popupBody.find('.spectrum-no-button');

  // Set initial visibility
  var setVisibilityRequest = {
    action: 'getLocalStorage',
    localValues: ['hidden', 'hiddenIcon', 'unique_id'],
  };
  sendMessage(setVisibilityRequest, function (result) {
    if (!result) {
      result = {
        currentArticle: undefined,
        hidden: undefined,
        hiddenIcon: undefined,
        unique_id: undefined,
      };
    }

    currentPublication = result.currentArticle;
    if (currentPublication) {
      $popupBody.removeClass('spectrum-disabled');
    }

    if (result.hidden === 'spectrum-close') {
      $panelOptions.filter('.spectrum-hide-panel').hide();
    } else {
      $panelOptions.filter('.spectrum-show-option').hide();
    }

    if (result.hidden === 'spectrum-minimize') {
      $minimizedOptions.filter('.spectrum-hide-panel').hide();
    } else {
      $minimizedOptions.filter('.spectrum-show-option').hide();
    }

    if (result.hiddenIcon) {
      $iconOptions.filter('.spectrum-hide-panel').hide();
    } else {
      $iconOptions.filter('.spectrum-show-option').hide();
    }

    $popupBody.on('click.sendClick', 'li', function (e) {
      var elementClass = '.' + e.currentTarget.className.replace(/ /g, '.');
      var clickData = {
        element_selector: elementClass,
        clicked_item_dict: JSON.stringify({
          element_class: elementClass,
          element_data: e.currentTarget.dataset,
          element_text: e.currentTarget.textContent,
        }),
        clicked_version: chrome.runtime.getManifest().version,
        unique_id: result.unique_id,
      };

      $.ajax({
        url: clickURL,
        data: clickData,
        type: 'POST',
      })
      .fail(function (req, textstatus, errorthrown) {
        console.log('Failed to save click');
        console.log('req', req);
        console.log('textstatus', textstatus);
        console.log('errorthrown', errorthrown);

      })
      .done(function (resp) {
        console.log('Successfully saved click');
      });
    });


  });

  function toggleVisibility(showType, hideType) {
    if (showType === 'hidden') {
      if (hideType === 'spectrum-minimize') {
        $minimizedOptions.toggle();
      } else {
        $panelOptions.toggle();
      }
    } else {
      $iconOptions.toggle();
    }
  }

  $popupBody.on('click.hidePanel', '.spectrum-hide-panel', function (e) {
    if ($(e.target).closest('.spectrum-disabled').length) {
      return;
    }

    var dataset = e.target.dataset;
    var requestObject = {
      action: 'hideSpectrumPanel',
      typeButton: dataset.hideType,
      showType: dataset.showType,
    };
    toggleVisibility(dataset.showType, dataset.hideType);
    sendMessage(requestObject);
  });

  $popupBody.on('click.showPanel', '.spectrum-show-option', function (e) {
    if ($(e.target).closest('.spectrum-disabled').length) {
      return;
    }

    var showType = e.target.dataset.showType;
    var requestObject = {
      action: 'showSpectrumPanel',
      showType: showType,
    };
    toggleVisibility(showType, e.target.dataset.hideType);
    sendMessage(requestObject);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  addSpectrumEvents();
});
