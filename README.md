# HOSTDNI

HostDNI (pronounced Host-Dee-n-eye) is an advanced hosts file management and network monitoring application for macOS.

## Features

- Real-time network traffic monitoring (see all incoming/outgoing connections)
- Block/allow list management with easy UI
- Custom block landing page (optionally redirect blocked domains to a local info page)
- Backup and restore hosts file
- Virtual scrolling for large hosts files (millions of entries)
- Fast search, filter, and bulk operations
- Modern, responsive UI
- Tauri-based desktop app (Rust backend, React frontend)
- **Password protection** - Secure your application with a password and automatic locking

## Password Protection

HostDNI includes a comprehensive password protection system to secure your application:

### Features
- **Password Lock**: Require a password to access the application
- **Automatic Locking**: App locks automatically after a configurable period of inactivity
- **Manual Lock**: Lock the app manually using the lock button in the navigation
- **Secure Storage**: Passwords are hashed before storage (never stored in plain text)
- **Startup Protection**: App locks on startup when password protection is enabled

### Configuration
1. Navigate to **Settings** in the application
2. Enable **Password Protection** in the Password Protection section
3. Set your desired password (minimum 4 characters)
4. Configure the **Idle Timeout** (1 minute to 1 hour)
5. Use the **Change Password** button to update your password later
6. Use the **Disable Protection** button to turn off password protection

### Security Notes
- Passwords are hashed using a secure algorithm before storage
- The app automatically locks after the specified idle timeout
- You can manually lock the app at any time using the lock button
- Password protection persists across app restarts

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Development Environment Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/) (`cargo install tauri-cli` or via npm)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Install dependencies

```bash
npm install
```

### Start the development environment

This will launch both the Vite dev server and the Tauri desktop app in development mode:

```bash
npm run tauri dev
```

- The frontend will hot-reload on changes.
- The backend (Rust) will rebuild and reload as needed.

### Build for production

To create a production build (desktop app):

```bash
npm run tauri build
```

## Usage

- Use the sidebar to navigate between Hosts File, Allow Lists, Block Lists, Backups, and Network Traffic.
- The Network Traffic section shows real-time connections and whether they are allowed or blocked.
- You can deploy, backup, and restore your hosts file from the UI.
- Optionally enable the custom block landing page (see documentation for details).
- Configure password protection in Settings to secure your application.

## Security

**Note:** Modifying `/etc/hosts` requires administrator privileges. The app will prompt for your password when needed.

**Password Protection:** The application includes built-in password protection to secure access to the app. Passwords are securely hashed and never stored in plain text.

## Troubleshooting

- If you see permission errors, ensure you are running the app with the necessary privileges.
- If port 8080 is in use, change the block server port in the backend code.
- For large hosts files, use the virtual scrolling and search features for best performance.
- If you forget your password, you can disable password protection by clearing the app's local storage data.
