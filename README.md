# Cookie Extractor - Security Research Tool

![Security Research](https://img.shields.io/badge/Purpose-Security%20Research-red)
![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%2FChromium-blue)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)

## 🔍 Overview

Cookie Extractor is a Chrome/Chromium browser extension designed for cybersecurity professionals and researchers to analyze browser cookie security. This tool provides comprehensive cookie extraction capabilities for security assessments, penetration testing, and privacy research.

## 🎯 What It Does

The extension extracts **all browser cookies** from every domain visited by the user and exports them in a structured JSON format for analysis. It captures complete cookie metadata including security flags, expiration dates, and domain information.

### Key Capabilities:
- **Complete Cookie Extraction**: Retrieves all cookies from all domains
- **Real-time Access**: Gets active session data without file system access
- **Security Analysis**: Captures all security-relevant cookie attributes
- **Automated Export**: Downloads data as timestamped JSON files
- **Cross-Domain Coverage**: Works across all visited websites

## 🛠️ Technologies Used

- **Chrome Extension API**: Manifest V3 service worker architecture
- **JavaScript ES6+**: Modern async/await patterns
- **Chrome Cookies API**: Native browser cookie access
- **Chrome Downloads API**: Automated file download
- **JSON Data Format**: Structured output for analysis tools
- **HTML/CSS**: Clean, responsive user interface

## 🔬 Security Research Applications

### Penetration Testing
- **Session Hijacking Analysis**: Identify vulnerable session tokens
- **Authentication Bypass**: Analyze session management flaws
- **Cross-Site Request Forgery (CSRF)**: Assess SameSite cookie protection
- **Cross-Site Scripting (XSS)**: Check HttpOnly flag implementation

### Privacy Research
- **Tracking Analysis**: Identify cross-domain tracking cookies
- **Data Collection Assessment**: Analyze cookie-based profiling
- **Compliance Auditing**: Verify GDPR/CCPA cookie practices
- **Third-party Analytics**: Map data sharing relationships

### Security Auditing
- **Cookie Security Assessment**: Evaluate Secure flag usage
- **Session Management Review**: Analyze session timeout policies
- **Domain Security**: Check cookie scope and path restrictions
- **Encryption Analysis**: Identify unencrypted sensitive data

## 📊 Output Data Structure

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "browser": "Chrome/Chromium",
  "total_cookies": 247,
  "cookies": [
    {
      "name": "sessionid",
      "value": "abc123xyz789",
      "domain": ".example.com",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "lax",
      "expirationDate": 1705312245,
      "session": false,
      "hostOnly": false,
      "storeId": "0"
    }
  ]
}
```

## 🚀 Installation & Usage

### Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked" and select the project folder
5. The Cookie Extractor icon will appear in your toolbar

### Usage
1. Click the extension icon in the Chrome toolbar
2. Click "Extract All Cookies" button
3. Cookies are automatically downloaded as `cookies_[timestamp].json`
4. Analyze the JSON file with your preferred security tools

## 🏗️ Project Structure

```
session-stealer/
├── manifest.json     # Extension configuration & permissions
├── background.js     # Service worker for cookie extraction
├── popup.html        # Extension popup interface
├── popup.js          # UI interaction handling
└── README.md         # Project documentation
```

## 🔧 Technical Implementation

### Manifest V3 Architecture
- Uses service worker instead of background pages
- Implements proper message passing between popup and background
- Leverages native Chrome APIs for secure cookie access

### Security Considerations
- No file system access required (uses Chrome APIs)
- Bypasses cookie encryption/locking issues
- Works with active browser sessions
- Respects Chrome's security model

## ⚖️ Legal & Ethical Use

**⚠️ IMPORTANT DISCLAIMER**

This tool is designed for **authorized security research only**. Users must:

- Only use on systems they own or have explicit written permission to test
- Comply with all applicable local, state, and federal laws
- Follow responsible disclosure practices for any vulnerabilities found
- Respect privacy and data protection regulations
- Use only for legitimate security research purposes

**Unauthorized use of this tool may violate computer crime laws.**

## 🤝 Contributing

Contributions for security research enhancements are welcome:
- Additional cookie analysis features
- Integration with security testing frameworks
- Enhanced data export formats
- Security vulnerability detection algorithms

## 📝 License

This project is intended for educational and authorized security research purposes. Users are responsible for ensuring compliance with all applicable laws and regulations.

---

**Built for Security Researchers | Use Responsibly | Test Ethically**