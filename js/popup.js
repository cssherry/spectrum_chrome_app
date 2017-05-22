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
    localValues: ['hidden', 'hiddenIcon'],
  };
  sendMessage(setVisibilityRequest, function (result) {
    if (!result) {
      result = {
        currentArticle: undefined,
        hidden: undefined,
        hiddenIcon: undefined,
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
