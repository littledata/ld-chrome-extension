chrome.runtime.sendMessage({ from: 'content', subject: 'showPageAction' });

/**************************************************
 * PAGE ACTION AND LOCAL STORAGE STATE MANAGEMENT *
 **************************************************/

// Remember: The actions handled here happen during / on an actual page load
// and NOT by turning the extension on and off. That stuff happens in background.js!

/*************
 * MESSAGING *
 *************/

// Listen for messages from the popup.
chrome.runtime.onMessage.addListener((msg, _sender, response) => {
	//Extension enabled / disabled toggle
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
