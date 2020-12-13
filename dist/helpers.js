"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPageDataContentListener = exports.initActiveState = exports.initDisabledState = exports.resetLocalStorageContent = exports.disableExtension = exports.enableExtension = void 0;
const storageSet = chrome.storage.local.set;
const storageGet = chrome.storage.local.get;
const storageClear = chrome.storage.local.clear;
const sendMsg = chrome.runtime.sendMessage;
const chromeTabs = chrome.tabs;
const chromePage = chrome.pageAction;
function enableExtension(sender) {
    storageSet({ errorLog: JSON.stringify([]) });
    setIconStateEnabled(sender.tab.id);
}
exports.enableExtension = enableExtension;
function disableExtension(sender) {
    setIconStateDisabled(sender.tab.id);
    clearLocalStorageContent();
}
exports.disableExtension = disableExtension;
function clearLocalStorageContent() {
    storageClear(function () { });
    storageSet({ state: false });
}
function resetLocalStorageContent() {
    storageClear();
    storageSet({ state: true });
    chromeTabs.getSelected(null, function (tab) {
        const code = 'window.location.reload();';
        chromeTabs.executeScript(tab.id, { code });
    });
}
exports.resetLocalStorageContent = resetLocalStorageContent;
function setIconStateEnabled(tab) {
    chromePage.setIcon({ tabId: tab, path: 'images/icon-green-128.png' }, () => { });
}
function setIconStateDisabled(tab) {
    chromePage.setIcon({ tabId: tab, path: 'images/icon-grey-128.png' }, () => { });
}
function setIconStateError(tab) {
    chromePage.setIcon({ tabId: tab, path: 'images/icon-red-128.png' }, () => { });
}
function initDisabledState() {
    sendMsg({
        from: 'content',
        subject: 'changeExtensionIcon',
        mode: false,
    });
}
exports.initDisabledState = initDisabledState;
function initActiveState() {
    sendMsg({
        from: 'content',
        subject: 'changeExtensionIcon',
        mode: true,
    });
}
exports.initActiveState = initActiveState;
function initPageDataContentListener() {
    let pageLog = [];
    chrome.storage.local.get('pageLog', function (result) {
        if (result.pageLog)
            pageLog = JSON.parse(result.pageLog);
    });
    window.addEventListener('setLittledataPageData', function (data) {
        pageLog.push(data.detail);
        chrome.runtime.sendMessage({
            from: 'content',
            subject: 'savePageLogData',
            data: JSON.stringify(pageLog),
        });
    }, false);
}
exports.initPageDataContentListener = initPageDataContentListener;
