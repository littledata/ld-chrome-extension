/***************************************
INSTALLATION AND UPDATE DETECTION
***************************************/

/*
   Listen for installation related events. This either comes from installing
   via the Chrome app store, or from loading an unpacked extension via the
   chrome://extensions page. Note that refreshing an unpacked extension will
   count as an 'update' status rather than a new installation.
 */
/*chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install') {
		//New installation - open a new tab to our help guide.
		chrome.tabs.create({ url: 'https://www.littledata.io/' }, function(
			tab
		) {})
	} else if (details.reason === 'update') {
		//Version update, just drop a note in the console for now..
		const thisVersion = chrome.runtime.getManifest().version
	}
})
*/
/***************************************
PAGE ACTION STATE MANAGEMENT
***************************************/

const enableExtension = (sender: chrome.runtime.MessageSender) => {
	if (!sender.tab?.id) return;
	//Initialise the error log as the UI depends on its presence
	chrome.storage.local.set({ errorLog: JSON.stringify([]) });

	//Turn on the extension
	setIconStateEnabled(sender.tab.id);
};

const disableExtension = (sender: chrome.runtime.MessageSender) => {
	if (!sender.tab?.id) return;
	//Turn off the extension
	setIconStateDisabled(sender.tab.id);
	clearLocalStorageContent();
};

const clearLocalStorageContent = () => {
	//Clear local storage
	chrome.storage.local.clear();

	//As this happens on disabling the extension, reset the state value:
	chrome.storage.local.set({ state: false });
};

const resetLocalStorageContent = () => {
	//reset local storage
	chrome.storage.local.clear();
	chrome.storage.local.set({ state: true });
	//and reload the page
	chrome.tabs.query({ active: true, currentWindow: true }, () => {
		const code = 'window.location.reload();';

		chrome.tabs.executeScript({ code });
	});
};

const setIconStateEnabled = (tab: number) => {
	chrome.pageAction.setIcon({ tabId: tab, path: 'images/icon-green-128.png' });
};

const setIconStateDisabled = (tab: number) => {
	chrome.pageAction.setIcon({ tabId: tab, path: 'images/icon-grey-128.png' });
};

const setIconStateError = (tab: number) => {
	chrome.pageAction.setIcon({ tabId: tab, path: 'images/icon-red-128.png' });
};

/***************************************
VALIDATING PAGE DATA
***************************************/

const analyseLogData = (tabID: number) => {
	let pageLog = [];
	const errorLog: Record<string, any>[] = [];

	chrome.storage.local.get('pageLog', (result) => {
		pageLog = JSON.parse(result.pageLog);
		if (pageLog.length > 0) {
			if (pageLog.length === 1) {
				const errors = analysePage(pageLog[0], tabID, false);

				errorLog.push(errors);
				chrome.storage.local.set({
					errorLog: JSON.stringify(errorLog),
				});
			} else {
				analyseAllPages(pageLog, tabID);
			}
		}
	});
};

const analysePage = (page: Record<string, any>, tabID: number, _bIsJourneyStart: any, index = 0) => {
	let bPageErrors = false;
	const errors: { step: number; url: string; messages: Record<string, any>[] } = {
		step: index,
		url: page.href,
		messages: [],
	};

	const clientLen = typeof page.ClientID === 'string' ? page.ClientID.length : 0;
	const cookieLen = typeof page.CookieID === 'string' ? page.CookieID.length : 0;
	const cartJSLen = typeof page.CartClientID === 'string' ? page.CartClientID.length : 0;

	//CHECK 1 : Is the LittledataLayer missing?
	if (!page.Littledata.hasLittledataLayer) {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE01',
			message: 'LittledataLayer object is missing.',
		});
	}

	//CHECK 2 : Is the Littledata Tracking Tag missing?
	if (!page.Littledata.hasTrackingTag) {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE02',
			message: 'Littledata Tracking Tag is missing.',
		});
	}

	//CHECK 3 : Is one of our scripts active?
	if (
		!(page.Littledata.hasGATrackerJS || page.Littledata.hasSegmentTrackerJS || page.Littledata.hasCarthookTrackerJS)
	) {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE03',
			message: 'Littledata Tracking JS is missing.',
		});
	}

	//CHECK 4 : Is the app version out of date?
	if (page.Littledata.version !== 'v8.4') {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE04',
			message: `Littledata app version is out of date (${page.Littledata.version}).`,
		});
	}

	//CHECK 5 : Is the Client ID missing?
	if (clientLen <= 0) {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE05',
			message: 'Missing Client ID from Global GA tracker.',
		});
	}

	//CHECK 6 : Is the Cookie ID missing?
	if (cookieLen <= 0) {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE06',
			message: 'Missing Client ID from _ga cookie.',
		});
	}

	//CHECK 7 : Is the Client ID missing from the Cart data?
	if (cartJSLen <= 0) {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE07',
			message: 'Missing Client ID from cart.js data.',
		});
	}

	//CHECK 8 : Do any of the client IDs have mismatches?
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

	//CHECK 9 : Missing GA Tracking ID
	if (page.Littledata.webPropertyID === undefined || page.Littledata.webPropertyID === '') {
		bPageErrors = true;
		errors.messages.push({
			code: 'LDE09B',
			message: 'Littledata GA Web Property ID (e.g.: UA-XXXXXX-X) could not be read.',
		});
	}

	//If any errors were encountered, update the Page Action to the red warning icon
	if (bPageErrors) {
		setIconStateError(tabID);
	}

	return errors;
};

const analyseAllPages = (pageLog: Record<string, string>[], tabID: number) => {
	let bPageErrors = false;
	const firstPage = pageLog[0];
	const errorLog = [];

	for (let i = 0; i < pageLog.length; i++) {
		//Retrieve page info and run its self-contained checks first
		const page = pageLog[i];
		const errors = analysePage(page, tabID, i === 0, i);

		//Compare all pages after the first to check the values haven't changed
		if (i > 0) {
			//COMPARE CHECK 1 : Do the Client IDs match?
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

	//Store our log data, this contains step info for the UI, even if there aren't any issues
	chrome.storage.local.set({ errorLog: JSON.stringify(errorLog) });

	//On-page Errors are picked up in analysePage, but if our compare checks found any more, update the Page Action
	if (bPageErrors) {
		setIconStateError(tabID);
	}
};

/***************************************
MESSAGING FROM CONTENT SCRIPTS
***************************************/

chrome.runtime.onMessage.addListener((msg, sender: chrome.runtime.MessageSender) => {
	console.debug(msg);
	if (msg.from === 'content') {
		if (msg.subject === 'showPageAction') {
			// Validate the message's structure.
			if (sender.tab && sender.tab.id) chrome.pageAction.show(sender.tab.id);
		} else if (msg.subject === 'savePageLogData') {
			chrome.storage.local.set({ pageLog: msg.data });
			if (sender.tab && sender.tab.id) analyseLogData(sender.tab?.id);
		} else if (msg.subject === 'changeExtensionIcon') {
			//Turning the extension on and off
			if (msg.mode) {
				enableExtension(sender);
			} else {
				disableExtension(sender);
			}
		}
	} else if (msg.from === 'popup') {
		if (msg.subject === 'pageActionClicked') {
			//Clicking the Extension's Page Action
			chrome.storage.local.get('errorLog', function (result) {
				chrome.runtime.sendMessage({
					from: 'background',
					subject: 'updateContent',
					data: result.errorLog,
				});
			});
		} else if (msg.subject === 'pageResetClicked') {
			//Clicking the Extension's Reset Button
			resetLocalStorageContent();
		}
	}
});
