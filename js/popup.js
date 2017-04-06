function sendMessage(requestObject, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0].id;
    chrome.tabs.sendMessage(currentTab, requestObject, callback);
  });
}

function addSpectrumEvents() {
  var currentPublication;
  var $popupBody = $('.spectrum-popup-body');
  var $panelOptions = $popupBody.find('[data-show-type="hidden"]');
  var $iconOptions = $popupBody.find('[data-show-type="hiddenIcon"]');

  // Set initial visibility
  var setVisibilityRequest = {
    action: 'getLocalStorage',
    localValues: ['hidden', 'hiddenIcon'],
  };
  sendMessage(setVisibilityRequest, function (result) {
    currentPublication = result.currentArticle
    if (currentPublication) {
      $popupBody.removeClass('spectrum-disabled');
    }

    if (result.hidden) {
      $panelOptions.filter('.spectrum-hide-panel').hide();
    } else {
      $panelOptions.filter('.spectrum-show-option').hide();
    }

    if (result.hiddenIcon) {
      $iconOptions.filter('.spectrum-hide-panel').hide();
    } else {
      $iconOptions.filter('.spectrum-show-option').hide();
    }
  });

  function toggleVisibility(showType) {
    if (showType === 'hidden') {
      $panelOptions.toggle();
    } else {
      $iconOptions.toggle();
    }
  }

  // Don't add event handlers if there's no publications on page
  if (!currentPublication) {
    return;
  }

  $popupBody.on('click.hidePanel', '.spectrum-hide-panel', function (e) {
    var dataset = e.target.dataset;
    var requestObject = {
      action: 'hideSpectrumPanel',
      typeButton: dataset.hideType,
      showType: dataset.showType,
    };
    toggleVisibility(dataset.showType);
    sendMessage(requestObject);
  });

  $popupBody.on('click.showPanel', '.spectrum-show-option', function (e) {
    var showType = e.target.dataset.showType;
    var requestObject = {
      action: 'showSpectrumPanel',
      showType: showType,
    };
    toggleVisibility(showType);
    sendMessage(requestObject);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  addSpectrumEvents();
});
