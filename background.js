/***************************************
INSTALLATION AND UPDATE DETECTION
***************************************/

/*
   Listen for installation related events. This either comes from installing
   via the Chrome app store, or from loading an unpacked extension via the
   chrome://extensions page. Note that refreshing an unpacked extension will
   count as an 'update' status rather than a new installation.
 */
chrome.runtime.onInstalled.addListener(function(details) {
 if(details.reason == "install") {
   //New installation - open a new tab to our help guide.
   console.log("This is a first install!");
   chrome.tabs.create({url: "https://www.littledata.io/"}, function (tab) {
     console.log("Opened help guide on https://www.littledata.io/");
   });
 } else if(details.reason == "update") {
   //Version update, just drop a note in the console for now..
   var thisVersion = chrome.runtime.getManifest().version;
   console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
 }
});

/***************************************
PAGE ACTION STATE MANAGEMENT
***************************************/

function enableExtension(sender) {
  //Turn on the extension
  setIconStateEnabled(sender.tab.id)
}

function disableExtension(sender) {
  //Turn off the extension
  setIconStateDisabled(sender.tab.id)
  clearLocalStorageContent();
}

function clearLocalStorageContent() {
  //Clear local storage
  chrome.storage.local.clear(function() {
    var error = chrome.runtime.lastError;
    if (error) console.error(error);
  });
  
  //As this happens on disabling the extension, reset the state value:
  chrome.storage.local.set({ state: false });
}

function setIconStateEnabled(tab) {
  chrome.pageAction.setIcon({ tabId: tab, path : 'images/icon-green-128.png' }, () => {});
}

function setIconStateDisabled(tab) {
  chrome.pageAction.setIcon({ tabId: tab, path : 'images/icon-grey-128.png' }, () => {});
}

function setIconStateError(tab) {
  chrome.pageAction.setIcon({ tabId: tab, path : 'images/icon-red-128.png' }, () => {});
}

/***************************************
VALIDATING PAGE DATA
***************************************/

function analyseLogData(tabID) {
  var pageLog = [];
  chrome.storage.local.get('pageLog', function(result) {
    pageLog = JSON.parse(result.pageLog);
    if (pageLog.length > 0) {
      if (pageLog.length == 1) {
        analysePage(pageLog[0], tabID, false);
      } else {
        analyseAllPages(pageLog, tabID);
      }
    }
  });
}

