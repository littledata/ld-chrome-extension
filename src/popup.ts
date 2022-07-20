let enabled = false; //disabled by default
const checkboxExtensionEnabled = document.getElementById('toggle-ext-active');
const resetBtn = document.getElementById('reset-log');
const outputLog = document.querySelector('#output-log');

document.addEventListener('DOMContentLoaded', () => {
	chrome.runtime.sendMessage({ from: 'popup', subject: 'pageActionClicked' });
	const extVer = chrome.runtime.getManifest().version;
	const verElem = document.getElementById('ext-ver');

	if (verElem) verElem.textContent = `v${extVer}`;
});

resetBtn?.addEventListener('click', () => {
	chrome.runtime.sendMessage({ from: 'popup', subject: 'pageResetClicked' });

	if (outputLog) outputLog.innerHTML = '<p class="font-italic text-info">Log is cleared</p>';
});

chrome.runtime.onMessage.addListener((msg) => {
	if (msg.from === 'background' && msg.subject === 'updateContent') {
		if (typeof msg.data !== 'undefined') {
			const data = JSON.parse(msg.data);

			// @ts-ignore
			chrome.extension.getBackgroundPage()?.console.log('MESSAGE RECEIVED FROM BACKGROUND');
			// @ts-ignore
			chrome.extension.getBackgroundPage()?.console.log(data);
			parseLogDataToHTML(data);
		}
	}
});

chrome.storage.local.get('state', (data) => {
	enabled = !!data.state;
	if (enabled) {
		const toggleElem = document.getElementById('toggle-ext-active') as HTMLInputElement | null;
		const txtElem = document.getElementById('monitoring');

		if (toggleElem) toggleElem.checked = true;
		if (txtElem) txtElem.textContent = 'enabled';
	}
});

const extStatus = (mode: Record<string, any>) => {
	const txtElem = document.getElementById('monitoring');

	if (txtElem) txtElem.textContent = mode.statusText;
};

checkboxExtensionEnabled?.addEventListener('click', () => {
	enabled = !enabled;
	chrome.storage.local.set({ state: enabled });

	chrome.extension
		.getBackgroundPage()
		// @ts-ignore
		?.console.log(`Littledata Shopify Connection Debugger has been ${enabled ? 'switched ON' : 'switched OFF'}`);
	chrome.tabs.query(
		{
			active: true,
			currentWindow: true,
		},
		(tabs) => {
			if (!tabs[0].id) return;
			chrome.tabs.sendMessage(
				tabs[0].id,
				{ from: 'popup', subject: 'EnableExtension', mode: enabled },
				extStatus,
			);
		},
	);
});

const parseLogDataToHTML = (data: Record<string, any>) => {
	let tableRows = '';

	if (data.length > 0) {
		for (let i = 0, max = data.length; i < max; i++) {
			tableRows += getLogEntryHTML(data[i]);
		}
	}

	if (tableRows.length > 0) {
		const output = `
      <table class="table" style="border-collapse:collapse;word-break: break-word;">
        <thead>
          <tr>
            <th style="width:5%">&nbsp;</th>
            <th style="width:10%">#</th>
            <th style="width:85%">URL</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

		if (outputLog) outputLog.innerHTML = output;
	}
};

const getLogEntryHTML = (entry: Record<string, any>) => {
	const status = entry.messages.length > 0 ? 'remove' : 'check';
	const statusValue = entry.messages.length > 0 ? 'danger' : 'success';
	let errorMessages = '<p>There were no errors found on this URL.</p>';

	if (entry.messages.length > 0) {
		errorMessages = `<p>Errors were encountered on the following URL:</p><p><a href="${entry.url}">${entry.url}</a></p><ul>`;
		for (let i = 0, max = entry.messages.length; i < max; i++) {
			errorMessages += `<li data-error-code="${entry.messages[i].code}">${entry.messages[i].message}</li>`;
		}
		errorMessages += '</ul>';
	}

	return `
    <tr data-toggle="collapse" data-target="#log-entry-${entry.step + 1}" class="accordion-toggle table-${statusValue}">
      <td class="log-entry-status"><span class="fas fa-${status}"></span></td>
      <td class="log-entry-id">${entry.step + 1}</td>
      <td class="log-entry-url">${entry.url}</td>
    </tr>
    <tr>
      <td colspan="3" class="hiddenRow"><div class="log-entry-messages accordian-body collapse table-${statusValue}" id="log-entry-${
		entry.step + 1
	}">
        ${errorMessages}
      </div></td>
    </tr>
  `;
};
