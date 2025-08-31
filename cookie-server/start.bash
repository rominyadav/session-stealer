#!/bin/bash
# Stop and remove the existing container
sudo docker stop cookie-server 2>/dev/null || true
sudo docker rm cookie-server 2>/dev/null || true

# Rebuild the image with the updated code
sudo docker build -t cookie-server .

sudo docker run -d -p 3333:3000 -v $(pwd)/uploads:/app/uploads --restart unless-stopped --name cookie-server cookie-server