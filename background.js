// Background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractCookies') {
    extractAllCookies().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function extractAllCookies() {
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

    // Create data URL for download
    const jsonString = JSON.stringify(cookieData, null, 2);
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
    const filename = `cookies_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });

    return {
      success: true,
      count: cookies.length,
      filename: filename
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}