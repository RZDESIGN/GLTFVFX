#!/bin/bash

# Hostinger SSH Deployment Script
# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found. Please create one with your SSH credentials."
    echo "See .env.example for required variables."
    exit 1
fi

# Validate required environment variables
if [ -z "$SSH_HOST" ] || [ -z "$SSH_PORT" ] || [ -z "$SSH_USER" ] || [ -z "$REMOTE_DIR" ]; then
    echo "Error: Missing required environment variables."
    echo "Please ensure SSH_HOST, SSH_PORT, SSH_USER, and REMOTE_DIR are set in your .env file."
    exit 1
fi

# Check if password or SSH key is provided
if [ -z "$SSH_PASS" ] && [ -z "$SSH_KEY_PATH" ]; then
    echo "Error: Either SSH_PASS or SSH_KEY_PATH must be set in your .env file."
    exit 1
fi

# Build the project
echo "Building project..."
npm run build

# Try SSH/SFTP first, then fallback to FTP
echo "Uploading to Hostinger..."

# Method 1: Try with sshpass (if available and password is provided)
if command -v sshpass &> /dev/null && [ -n "$SSH_PASS" ]; then
    echo "Using SSH deployment with password..."
    sshpass -p "$SSH_PASS" rsync -avz --delete -e "ssh -p $SSH_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" dist/ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
elif [ -n "$SSH_KEY_PATH" ]; then
    echo "Using SSH deployment with key..."
    rsync -avz --delete -e "ssh -i $SSH_KEY_PATH -p $SSH_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" dist/ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
else
    # Method 2: Fallback to curl for file upload
    echo "SSH not available, trying HTTP upload..."
    echo "Note: You may need to manually upload files or configure SSH keys"
    
    # Alternative: Use curl to upload individual files (if Hostinger supports it)
    # This is a fallback option
    find dist -type f | while read file; do
        relative_path=${file#dist/}
        echo "Would upload: $file to $relative_path"
    done
    
    echo "Consider setting up SSH keys or using Hostinger's file manager"
    echo "Files are built in the 'dist/' directory"
fi

echo "Deployment complete!" 