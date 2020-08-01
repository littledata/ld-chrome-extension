var enabled = false; //disabled by default
var checkboxExtensionEnabled = document.getElementById('toggle-ext-active');
var resetBtn = document.getElementById('reset-log');

document.addEventListener('DOMContentLoaded', function() {
  chrome.runtime.sendMessage({ from: 'popup', subject: 'pageActionClicked' });
});

resetBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({ from: 'popup', subject: 'pageResetClicked' });
  $(document.body).find("#output-log").empty();
  $(document.body).find("#output-log").append('<p class="font-italic text-info">Log is cleared</p>')
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if ((msg.from === 'background') && (msg.subject === 'updateContent')) {
    if (typeof msg.data !== "undefined") {
      let data = JSON.parse(msg.data);
      chrome.extension.getBackgroundPage().console.log('MESSAGE RECEIVED FROM BACKGROUND');
      chrome.extension.getBackgroundPage().console.log(data);
      parseLogDataToHTML(data);
    }
  }
});

chrome.storage.local.get('state', data => {
  enabled = !!data.state;
  if (enabled) {
    document.getElementById('toggle-ext-active').checked = true;
    document.getElementById('monitoring').textContent = "enabled";
  }
});

checkboxExtensionEnabled.onclick = () => {
  enabled = !enabled;
  chrome.storage.local.set({ state : enabled });
  chrome.extension.getBackgroundPage().console.log('Littledata Shopify Connection Debugger has been ' + ((enabled) ? 'switched ON' : 'switched OFF'));
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {from: 'popup', subject: 'EnableExtension', mode: enabled},
      extStatus
    );
  });
};

const extStatus = mode => {
  document.getElementById('monitoring').textContent = mode.statusText;
};

function parseLogDataToHTML(data) {

  let tableRows = '';

  if (data.length > 0) {
    for (var i = 0, max = data.length; i < max; i++) {
      tableRows += getLogEntryHTML(data[i]);
    }
  }

  if (tableRows.length > 0) {
    let output = `
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

    let logDiv = $(document.body).find("#output-log");
    logDiv.append(output);
  }
}

function getLogEntryHTML(entry) {

  let status = entry.messages.length > 0 ? 'remove' : 'check';
  let statusValue = entry.messages.length > 0 ? 'danger' : 'success';
  let errorMessages = '<p>There were no errors found on this URL.</p>';

  if (entry.messages.length > 0) {
    errorMessages = `<p>Errors were encountered on the following URL:</p><p><a href="${entry.url}">${entry.url}</a></p><ul>`;
    for (var i = 0, max = entry.messages.length; i < max; i++) {
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
      <td colspan="3" class="hiddenRow"><div class="log-entry-messages accordian-body collapse table-${statusValue}" id="log-entry-${entry.step + 1}">
        ${errorMessages}
      </div></td>
    </tr>
  `;
}