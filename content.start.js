/****************************
 * CONTENT SCRIPT INJECTION *
 ****************************/

/*
  Note: This script will run BEFORE content.idle.js and exists because we do not
  have access to a page's JS variables directly from a content script, so we have
  to inject some code onto the active tab's page and do all the gathering work here.
  Values defined or populated via this script are available for content.idle.js to read and edit, though.
 */

chrome.storage.local.get('state', function(result){
  if(result.state == null) {
    initDisabledState();
  } else if (result.state == false) {
    initDisabledState();
  } if(result.state == true) {
    initActiveState();
    injectContentScriptJS();
    initPageDataContentListener();
  }
});
 
//Page render with extension active state == false
function initDisabledState() {
   chrome.runtime.sendMessage({ from: 'content', subject: 'changeExtensionIcon', mode: false });
}

//Page render with extension active state == true
function initActiveState() {
   chrome.runtime.sendMessage({ from: 'content', subject: 'changeExtensionIcon', mode: true });
}

function injectContentScriptJS() {
  let injectCode = `
    function getLittlebugPageData() {

      //OUTPUT OBJECT
      var data = {
        href : window.location.href || '',
        Littledata : {
          hasLittledataLayer : false,
          hasTrackingTag : false,
          hasGATrackerJS : false,
          hasSegmentTrackerJS : false,
          hasCarthookTrackerJS : false,
          version : '',
          webPropertyID : ''
        },
        CookieID : '',
        ClientID : '',
        CartClientID : '',
        Scripts  : {
          classic : false,
          universal : false,
          doubleclick : false,
          gtag : false,
          gtm : false
        }
      };
      
      //What scripts are on this page?
      let scripts = document.getElementsByTagName('script');
      let rgxGA = /www\\.google-analytics\\.com\\/ga\\.js/;
      let rgxUA = /www\\.google-analytics\\.com\\/analytics\\.js/;
      let rgxDC = /stats\\.g\.doubleclick\\.net\\/dc\\.js/;
      let rgxGT = /www\\.googletagmanager\\.com\\/gtag\\/js/;
      let rgxTM = /www\\.googletagmanager\\.com\\/gtm\\.js/;
      let rgxLDC = /cdn\\.jsdelivr\\.net\\/gh\\/littledata\\/shopify-tracker\\/dist\\/carthookTracker\\.js/;
      let rgxLDG = /cdn\\.jsdelivr\\.net\\/gh\\/littledata\\/shopify-tracker\\/dist\\/gaTracker\\.js/;
      let rgxLDS = /cdn\\.jsdelivr\\.net\\/gh\\/littledata\\/shopify-tracker\\/dist\\/segmentTracker\\.js/;

      for (var i = 0, len = scripts.length; i < len; i++) {
        if (rgxGA.test(scripts[i].src)) data.Scripts.classic = true;
        if (rgxUA.test(scripts[i].src)) data.Scripts.universal = true;
        if (rgxDC.test(scripts[i].src)) data.Scripts.doubleclick = true;
        if (rgxGT.test(scripts[i].src)) data.Scripts.gtag = true;
        if (rgxTM.test(scripts[i].src)) data.Scripts.gtm = true;
        if (rgxLDC.test(scripts[i].src)) data.Littledata.hasCarthookTrackerJS = true;
        if (rgxLDG.test(scripts[i].src)) data.Littledata.hasGATrackerJS = true;
        if (rgxLDS.test(scripts[i].src)) data.Littledata.hasSegmentTrackerJS = true;
      }

      //What version of LD script is running and to what property?
      if(window.LittledataLayer) {
        data.Littledata.hasLittledataLayer = true;
        data.Littledata.version = window.LittledataLayer.version;
        data.Littledata.webPropertyID = window.LittledataLayer.webPropertyID;
      }
      
      try {
        let rgxTagVersion = /\\/[\\/\\*]\\s*Version\\s+(v?\\d+\.\\d+(?:\\.\\d+){0,2})/gi;
        let rgxTagProperty = /UA\\-[0-9]+\\-[0-9]+/

        let ldTagElem = document.querySelector('[name="littledata-tracking-tag"');
        if (ldTagElem) {
          data.Littledata.hasTrackingTag = true;
          var src = ldTagElem.text;
          
          if (data.Littledata.version === '') {
            //Get version number
            let v = rgxTagVersion.exec(src);
            if (v && v[1]) data.Littledata.version = v[1];
          }

          if (data.Littledata.webPropertyID === '') {
            //Get web property ID
            let p = rgxTagProperty.exec(src);
            if (p) data.Littledata.webPropertyID = p[0];
          }
        } else {
          console.log('Could not find LD tag');
        }
      } catch(e) {}

      //Get Client ID from _ga Cookie
      try {
        let Cookie = "; " + document.cookie;
        let parts = Cookie.split("; _ga=");
        if (parts.length == 2) {
          let CookieText = parts.pop().split(';').shift();
          let CookieValues = CookieText.split('.');
          if (CookieValues.length == 4)
            data.CookieID = CookieValues[2] + '.' + CookieValues[3];
        }
      } catch(e) {}
      
      //Get Client ID ga global object
      try {
        data.ClientID = ga.getAll()[0].get('clientId');
      } catch(e) {}
      
      
      //Get Client ID from Cart data
      
      // *** ISSUE ***: This doesn't seem to be saving to the log in local storage, perhaps a sync issue with when it's saved vs the ajax call?
      
      try {
        let xhr = new XMLHttpRequest();
        let googleClientID;
        xhr.open('GET', '/cart.js', false);

        xhr.onreadystatechange = function (oEvent) {
          if (xhr.readyState === 4) {
            //Ignore 404s etc. so we don't get console error messages showing up
            if (xhr.status === 200) {
              if (xhr.responseText) {
                var cartData = JSON.parse(xhr.responseText);
                if (cartData && cartData.attributes) {
                  googleClientID = cartData.attributes['google-clientID'];
                  if (googleClientID) {
                    data.CartClientID = googleClientID;
                    console.log('CCID in v8');
                  } else {
                    //fallback for older versions
                    googleClientID = cartData.attributes['clientID'];
                    if (googleClientID) {
                      data.CartClientID = googleClientID;
                      console.log('CCID in legacy');
                    }
                  }
                }
              }
            }
          }
        };
        xhr.send();
      } catch(err) {
        console.error("Littlebug XHR error: ",err.message);
      }
      
      return data;
    }

    document.addEventListener(
      "DOMContentLoaded",
      function(event) {
        var data = getLittlebugPageData();
        window.dispatchEvent(new CustomEvent("setLittledataPageData", {
          detail: data
        }));
      }
    );
  `

  const script = document.createElement('script')
  script.textContent = injectCode;
  document.documentElement.appendChild(script)
  script.parentNode.removeChild(script)  
}

function initPageDataContentListener() {
  let pageLog = [];
  chrome.storage.local.get('pageLog', function(result) { pageLog = JSON.parse(result.pageLog); });
  
  window.addEventListener("setLittledataPageData", function(data) {
    pageLog.push(data.detail); //add current page's data to the log
    chrome.runtime.sendMessage({ from: 'content', subject: 'savePageLogData', data: JSON.stringify(pageLog) });
  }, false);
}