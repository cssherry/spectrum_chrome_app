var settingURL = 'https://spectrum-backend.herokuapp.com/feeds/saveuser';

// Saves options to chrome.storage.sync.
function saveOptions() {
  var hidden = document.getElementById('hidden').value;
  var hiddenIcon = document.getElementById('hiddenIcon').checked ? 'spectrum-no-button' : null;
  var username = document.getElementById('username').value;

  var setConfig = {
    hidden: hidden,
    hiddenIcon: hiddenIcon,
    username: username,
  };

  chrome.runtime.sendMessage({
    action: 'setOrGetUniqueId',
    username: username,
  }, function (config) {
    setConfig.unique_id = config.unique_id;
    setConfig.is_internal_user = config.is_internal_user;
    var status = document.getElementById('status');
    $.ajax({
      url: settingURL,
      data: setConfig,
      type: 'POST',
    })
    .fail(function (req, textstatus, errorthrown) {
      if (req.responseJSON) {
        status.textContent = 'Failed to save settings: ' + req.responseJSON.message;
      } else {
        status.textContent = 'Failed to save settings';
      }
      status.className = 'spectrum-status-error';
      console.log('req', req);
      console.log('textstatus', textstatus);
      console.log('errorthrown', errorthrown);
    })
    .done(function (resp) {
      chrome.storage.sync.set(setConfig, function () {
        // Update status to let user know options were saved.
        status.textContent = resp.message;
        status.className = 'spectrum-status-success';
        setTimeout(function () {
          status.textContent = '';
          status.className = '';
        }, 2000);
      });
    });
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    hidden: '',
    hiddenIcon: null,
    username: '',
  }, function (settings) {
    document.getElementById('hidden').value = settings.hidden || '';
    document.getElementById('hiddenIcon').checked = !!settings.hiddenIcon;
    document.getElementById('username').value = settings.username;

    $('#user-form').off('change.sendClick')
                   .on('change.sendClick', function (e) {
      var elementId = '#' + e.target.id;
      var clickData = {
        element_selector: elementId,
        clicked_item_dict: JSON.stringify({
          element_id: e.target.id,
          element_name: e.target.name,
          value: e.target.value,
        }),
      };

      chrome.runtime.sendMessage({
        action: 'sendClick',
        dataParam: clickData,
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click',
    saveOptions);
