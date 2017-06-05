var unique_id;
var settingURL = 'https://spectrum-backend.herokuapp.com/feeds/saveuser';

function getRandomToken() {
    // E.g. 8 * 32 = 256 bits token
    var randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
    return hex;
}

// Saves options to chrome.storage.sync.
function saveOptions() {
  var hidden = document.getElementById('hidden').value;
  var hiddenIcon = document.getElementById('hiddenIcon').checked ? 'spectrum-no-button' : null;
  var username = document.getElementById('username').value;

  var setConfig = {
    hidden: hidden,
    hiddenIcon: hiddenIcon,
    username: username,
    is_internal_user: username.indexOf('test') >= 0,
  };

  if (!unique_id) {
    unique_id = username + '-' + getRandomToken();
  }

  setConfig.unique_id = unique_id;
  var status = document.getElementById('status');
  $.ajax({
    url: settingURL,
    data: setConfig,
    type: 'POST',
  })
  .fail(function (req, textstatus, errorthrown) {
    status.textContent = 'Failed to save settings: ' + req.responseJSON.message;
    console.log('req', req);
    console.log('textstatus', textstatus);
    console.log('errorthrown', errorthrown);

  })
  .done(function (resp) {
    chrome.storage.sync.set(setConfig, function () {
      // Update status to let user know options were saved.
      status.textContent = resp.message;
      setTimeout(function () {
        status.textContent = '';
      }, 1500);
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
    unique_id: '',
  }, function (settings) {
    document.getElementById('hidden').value = settings.hidden || '';
    document.getElementById('hiddenIcon').checked = !!settings.hiddenIcon;
    document.getElementById('username').value = settings.username;
    unique_id = settings.unique_id;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click',
    saveOptions);
