"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
function analyseLogData(tabID) {
    let pageLog = [];
    const errorLog = [];
    chrome.storage.local.get('pageLog', function (result) {
        pageLog = JSON.parse(result.pageLog);
        if (pageLog.length > 0) {
            if (pageLog.length === 1) {
                const errors = analysePage(pageLog[0], tabID, false);
                errorLog.push(errors);
                chrome.storage.local.set({
                    errorLog: JSON.stringify(errorLog),
                });
            }
            else {
                analyseAllPages(pageLog, tabID);
            }
        }
    });
}
function analysePage(page, tabID, bIsJourneyStart, index = 0) {
    let bPageErrors = false;
    const errors = {
        step: index,
        url: page.href,
        messages: [],
    };
    const clientLen = typeof page.ClientID === 'string' ? page.ClientID.length : 0;
    const cookieLen = typeof page.CookieID === 'string' ? page.CookieID.length : 0;
    const cartJSLen = typeof page.CartClientID === 'string' ? page.CartClientID.length : 0;
    if (!page.Littledata.hasLittledataLayer) {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE01',
            message: 'LittledataLayer object is missing.',
        });
    }
    if (!page.Littledata.hasTrackingTag) {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE02',
            message: 'Littledata Tracking Tag is missing.',
        });
    }
    if (!(page.Littledata.hasGATrackerJS ||
        page.Littledata.hasSegmentTrackerJS ||
        page.Littledata.hasCarthookTrackerJS)) {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE03',
            message: 'Littledata Tracking JS is missing.',
        });
    }
    if (page.Littledata.version !== 'v8.4') {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE04',
            message: `Littledata app version is out of date (${page.Littledata.version}).`,
        });
    }
    if (clientLen <= 0) {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE05',
            message: 'Missing Client ID from Global GA tracker.',
        });
    }
    if (cookieLen <= 0) {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE06',
            message: 'Missing Client ID from _ga cookie.',
        });
    }
    if (cartJSLen <= 0) {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE07',
            message: 'Missing Client ID from cart.js data.',
        });
    }
    if (clientLen > 0 && cookieLen > 0) {
        if (page.ClientID !== page.CookieID) {
            bPageErrors = true;
            errors.messages.push({
                code: 'LDE08A',
                message: 'Client ID does not match _ga Cookie ID.',
            });
        }
    }
    if (clientLen > 0 && cartJSLen > 0) {
        if (page.ClientID !== page.CartClientID) {
            bPageErrors = true;
            errors.messages.push({
                code: 'LDE08B',
                message: 'Client ID does not match cart.js ID.',
            });
        }
    }
    if (cartJSLen > 0 && cookieLen > 0) {
        if (page.CartClientID !== page.CookieID) {
            bPageErrors = true;
            errors.messages.push({
                code: 'LDE08C',
                message: '_ga Cookie ID does not match cart.js ID.',
            });
        }
    }
    if (page.Littledata.webPropertyID === undefined ||
        page.Littledata.webPropertyID === '') {
        bPageErrors = true;
        errors.messages.push({
            code: 'LDE09B',
            message: 'Littledata GA Web Property ID (e.g.: UA-XXXXXX-X) could not be read.',
        });
    }
    if (bPageErrors) {
        setIconStateError(tabID);
    }
    return errors;
}
function analyseAllPages(pageLog, tabID) {
    let bPageErrors = false;
    const firstPage = pageLog[0];
    const errorLog = [];
    for (let i = 0; i < pageLog.length; i++) {
        page = pageLog[i];
        const errors = analysePage(page, tabID, i === 0, i);
        if (i > 0) {
            if (page.ClientID !== firstPage.ClientID) {
                bPageErrors = true;
                errors.messages.push({
                    code: 'LDV01',
                    message: `Page Client ID does not match Client ID of first step (Current: ${page.ClientID} | First: ${firstPage.ClientID}).`,
                });
            }
        }
        errorLog.push(errors);
    }
    chrome.storage.local.set({ errorLog: JSON.stringify(errorLog) });
    if (bPageErrors) {
        setIconStateError(tabID);
    }
}
chrome.runtime.onMessage.addListener((msg, sender) => {
    console.debug(msg);
    if (msg.from === 'content' && msg.subject === 'showPageAction') {
        chrome.pageAction.show(sender.tab.id);
    }
    if (msg.from === 'popup' && msg.subject === 'pageActionClicked') {
        chrome.storage.local.get('errorLog', function (result) {
            chrome.runtime.sendMessage({
                from: 'background',
                subject: 'updateContent',
                data: result.errorLog,
            });
        });
    }
    if (msg.from === 'popup' && msg.subject === 'pageResetClicked') {
        helpers_1.resetLocalStorageContent();
    }
    if (msg.from === 'content' && msg.subject === 'changeExtensionIcon') {
        if (msg.mode) {
            helpers_1.enableExtension(sender);
        }
        else {
            helpers_1.disableExtension(sender);
        }
    }
    if (msg.from === 'content' && msg.subject === 'savePageLogData') {
        chrome.storage.local.set({ pageLog: msg.data });
        analyseLogData(sender.tab.id);
    }
});