function analysePage(page, tabID, bIsJourneyStart) {
  
  let prefix = (bIsJourneyStart) ? 'Start URL: ' : 'URL: ';
  let bPageErrors = false;

  let clientLen = (typeof(page.ClientID == 'string')) ? page.ClientID.length : 0;
  let cookieLen = (typeof(page.CookieID == 'string')) ? page.CookieID.length : 0;
  let cartJSLen = (typeof(page.CartClientID == 'string')) ? page.CartClientID.length : 0;

  
  //CHECK 1 : Is the LittledataLayer missing?
  if (!page.Littledata.hasLittledataLayer) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' is missing LittledataLayer!', 'color: #600');
  }
  
  //CHECK 2 : Is the Littledata Tracking Tag missing?
  if (!page.Littledata.hasTrackingTag) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' is missing Littledata Tracking Tag', 'color: #600');
  }
  
  //CHECK 3 : Is one of our scripts active?
  if (!(page.Littledata.hasGATrackerJS || page.Littledata.hasSegmentTrackerJS || page.Littledata.hasCarthookTrackerJS)) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' is missing Littledata Tracking JS script(s)', 'color: #600');
  }
  
  //CHECK 4 : Is the app version out of date?
  if (page.Littledata.version !== 'v8.0.5') {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' is not using the latest app version. Page is using version ' + page.Littledata.version, 'color: #600');
  }
  
  //CHECK 5 : Is the Client ID missing?
  if (clientLen <= 0) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' is missing Client ID from Global GA tracker.', 'color: #600');
  }
  
  //CHECK 6 : Is the Cookie ID missing?
  if (cookieLen <= 0) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' is missing Client ID from _ga Cookie.', 'color: #600');
  }
  
  //CHECK 7 : Is the Client ID missing from the Cart data?
  if (cartJSLen <= 0) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' is missing Client ID from cart.js data.', 'color: #600');
  }
  
  //CHECK 8 : Do any of the client IDs have mismatches?
  if (clientLen > 0 && cookieLen > 0) {
    if (page.ClientID !== page.CookieID) {
      bPageErrors = true;
      console.log('%c' + prefix + page.href + ' has mismatched values for Client ID and _ga Cookie Client ID.', 'color: #600');
    }
  }

  if (clientLen > 0 && cartJSLen > 0) {
    if (page.ClientID !== page.CartClientID) {
      bPageErrors = true;
      console.log('%c' + prefix + page.href + ' has mismatched values for Client ID and cart.js Client ID.', 'color: #600');
    }
  }

  if (cartJSLen > 0 && cookieLen > 0) {
    if (page.CartClientID !== page.CookieID) {
      bPageErrors = true;
      console.log('%c' + prefix + page.href + ' has mismatched values for cart.js Client ID and _ga Cookie Client ID.', 'color: #600');
    }
  }
  
  //CHECK 9 : Missing GA Tracking ID
  if (!page.Littledata.webPropertyID.length) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' may be missing its Google Analytics Web Property ID (e.g.: UA-XXXXXX-X) in the tracking tag.', 'color: #600');
  } else if (page.Littledata.webPropertyID.length <= 0) {
    bPageErrors = true;
    console.log('%c' + prefix + page.href + ' has no Google Analytics Web Property ID (e.g.: UA-XXXXXX-X) in the tracking tag.', 'color: #600');
  }
  
  
  //If any errors were encountered, update the Page Action to the red warning icon
  if (bPageErrors) {
    setIconStateError(tabID);
  } else {
    console.log('%c' + prefix + page.href + ' has no Littledata tracking issues!','color: #060;');
  }
}

function analyseAllPages(pageLog, tabID) {
  let bPageErrors = false;
  let firstPage = pageLog[0];
  
  //Skip the first page as that's done in the call above.
  for (var i = 0; i < pageLog.length; i++) {
    page = pageLog[i];
    analysePage(page, tabID, (i == 0) ? true : false);
    
    //Checks for all pages except first one (comparing data integrity)
    if (i > 0) {
      
      //COMPARE CHECK 1 : Do the Client IDs match?
      if (page.ClientID !== firstPage.ClientID) {
        bPageErrors = true;
        console.log('%cURL: ' + page.href + ' has a different client ID to the first page of the recorded journey (Current: ' + page.ClientID + ' | First: ' + firstPage.ClientID + ').', 'color: #600');
      }
    }
  }

  if (bPageErrors) {
    setIconStateError(tabID);
  } else {
    console.log('%cURL: ' + page.href + ' has no Littledata tracking issues!','color: #060;');
  }
}



/***************************************
MESSAGING FROM CONTENT SCRIPTS
***************************************/

chrome.runtime.onMessage.addListener((msg, sender) => {
  
  // First, validate the message's structure.
  if ((msg.from === 'content') && (msg.subject === 'showPageAction')) {
    // Enable the page-action for the requesting tab.
    chrome.pageAction.show(sender.tab.id);
  }
  
  //Clicking the Extension's Page Action
  if ((msg.from === 'popup') && (msg.subject === 'pageActionClicked')) {
    //Just in case we need it later...
    //console.log('Page action clicked.');
  }
  
  //Turning the extension on and off
  if ((msg.from === 'content') && (msg.subject === 'changeExtensionIcon')) {
    //console.log("[Event: changeExtensionIcon] Tab ID: " + sender.tab.id + " | Mode: " + msg.mode);
    if (msg.mode) {
      enableExtension(sender);
    } else {
      disableExtension(sender);
    }
  }

  if ((msg.from === 'content') && (msg.subject === 'savePageLogData')) {
    chrome.storage.local.set({ 'pageLog' : msg.data });
    analyseLogData(sender.tab.id);
  }
  
});