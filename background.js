/***************************************
INSTALLATION AND UPDATE DETECTION
***************************************/

/*
   Listen for installation related events. This either comes from installing
   via the Chrome app store, or from loading an unpacked extension via the
   chrome://extensions page. Note that refreshing an unpacked extension will
   count as an 'update' status rather than a new installation.
 */
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install') {
		//New installation - open a new tab to our help guide.
		console.log('This is a first install!')
		chrome.tabs.create({ url: 'https://www.littledata.io/' }, function(
			tab
		) {
			console.log('Opened help guide on https://www.littledata.io/')
		})
	} else if (details.reason === 'update') {
		//Version update, just drop a note in the console for now..
		const thisVersion = chrome.runtime.getManifest().version
		console.log(
			`Updated from ${details.previousVersion} to ${thisVersion}!`
		)
	}
})

/***************************************
PAGE ACTION STATE MANAGEMENT
***************************************/

function enableExtension(sender) {
	//Initialise the error log as the UI depends on its presence
	chrome.storage.local.set({ errorLog: JSON.stringify([]) })

	//Turn on the extension
	setIconStateEnabled(sender.tab.id)
}

function disableExtension(sender) {
	//Turn off the extension
	setIconStateDisabled(sender.tab.id)
	clearLocalStorageContent()
}

function clearLocalStorageContent() {
	//Clear local storage
	chrome.storage.local.clear(function() {
		const error = chrome.runtime.lastError
		if (error) console.error(error)
	})

	//As this happens on disabling the extension, reset the state value:
	chrome.storage.local.set({ state: false })
}

function resetLocalStorageContent() {
	//reset local storage
	chrome.storage.local.clear()
	chrome.storage.local.set({ state: true })
	//and reload the page
	chrome.tabs.getSelected(null, function(tab) {
		const code = 'window.location.reload();'
		chrome.tabs.executeScript(tab.id, { code })
	})
}

function setIconStateEnabled(tab) {
	chrome.pageAction.setIcon(
		{ tabId: tab, path: 'images/icon-green-128.png' },
		() => {}
	)
}

function setIconStateDisabled(tab) {
	chrome.pageAction.setIcon(
		{ tabId: tab, path: 'images/icon-grey-128.png' },
		() => {}
	)
}

function setIconStateError(tab) {
	chrome.pageAction.setIcon(
		{ tabId: tab, path: 'images/icon-red-128.png' },
		() => {}
	)
}

/***************************************
VALIDATING PAGE DATA
***************************************/

function analyseLogData(tabID) {
	let pageLog = []
	const errorLog = []
	chrome.storage.local.get('pageLog', function(result) {
		pageLog = JSON.parse(result.pageLog)
		if (pageLog.length > 0) {
			if (pageLog.length === 1) {
				const errors = analysePage(pageLog[0], tabID, false)
				errorLog.push(errors)
				chrome.storage.local.set({ errorLog: JSON.stringify(errorLog) })
			} else {
				analyseAllPages(pageLog, tabID)
			}
		}
	})
}

