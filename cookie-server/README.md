# Cookie Upload Server

A Node.js server that receives cookie data uploads from the Chrome extension.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

## Endpoints

- `POST /upload` - Receives cookie data from extension
- `GET /status` - Server status and upload count
- `GET /files` - List all uploaded files
- `GET /download/:filename` - Download specific file

## Extension Configuration

In the Chrome extension settings, use:
- **API Endpoint**: `http://localhost:3000/upload`
- **Headers**: `{"Content-Type": "application/json"}`

## File Storage

Uploaded cookie files are saved in the `uploads/` directory with timestamps.

## Usage

1. Start this server
2. Configure the Chrome extension to use `http://localhost:3000/upload`
3. Cookie data will be automatically uploaded and saved as JSON files