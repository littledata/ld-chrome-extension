"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
const injectedScript_1 = require("./injectedScript");
chrome.storage.local.get('state', function (result) {
    if (result.state === null) {
        helpers_1.initDisabledState();
    }
    else if (result.state === false) {
        helpers_1.initDisabledState();
    }
    if (result.state === true) {
        helpers_1.initActiveState();
        injectContentScriptJS();
        helpers_1.initPageDataContentListener();
    }
});
function injectContentScriptJS() {
    const injectCode = `(${injectedScript_1.frontendScript})();`;
    const script = document.createElement('script');
    script.textContent = injectCode;
    document.documentElement.appendChild(script);
    script.parentNode.removeChild(script);
}