function analysePage(page, tabID, bIsJourneyStart, index = 0) {
	const prefix = bIsJourneyStart ? 'Start URL: ' : 'URL: '
	let bPageErrors = false
	const errors = {
		step: index,
		url: page.href,
		messages: [],
	}

	const clientLen =
		typeof page.ClientID === 'string' ? page.ClientID.length : 0
	const cookieLen =
		typeof page.CookieID === 'string' ? page.CookieID.length : 0
	const cartJSLen =
		typeof page.CartClientID === 'string' ? page.CartClientID.length : 0

	//CHECK 1 : Is the LittledataLayer missing?
	if (!page.Littledata.hasLittledataLayer) {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE01',
			message: 'LittledataLayer object is missing.',
		})
	}

	//CHECK 2 : Is the Littledata Tracking Tag missing?
	if (!page.Littledata.hasTrackingTag) {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE02',
			message: 'Littledata Tracking Tag is missing.',
		})
	}

	//CHECK 3 : Is one of our scripts active?
	if (
		!(
			page.Littledata.hasGATrackerJS ||
			page.Littledata.hasSegmentTrackerJS ||
			page.Littledata.hasCarthookTrackerJS
		)
	) {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE03',
			message: 'Littledata Tracking JS is missing.',
		})
	}

	//CHECK 4 : Is the app version out of date?
	if (page.Littledata.version !== 'v8.4') {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE04',
			message: `Littledata app version is out of date (${page.Littledata.version}).`,
		})
	}

	//CHECK 5 : Is the Client ID missing?
	if (clientLen <= 0) {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE05',
			message: 'Missing Client ID from Global GA tracker.',
		})
	}

	//CHECK 6 : Is the Cookie ID missing?
	if (cookieLen <= 0) {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE06',
			message: 'Missing Client ID from _ga cookie.',
		})
	}

	//CHECK 7 : Is the Client ID missing from the Cart data?
	if (cartJSLen <= 0) {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE07',
			message: 'Missing Client ID from cart.js data.',
		})
	}

	//CHECK 8 : Do any of the client IDs have mismatches?
	if (clientLen > 0 && cookieLen > 0) {
		if (page.ClientID !== page.CookieID) {
			bPageErrors = true
			errors.messages.push({
				code: 'LDE08A',
				message: 'Client ID does not match _ga Cookie ID.',
			})
		}
	}

	if (clientLen > 0 && cartJSLen > 0) {
		if (page.ClientID !== page.CartClientID) {
			bPageErrors = true
			errors.messages.push({
				code: 'LDE08B',
				message: 'Client ID does not match cart.js ID.',
			})
		}
	}

	if (cartJSLen > 0 && cookieLen > 0) {
		if (page.CartClientID !== page.CookieID) {
			bPageErrors = true
			errors.messages.push({
				code: 'LDE08C',
				message: '_ga Cookie ID does not match cart.js ID.',
			})
		}
	}

	//CHECK 9 : Missing GA Tracking ID
	if (
		page.Littledata.webPropertyID === undefined ||
		page.Littledata.webPropertyID === ''
	) {
		bPageErrors = true
		errors.messages.push({
			code: 'LDE09B',
			message:
				'Littledata GA Web Property ID (e.g.: UA-XXXXXX-X) could not be read.',
		})
	}

	//If any errors were encountered, update the Page Action to the red warning icon
	if (bPageErrors) {
		setIconStateError(tabID)
	}

	return errors
}

function analyseAllPages(pageLog, tabID) {
	let bPageErrors = false
	const firstPage = pageLog[0]
	const errorLog = []

	for (let i = 0; i < pageLog.length; i++) {
		//Retrieve page info and run its self-contained checks first
		page = pageLog[i]
		const errors = analysePage(page, tabID, i === 0, i)

		//Compare all pages after the first to check the values haven't changed
		if (i > 0) {
			//COMPARE CHECK 1 : Do the Client IDs match?
			if (page.ClientID !== firstPage.ClientID) {
				bPageErrors = true
				errors.messages.push({
					code: 'LDV01',
					message: `Page Client ID does not match Client ID of first step (Current: ${page.ClientID} | First: ${firstPage.ClientID}).`,
				})
			}
		}

		errorLog.push(errors)
	}

	//Store our log data, this contains step info for the UI, even if there aren't any issues
	chrome.storage.local.set({ errorLog: JSON.stringify(errorLog) })

	//On-page Errors are picked up in analysePage, but if our compare checks found any more, update the Page Action
	if (bPageErrors) {
		setIconStateError(tabID)
	}
}

/***************************************
MESSAGING FROM CONTENT SCRIPTS
***************************************/

chrome.runtime.onMessage.addListener((msg, sender) => {
	// First, validate the message's structure.
	if (msg.from === 'content' && msg.subject === 'showPageAction') {
		// Enable the page-action for the requesting tab.
		chrome.pageAction.show(sender.tab.id)
	}

	//Clicking the Extension's Page Action
	if (msg.from === 'popup' && msg.subject === 'pageActionClicked') {
		//Just in case we need it later...
		console.log('Page action clicked.')
		chrome.storage.local.get('errorLog', function(result) {
			console.log('Sending log to popup.')
			chrome.runtime.sendMessage({
				from: 'background',
				subject: 'updateContent',
				data: result.errorLog,
			})
		})
	}

	//Clicking the Extension's Reset Button
	if (msg.from === 'popup' && msg.subject === 'pageResetClicked') {
		console.log('Page reset clicked.')
		resetLocalStorageContent()
	}

	//Turning the extension on and off
	if (msg.from === 'content' && msg.subject === 'changeExtensionIcon') {
		console.log(`Mode: ${msg.mode}`)

		if (msg.mode) {
			enableExtension(sender)
		} else {
			disableExtension(sender)
		}
	}

	if (msg.from === 'content' && msg.subject === 'savePageLogData') {
		chrome.storage.local.set({ pageLog: msg.data })
		analyseLogData(sender.tab.id)
	}
})
