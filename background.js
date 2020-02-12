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
PAGE ACTION STATE PRESERVATION
***************************************/

/*
   We need state management in place to handle the user moving between
   pages or refreshing, even simple things like whether or not the extension
   was enabled needs to be checked, otherwise every page load will start with
   the extension disabled. However, in the case that the extension was already
   activated, we also use this section to tell content.js what to initialise.
   This can be settings for the popup interface (e.g. the on / off button state)
   or our logged data about the Shopify journey we are already tracking.
*/

chrome.pageAction.onClicked.addListener(function(tab) {
  chrome.storage.local.get("state", function(result)
  {
    //First initialisation of the state in the local storage
    if(result.state == null) {
      //All we need to do is mark the extension's status as disabled.
      chrome.storage.local.set({
        state: false,
        pageLog : []
      });
    } else if (result.state == false) {
      //User currently has the extension disabled.
      clearActiveState();
    } else if (result.state == true) {
      //User currently has the extension enabled - make sure the interface is up to date.
      restoreActiveState();
    }
  });
});


/***************************************
MESSAGING FROM CONTENT SCRIPTS
***************************************/

chrome.runtime.onMessage.addListener((msg, sender) => {
  
  console.log('Background message received:');
  
  // First, validate the message's structure.
  if ((msg.from === 'content') && (msg.subject === 'showPageAction')) {
    // Enable the page-action for the requesting tab.
    chrome.pageAction.show(sender.tab.id);
  }
  
  if ((msg.from === 'content') && (msg.subject === 'changeExtensionIcon')) {
    console.log("Tab ID: " + sender.tab.id + " | Mode: " + msg.mode);
    if (msg.mode) {
      chrome.pageAction.setIcon({ tabId: sender.tab.id, path : 'images/icon-green-128.png' }, () => {});
    } else {
      chrome.pageAction.setIcon({ tabId: sender.tab.id, path : 'images/icon-grey-128.png' }, () => {});
    }
  }

  if ((msg.from === 'content') && (msg.subject === 'analysePageData')) {
    let data = msg.data;
    if (!data.GAClientID) {
      console.log('Background: GA ID value does not exist in page data');
      chrome.pageAction.setIcon({ tabId: sender.tab.id, path : 'images/icon-red-128.png' }, () => {});
    } else {
      if (data.GAClientID.length <= 0) {
      console.log('Background: GA ID value was not found in page data / cookies');
        chrome.pageAction.setIcon({ tabId: sender.tab.id, path : 'images/icon-red-128.png' }, () => {});
      }
    }
  }
  
  
});