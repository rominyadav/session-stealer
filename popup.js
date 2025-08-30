document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const statusDiv = document.getElementById('status');
  
  extractBtn.addEventListener('click', extractCookies);
  
  async function extractCookies() {
    try {
      // Disable button and show loading
      extractBtn.disabled = true;
      extractBtn.textContent = 'Extracting...';
      showStatus('Extracting cookies...', 'info');
      
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'extractCookies'
      });
      
      if (response.success) {
        showStatus(`Success! Downloaded ${response.count} cookies to ${response.filename}`, 'success');
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
      
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      // Re-enable button
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract All Cookies';
    }
  }
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }
});