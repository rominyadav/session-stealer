document.addEventListener('DOMContentLoaded', function() {
  const settingsBtn = document.getElementById('settingsBtn');
  const statusDiv = document.getElementById('status');
  const adBlockToggle = document.getElementById('adBlockToggle');
  const trackerBlockToggle = document.getElementById('trackerBlockToggle');
  const malwareBlockToggle = document.getElementById('malwareBlockToggle');
  
  // Initialize fake stats
  updateStats();
  
  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Fake toggle functionality
  adBlockToggle.addEventListener('click', () => {
    toggleSwitch(adBlockToggle);
    showStatus('Ad blocking updated', 'success');
  });
  
  trackerBlockToggle.addEventListener('click', () => {
    toggleSwitch(trackerBlockToggle);
    showStatus('Tracker blocking updated', 'success');
  });
  
  malwareBlockToggle.addEventListener('click', () => {
    toggleSwitch(malwareBlockToggle);
    showStatus('Malware protection updated', 'success');
  });
  
  function toggleSwitch(toggle) {
    toggle.classList.toggle('active');
  }
  
  function updateStats() {
    // Generate fake but realistic stats
    const adsBlocked = Math.floor(Math.random() * 500) + 800;
    const trackersBlocked = Math.floor(Math.random() * 50) + 40;
    
    document.getElementById('blockedAds').textContent = adsBlocked.toLocaleString();
    document.getElementById('blockedTrackers').textContent = trackersBlocked;
    
    // Update stats every few seconds to look active
    setTimeout(() => {
      const newAds = parseInt(document.getElementById('blockedAds').textContent.replace(',', '')) + Math.floor(Math.random() * 3);
      document.getElementById('blockedAds').textContent = newAds.toLocaleString();
    }, 3000 + Math.random() * 5000);
  }
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
  }
  
  // Periodically update stats to look active
  setInterval(updateStats, 30000);
});