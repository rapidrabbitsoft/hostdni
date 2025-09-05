#!/bin/bash

# HostDNI Permission Setup Script
# This script helps set up the necessary permissions for HostDNI to modify the hosts file

echo "🔧 HostDNI Permission Setup"
echo "=========================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please do not run this script as root (with sudo)."
    echo "   Run it as a regular user and it will prompt for your password when needed."
    exit 1
fi

echo "This script will help you set up permissions for HostDNI to modify your hosts file."
echo "You will be prompted for your password to make the necessary changes."
echo ""

# Check if hosts file exists
if [ ! -f "/etc/hosts" ]; then
    echo "❌ Error: /etc/hosts file not found!"
    exit 1
fi

echo "📋 Current hosts file permissions:"
ls -la /etc/hosts
echo ""

echo "🔐 Setting up permissions..."
echo "You may be prompted for your password:"

# Create a backup of the current hosts file
echo "📦 Creating backup of current hosts file..."
sudo cp /etc/hosts /etc/hosts.hostdni.backup
if [ $? -eq 0 ]; then
    echo "✅ Backup created: /etc/hosts.hostdni.backup"
else
    echo "❌ Failed to create backup"
    exit 1
fi

# Set permissions to allow the user to modify the hosts file
echo "🔧 Setting permissions..."
sudo chown root:wheel /etc/hosts
sudo chmod 644 /etc/hosts

# Create a symlink or use a different approach for easier access
echo "🔗 Setting up alternative access method..."

# Create a script that can be used to modify hosts file
sudo tee /usr/local/bin/hostdni-modify > /dev/null << 'EOF'
#!/bin/bash
# HostDNI hosts file modification script
# This script allows HostDNI to modify the hosts file with proper permissions

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <action> <file>"
    echo "Actions: disable, enable, save"
    exit 1
fi

ACTION="$1"
FILE="$2"

case "$ACTION" in
    "disable")
        if [ -f "/etc/hosts" ]; then
            sudo mv /etc/hosts /etc/hosts.backup
            echo "Hosts file disabled"
        else
            echo "Hosts file not found"
            exit 1
        fi
        ;;
    "enable")
        if [ -f "/etc/hosts.backup" ]; then
            sudo mv /etc/hosts.backup /etc/hosts
            echo "Hosts file enabled"
        else
            echo "Backup file not found"
            exit 1
        fi
        ;;
    "save")
        if [ -f "$FILE" ]; then
            sudo cp "$FILE" /etc/hosts
            echo "Hosts file saved"
        else
            echo "Source file not found"
            exit 1
        fi
        ;;
    *)
        echo "Invalid action: $ACTION"
        exit 1
        ;;
esac
EOF

# Make the script executable
sudo chmod +x /usr/local/bin/hostdni-modify

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 What was done:"
echo "   • Created backup of your current hosts file"
echo "   • Set proper permissions on /etc/hosts"
echo "   • Created helper script at /usr/local/bin/hostdni-modify"
echo ""
echo "🚀 You can now use HostDNI to modify your hosts file."
echo "   If you encounter permission issues, the app will provide helpful instructions."
echo ""
echo "💡 To restore your original hosts file:"
echo "   sudo cp /etc/hosts.hostdni.backup /etc/hosts"
echo "" 