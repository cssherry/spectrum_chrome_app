var uniqueId;
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
  };

  if (!uniqueId) {
    uniqueId = username + '-' + getRandomToken();
    setConfig.uniqueId = uniqueId;
  }

  chrome.storage.sync.set(setConfig, function () {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved';
    setTimeout(function () {
      status.textContent = '';
    }, 1000);
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
    uniqueId: '',
  }, function (settings) {
    document.getElementById('hidden').value = settings.hidden || '';
    document.getElementById('hiddenIcon').checked = !!settings.hiddenIcon;
    document.getElementById('username').value = settings.username;
    uniqueId = settings.uniqueId;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click',
    saveOptions);
