(()=>{"use strict";var e={601:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.SCRIPT_VERSION=void 0,t.SCRIPT_VERSION="14.1.0"}},t={};function s(a){var o=t[a];if(void 0!==o)return o.exports;var r=t[a]={exports:{}};return e[a](r,r.exports,s),r.exports}(()=>{const e=s(601),t=e=>{chrome.pageAction.setIcon({tabId:e,path:"images/icon-red-128.png"})},a=(s,a,o,r=0)=>{let i=!1;const n={step:r,url:s.href,messages:[]},c="string"==typeof s.ClientID?s.ClientID.length:0,g="string"==typeof s.CookieID?s.CookieID.length:0,l="string"==typeof s.CartClientID?s.CartClientID.length:0;return s.Littledata.hasLittledataLayer||(i=!0,n.messages.push({code:"LDE01",message:"LittledataLayer object is missing."})),s.Littledata.hasTrackingTag||(i=!0,n.messages.push({code:"LDE02",message:"Littledata Tracking Tag is missing."})),s.Littledata.hasGATrackerJS||s.Littledata.hasSegmentTrackerJS||s.Littledata.hasCarthookTrackerJS||s.Littledata.hasLDBundle||(i=!0,n.messages.push({code:"LDE03",message:"Littledata Tracking JS is missing."})),s.Littledata.scriptVersion!==e.SCRIPT_VERSION&&(i=!0,n.messages.push({code:"LDE04",message:`Littledata app version is out of date (${s.Littledata.version}).`})),c<=0&&(i=!0,n.messages.push({code:"LDE05",message:"Missing Client ID from Global GA tracker."})),g<=0&&(i=!0,n.messages.push({code:"LDE06",message:"Missing Client ID from _ga cookie."})),l<=0&&(i=!0,n.messages.push({code:"LDE07",message:"Missing Client ID from cart.js data."})),c>0&&g>0&&s.ClientID!==s.CookieID&&(i=!0,n.messages.push({code:"LDE08A",message:"Client ID does not match _ga Cookie ID."})),c>0&&l>0&&s.ClientID!==s.CartClientID&&(i=!0,n.messages.push({code:"LDE08B",message:"Client ID does not match cart.js ID."})),l>0&&g>0&&s.CartClientID!==s.CookieID&&(i=!0,n.messages.push({code:"LDE08C",message:"_ga Cookie ID does not match cart.js ID."})),void 0!==s.Littledata.webPropertyID&&""!==s.Littledata.webPropertyID||(i=!0,n.messages.push({code:"LDE09B",message:"Littledata GA Web Property ID (e.g.: UA-XXXXXX-X) could not be read."})),i&&t(a),n};chrome.runtime.onMessage.addListener(((e,s)=>{var o;console.debug(e),"content"===e.from?"showPageAction"===e.subject?s.tab&&s.tab.id&&chrome.pageAction.show(s.tab.id):"savePageLogData"===e.subject?(chrome.storage.local.set({pageLog:e.data}),s.tab&&s.tab.id&&(e=>{let s=[];const o=[];chrome.storage.local.get("pageLog",(r=>{if(s=JSON.parse(r.pageLog),s.length>0)if(1===s.length){const t=a(s[0],e);o.push(t),chrome.storage.local.set({errorLog:JSON.stringify(o)})}else((e,s)=>{let o=!1;const r=e[0],i=[];for(let t=0;t<e.length;t++){const n=e[t],c=a(n,s,0,t);t>0&&n.ClientID!==r.ClientID&&(o=!0,c.messages.push({code:"LDV01",message:`Page Client ID does not match Client ID of first step (Current: ${n.ClientID} | First: ${r.ClientID}).`})),i.push(c)}chrome.storage.local.set({errorLog:JSON.stringify(i)}),o&&t(s)})(s,e)}))})(null===(o=s.tab)||void 0===o?void 0:o.id)):"changeExtensionIcon"===e.subject&&(e.mode?(e=>{var t,s;(null===(t=e.tab)||void 0===t?void 0:t.id)&&(chrome.storage.local.set({errorLog:JSON.stringify([])}),s=e.tab.id,chrome.pageAction.setIcon({tabId:s,path:"images/icon-green-128.png"}))})(s):(e=>{var t,s;(null===(t=e.tab)||void 0===t?void 0:t.id)&&(s=e.tab.id,chrome.pageAction.setIcon({tabId:s,path:"images/icon-grey-128.png"}),chrome.storage.local.clear(),chrome.storage.local.set({state:!1}))})(s)):"popup"===e.from&&("pageActionClicked"===e.subject?chrome.storage.local.get("errorLog",(function(e){chrome.runtime.sendMessage({from:"background",subject:"updateContent",data:e.errorLog})})):"pageResetClicked"===e.subject&&(chrome.storage.local.clear(),chrome.storage.local.set({state:!0}),chrome.tabs.query({active:!0,currentWindow:!0},(()=>{chrome.tabs.executeScript({code:"window.location.reload();"})}))))}))})()})();