/****************************
 * CONTENT SCRIPT INJECTION *
 ****************************/

/*
  Note: This script will run BEFORE content.idle.js and exists because we do not
  have access to a page's JS variables directly from a content script, so we have
  to inject some code onto the active tab's page and do all the gathering work here.
  Values defined or populated via this script are available for content.idle.js to read and edit, though.
 */
 
console.log('running content.start.js');
var pageCheckData = {};

chrome.storage.local.get('state', function(result){
  //Only execute script is extension is enabled on the page:
  if(result.state) {
    //Initialise page data object
    pageCheckData = {
      GAClientID : '',
      hash : location.hash,
      hasGAClientID : false,
      hasLittledataLayer : false,
      https : (location.protocol == 'https:') ? true : false,
      host : location.host,
      jsCrawlCompleted : false,
      path : location.pathname,
      query : location.search
    };
    
    injectContentScriptJS();
    initPageDataContentListener();
  }
});

function injectContentScriptJS() {
  let injectCode = `
    function getNamedCookieValue(cookieName) {
      let value = "; " + document.cookie;
      let parts = value.split("; " + cookieName + "=");
      if (parts.length == 2) return parts.pop().split(";").shift();
    }

    document.addEventListener(
      "DOMContentLoaded",
      function(event) {
        
        let hasLD = false;
        let hasGA = false;
        let gaid = '';
        
        //Check for LittledataLayer object
        if (typeof(window.LittledataLayer) === "undefined") {
          console.log('LittledataLayer was not detected on the page.');
        } else {
          console.log('LittledataLayer was detected on the page.');
          hasLD = true;
        }
          
        if (typeof(window.ga) === 'undefined') {
          let gaCookieID = getNamedCookieValue('_ga');
          if (gaCookieID) {
            console.log('Retreived GA ID from _ga Cookie.');
            gaid = gaCookieID;
          } else {
            console.log('Google Analytics could not be detected on the page.');
          }
        } else {
          try {
            console.log('GA Client ID retrieved.');
            hasGA = true;
            gaid = ga.getAll()[0].get('clientId');
          } catch(err) {
            console.log('GA Client ID could not be retrieved.');
          }
        }
        
        window.dispatchEvent(new CustomEvent("setLittledataPageData", {
          detail: {
            jsCrawlCompleted : true,
            hasLittledataLayer : hasLD,
            hasGAClientID : hasGA,
            GAClientID : gaid
          }
        }));
        
      }
    );
  `

  const script = document.createElement('script')
  script.textContent = injectCode;
  document.documentElement.appendChild(script)
  script.parentNode.removeChild(script)  
}

function assignCurrentPageDataToLocalStorage(data) {
  chrome.storage.local.set({ currentPageData : data });
}

function initPageDataContentListener() {
  window.addEventListener("setLittledataPageData", function(data) {
    //Assign all received values back into pageCheckData
    pageCheckData.jsCrawlCompleted = data.detail.jsCrawlCompleted;
    pageCheckData.hasLittledataLayer = data.detail.hasLittledataLayer;
    pageCheckData.hasGAClientID = data.detail.hasGAClientID,
    pageCheckData.GAClientID = data.detail.GAClientID
    //Update the page data in local storage
    assignCurrentPageDataToLocalStorage(pageCheckData);
  }, false);
}