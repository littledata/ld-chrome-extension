chrome.runtime.sendMessage({ from: 'content', subject: 'showPageAction' });

/**************************************************
 * PAGE ACTION AND LOCAL STORAGE STATE MANAGEMENT *
 **************************************************/

//the actions to do for each states
function clearActiveState() {
  console.log('Clearing active Littledata Debug state');
  //Do what you want for the state 0
   chrome.runtime.sendMessage({ from: 'content', subject: 'changeExtensionIcon', mode: false });
}

function restoreActiveState() {
  console.log('Restoring active Littledata Debug state');
   chrome.runtime.sendMessage({ from: 'content', subject: 'changeExtensionIcon', mode: true });
   chrome.runtime.sendMessage({ from: 'content', subject: 'analysePageData', data: pageData });
}

function beginActiveState() {
  console.log('Initialising active Littledata Debug state');
}

chrome.storage.local.onChanged.addListener(function(changes, areaName) {
  if(areaName != "local" || changes.state == null) return;
  switch(changes.state) {
    case false : clearActiveState(); break;
    case true : beginActiveState(); break;
  }
});

chrome.storage.local.get('state', function(result){
  if(result.state == null) clearActiveState();
  else if (result.state == false) clearActiveState();
  else if (result.state == true) restoreActiveState();
});

/*************
 * MESSAGING *
 *************/

// Listen for messages from the popup.
chrome.runtime.onMessage.addListener((msg, sender, response) => {

  //Extension on / off
  if ((msg.from === 'popup') && (msg.subject === 'EnableExtension')) {
    chrome.runtime.sendMessage({ from: 'content', subject: 'changeExtensionIcon', mode: msg.mode });
    var statusInfo = {
      statusText : msg.mode ? 'enabled' : 'disabled'
    };
    response(statusInfo);
  } 
  

});