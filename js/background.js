var clickURL = 'https://spectrum-backend.herokuapp.com/feeds/click';
var feedbackURL = 'https://spectrum-backend.herokuapp.com/feeds/feedback';
var currentVersion = chrome.runtime.getManifest().version;
var unique_id;

// For creating unique_id
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

// sets unique id
function setOrGetUniqueId(sendResponse, username) {
  // Double check that unique_id isn't set
  var is_internal_user = username && username.toLowerCase().indexOf('test') >= 0;
  if (!unique_id) {
    chrome.storage.sync.get(['unique_id', 'username'], function (settings) {
      // Update status to let user know options were saved.
      unique_id = settings.unique_id;
      var username = settings.unique_id;

      if (!unique_id) {
        unique_id = username + '-' + getRandomToken();
        chrome.storage.sync.set({
          unique_id: unique_id,
        });
      }

      sendResponse({
        unique_id: unique_id,
        is_internal_user: is_internal_user,
      });
      return true;
    });
    return true;
  } else {
    sendResponse({
      unique_id: unique_id,
      is_internal_user: is_internal_user,
    });
    return true;
  }
}

// Get local storage info
// name: identifier/variable name for data (will be transformed and saved as 'spectrum-NAME')
// _earliestAcceptableDate: OPTIONAL string that can be parsed into date (eg 'March 25, 2017')
function processValue(keyData, _earliestAcceptableDate) {
  if (!keyData) {
    return undefined;
  }

  // Process non-checkDate values
  if (!keyData || !keyData.dateSaved) {
    return keyData;
  }

  // if older than 7 days, disregard
  var sevenDays = 1000 * 60 * 60 * 24 * 7;

  // If there's a _earliestAcceptableDate, figure out if it's older than dateSaved (good)
  var dateSavedAcceptable = true;
  var dateSaved = new Date(keyData.dateSaved);
  if (_earliestAcceptableDate) {
    dateSavedAcceptable = new Date(_earliestAcceptableDate) < dateSaved;
  }

  if (dateSavedAcceptable && new Date() - dateSaved < sevenDays) {
    return keyData.data;
  }

  return keyData.data;
}

function getLocalStorage(names, cb, _earliestAcceptableDate) {
  // MAIN FUNCTION
  chrome.storage.sync.get(names, function (items) {
    for (var key in items) {
      if (items.hasOwnProperty(key)) {
        items[key] = processValue(items[key], _earliestAcceptableDate);
      }
    }

    if (cb) {
      cb(items);
      return true;
    } else {
      return true;
    }
  });

  return true;
}

// Set local storage info
function setLocalStorage(data, cb, checkDate) {
  var result = {};
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      if (checkDate) {
        result[key] = {
          dateSaved: new Date().toString(),
          data: data[key],
        };
      } else {
        result[key] = data[key];
      }
    }
  }

  chrome.storage.sync.set(result, function (items) {
    if (cb) {
      cb(items);
      return true;
    }
    return true;
  });

  return true;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // Change icon when user disables extensions
  if (request.action === 'setIcon') {
    var url = chrome.extension.getURL(request.url);
    chrome.browserAction.setIcon({ path: url });
    return true;

  // process localstorage value
  } else if (request.action === 'processValue') {
    var processedValue = processValue(request.keyData, request.earliestAcceptableDate);
    sendResponse(processedValue);
    return true;

  // get information from chrome storage
  } else if (request.action === 'getLocalStorage') {
    if (request.localValues.indexOf('username') === -1) {
      request.localValues.push('username');
    }

    getLocalStorage(request.localValues, function (items) {
      setOrGetUniqueId(function (config) {
        items.unique_id = config.unique_id;
        items.is_internal_user = config.is_internal_user;
        sendResponse(items);
        return true;
      }, items.username);
      return true;
    }, request._earliestAcceptableDate);
    return true;

  // set chrome storage
  } else if (request.action === 'setLocalStorage') {
    setLocalStorage(request.localValues, undefined, request.checkDate);
    return true;

  // send back feedback
  } else if (request.action === 'sendClick' || request.action === 'sendFeedback') {
    getLocalStorage(['username'], function (items) {
      setOrGetUniqueId(function (config) {
        var oldOrNewUniqueId = config.unique_id;
        var is_internal_user = config.is_internal_user;
        var dataURL = request.action === 'sendClick' ? clickURL : feedbackURL;

        var dataParam = request.dataParam;
        dataParam.clicked_version = currentVersion;
        dataParam.unique_id = oldOrNewUniqueId;
        dataParam.username = items.username;
        dataParam.is_internal_user = is_internal_user;

        $.ajax({
          url: dataURL,
          data: dataParam,
          type: 'POST',
        })
        .fail(function (req, textstatus, errorthrown) {
          console.log('Failed to save click');
          console.log('req', req);
          console.log('textstatus', textstatus);
          console.log('errorthrown', errorthrown);
        })
        .done(function () {
          console.log('Successfully saved click');
        });
      }, items.username);
      return true;
    });
    return true;

  // get back unique id
  } else if (request.action === 'setOrGetUniqueId') {
    setOrGetUniqueId(sendResponse, request.username);
    return true;
  }
});
