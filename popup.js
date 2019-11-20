var enabled = false; //disabled by default
var checkboxExtensionEnabled = document.getElementById('toggle-ext-active');

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
  chrome.extension.getBackgroundPage().console.log("Extension enabled: " + enabled);
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