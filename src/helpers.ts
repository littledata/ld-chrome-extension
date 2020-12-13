const storageSet = chrome.storage.local.set;
const storageGet = chrome.storage.local.get;
const storageClear = chrome.storage.local.clear;
const sendMsg = chrome.runtime.sendMessage;
const chromeTabs = chrome.tabs;
const chromePage = chrome.pageAction;

// for backend

export function enableExtension(sender) {
	//Initialise the error log as the UI depends on its presence
	storageSet({ errorLog: JSON.stringify([]) });

	//Turn on the extension
	setIconStateEnabled(sender.tab.id);
}

export function disableExtension(sender) {
	//Turn off the extension
	setIconStateDisabled(sender.tab.id);
	clearLocalStorageContent();
}

function clearLocalStorageContent() {
	//Clear local storage
	storageClear(function() {});

	//As this happens on disabling the extension, reset the state value:
	storageSet({ state: false });
}

export function resetLocalStorageContent() {
	//reset local storage
	storageClear();
	storageSet({ state: true });
	//and reload the page
	chromeTabs.getSelected(null, function(tab) {
		const code = 'window.location.reload();';
		chromeTabs.executeScript(tab.id, { code });
	});
}

function setIconStateEnabled(tab) {
	chromePage.setIcon(
		{ tabId: tab, path: 'images/icon-green-128.png' },
		() => {}
	);
}

function setIconStateDisabled(tab) {
	chromePage.setIcon(
		{ tabId: tab, path: 'images/icon-grey-128.png' },
		() => {}
	);
}

function setIconStateError(tab) {
	chromePage.setIcon(
		{ tabId: tab, path: 'images/icon-red-128.png' },
		() => {}
	);
}

// for content

//Page render with extension active state == false
export function initDisabledState() {
	sendMsg({
		from: 'content',
		subject: 'changeExtensionIcon',
		mode: false,
	});
}

//Page render with extension active state == true
export function initActiveState() {
	sendMsg({
		from: 'content',
		subject: 'changeExtensionIcon',
		mode: true,
	});
}

export function initPageDataContentListener() {
	let pageLog = [];
	chrome.storage.local.get('pageLog', function(result) {
		if (result.pageLog) pageLog = JSON.parse(result.pageLog);
	});

	window.addEventListener(
		'setLittledataPageData',
		function(data) {
			pageLog.push(data.detail); //add current page's data to the log
			chrome.runtime.sendMessage({
				from: 'content',
				subject: 'savePageLogData',
				data: JSON.stringify(pageLog),
			});
		},
		false
	);
}
