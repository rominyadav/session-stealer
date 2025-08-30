# Cookie Extractor Chrome Extension

A Chrome/Chromium extension for security research that extracts and downloads all browser cookies.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this folder
4. The extension icon will appear in the toolbar

## Usage

1. Click the extension icon in the toolbar
2. Click "Extract All Cookies" button
3. Cookies will be automatically downloaded as a JSON file

## Output Format

The downloaded JSON file contains:
- Timestamp of extraction
- Browser information
- Total cookie count
- Complete cookie data including:
  - Name, value, domain, path
  - Security flags (secure, httpOnly, sameSite)
  - Expiration dates
  - Session information

## Security Research Applications

- Session hijacking analysis
- Cookie security assessment
- Cross-domain tracking research
- Authentication token extraction
- Privacy analysis

## Legal Notice

This tool is intended for authorized security research only. Use only on systems you own or have explicit permission to test.

## File Structure

```
session-stealer/
├── manifest.json     # Extension configuration
├── background.js     # Cookie extraction logic
├── popup.html        # User interface
├── popup.js          # UI interaction handling
└── README.md         # This file
```