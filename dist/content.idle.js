"use strict";
chrome.runtime.sendMessage({ from: 'content', subject: 'showPageAction' });
chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (msg.from === 'popup' && msg.subject === 'EnableExtension') {
        chrome.runtime.sendMessage({
            from: 'content',
            subject: 'changeExtensionIcon',
            mode: msg.mode,
        });
        const statusInfo = { statusText: msg.mode ? 'enabled' : 'disabled' };
        response(statusInfo);
    }
});
