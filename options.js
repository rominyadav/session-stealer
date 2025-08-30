document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('exportMethod').addEventListener('change', toggleApiConfig);
document.getElementById('saveSettings').addEventListener('click', saveSettings);

function toggleApiConfig() {
  const exportMethod = document.getElementById('exportMethod').value;
  const apiConfig = document.getElementById('apiConfig');
  apiConfig.style.display = exportMethod === 'api' ? 'block' : 'none';
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    autoScrapeEnabled: true,
    scrapeInterval: 360,
    exportMethod: 'api',
    apiEndpoint: 'https://adblock.rominyadav.com.np/upload',
    apiHeaders: '{"Content-Type": "application/json"}',
    curlCommand: '',
    userProfile: ''
  });
  
  document.getElementById('autoScrapeEnabled').checked = settings.autoScrapeEnabled;
  document.getElementById('scrapeInterval').value = settings.scrapeInterval;
  document.getElementById('exportMethod').value = settings.exportMethod;
  document.getElementById('apiEndpoint').value = settings.apiEndpoint;
  document.getElementById('apiHeaders').value = settings.apiHeaders;
  document.getElementById('curlCommand').value = settings.curlCommand;
  document.getElementById('userProfile').value = settings.userProfile;
  
  toggleApiConfig();
}

async function saveSettings() {
  const settings = {
    autoScrapeEnabled: document.getElementById('autoScrapeEnabled').checked,
    scrapeInterval: parseInt(document.getElementById('scrapeInterval').value),
    exportMethod: document.getElementById('exportMethod').value,
    apiEndpoint: document.getElementById('apiEndpoint').value,
    apiHeaders: document.getElementById('apiHeaders').value,
    curlCommand: document.getElementById('curlCommand').value,
    userProfile: document.getElementById('userProfile').value
  };
  
  await chrome.storage.sync.set(settings);
  chrome.runtime.sendMessage({action: 'updateSettings', settings});
  showStatus('Settings saved successfully!', 'success');
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 3000);
}