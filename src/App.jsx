import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";


import "./App.scss";
// import "../node_modules/bootstrap/dist/css/bootstrap.min.css"
// import '../node_modules/bootstrap-icons/font/bootstrap-icons.css';
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap CSS
import "bootstrap-icons/font/bootstrap-icons.css"; // Bootstrap Icons

import BlockLists from "../components/BlockLists";
import AllowLists from "../components/AllowLists";
import Home from "../components/Home";
import Logs from "../components/Logs";
import HostsFile from "../components/HostsFile";
import Backups from "../components/Backups";
import PasswordLockScreen from "../components/PasswordLockScreen";
import SettingsModal from "../components/SettingsModal";

// API token key for localStorage (optional)
const API_TOKEN_KEY = 'api_token';

// Helper to fetch the API token from the backend
const fetchApiToken = async () => {
  const response = await fetch('http://localhost:8080/api/auth/token');
  if (!response.ok) throw new Error('Failed to fetch API token');
  const data = await response.json();
  return data.token;
};

// Helper to store/retrieve token (optional: can just use in-memory)
const storeApiToken = (token) => {
  localStorage.setItem(API_TOKEN_KEY, token);
};
const getStoredApiToken = () => {
  return localStorage.getItem(API_TOKEN_KEY);
};
const clearApiToken = () => {
  localStorage.removeItem(API_TOKEN_KEY);
};

// Helper for API requests with token and auto-refresh on 401
const createApiFetch = (getToken, setToken, setIsAuthenticated, setError) => async (url, options = {}, retry = true) => {
  let token = getToken();
  if (!token) {
    try {
      token = await fetchApiToken();
      setToken(token);
      storeApiToken(token);
    } catch (err) {
      setError('Failed to fetch API token');
      setIsAuthenticated(false);
      throw err;
    }
  }
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && retry) {
    // Token expired/rotated, fetch new token and retry once
    try {
      const newToken = await fetchApiToken();
      setToken(newToken);
      storeApiToken(newToken);
      const retryHeaders = { ...(options.headers || {}), Authorization: `Bearer ${newToken}` };
      const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
      return retryResponse;
    } catch (err) {
      setError('Failed to refresh API token');
      setIsAuthenticated(false);
      throw err;
    }
  }
  return response;
};

// Hash password function for password protection
const hashPassword = (password) => {
  // Simple hash function - in production, use a proper hashing library
  let hash = 0;
  if (password.length === 0) return hash.toString();
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

function App() {
  const [apiToken, setApiToken] = useState(() => getStoredApiToken());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  // Password protection state
  const [passwordProtection, setPasswordProtection] = useState(() => {
    const saved = localStorage.getItem('passwordProtection');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      passwordHash: '',
      idleTimeout: 5
    };
  });
  
  const [isLocked, setIsLocked] = useState(() => {
    // Auto-lock on startup if password protection is enabled
    const saved = localStorage.getItem('passwordProtection');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.enabled;
    }
    return false;
  });
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Initialize API token on app start
  useEffect(() => {
    const initToken = async () => {
      try {
        console.log('Initializing API token...');
        let token = getStoredApiToken();
        console.log('Stored token found:', !!token);
        if (!token) {
          console.log('No stored token, fetching new one...');
          token = await fetchApiToken();
          console.log('New token fetched:', !!token);
          storeApiToken(token);
        }
        setApiToken(token);
        setIsAuthenticated(true);
        setError(null);
        console.log('Token initialization complete');
      } catch (err) {
        console.error('Token initialization failed:', err);
        setError('Failed to fetch API token');
        setIsAuthenticated(false);
      }
    };
    initToken();
  }, []);

  // Initialize bootstrap-select for all select elements
  useEffect(() => {
    $('.selectpicker').selectpicker();
  }, []);

  // Save password protection settings to localStorage
  useEffect(() => {
    localStorage.setItem('passwordProtection', JSON.stringify(passwordProtection));
  }, [passwordProtection]);

  // Activity tracking for idle timeout
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Set up activity listeners
  useEffect(() => {
    if (!passwordProtection.enabled) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [passwordProtection.enabled, updateActivity]);

  // Check for idle timeout
  useEffect(() => {
    if (!passwordProtection.enabled) return;

    const checkIdleTimeout = () => {
      const idleTime = Date.now() - lastActivity;
      const timeoutMs = passwordProtection.idleTimeout * 60 * 1000; // Convert minutes to milliseconds
      
      if (idleTime >= timeoutMs && !isLocked) {
        setIsLocked(true);
      }
    };

    const interval = setInterval(checkIdleTimeout, 1000); // Check every second

    return () => clearInterval(interval);
  }, [passwordProtection.enabled, passwordProtection.idleTimeout, lastActivity, isLocked]);

  // Handle unlock
  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    setLastActivity(Date.now());
  }, []);

  // Update password protection settings
  const updatePasswordProtection = useCallback((newSettings) => {
    setPasswordProtection(newSettings);
  }, []);

  // Pass password protection to components that need it
  const passwordProtectionProps = {
    passwordProtection,
    onUpdatePasswordProtection: updatePasswordProtection
  };

  // API fetch helper for use in components
  const apiFetch = useCallback(
    createApiFetch(() => apiToken, setApiToken, setIsAuthenticated, setError),
    [apiToken]
  );

  // Show loading screen while authenticating
  if (!isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">{error ? error : 'Initializing HostDNI...'}</p>
          {error && (
            <button className="btn btn-primary mt-2" onClick={() => window.location.reload()}>Retry</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <nav
        id="sidebar"
        className="d-flex flex-column flex-shrink-0 overflow-hidden nav-width"
      >
        <NavLink
          to="/"
          className="d-block p-3 text-center text-decoration-none home"
        >
          <img src="./images/logo-100x100.svg" alt="[logo]" />
          <span className="visually-hidden">Icon-only</span>
        </NavLink>
        <ul className="nav nav-flush flex-column mb-auto">
          <li className="nav-item mb-0">
            <NavLink to="/hosts-file" className="nav-link py-3 d-flex">
              <span className="nav-icon nav-icon-hosts-file"></span>
              <span className="label">Hosts file</span>
            </NavLink>
          </li>

          <li className="nav-item mb-0">
            <NavLink to="/block-lists" className="nav-link py-3 d-flex">
              <span className="nav-icon nav-icon-block-lists"></span>
              <span className="label">Block Lists</span>
            </NavLink>
          </li>

          <li className="nav-item mb-0">
            <NavLink to="/allow-lists" className="nav-link py-3 d-flex">
              <span className="nav-icon nav-icon-allow-lists"></span>
              <span className="label">Allow Lists</span>
            </NavLink>
          </li>

          <li className="nav-item mb-0">
            <NavLink to="/backups" className="nav-link py-3 d-flex">
              <span className="nav-icon nav-icon-backups"></span>
              <span className="label">Backups</span>
            </NavLink>
          </li>

          <li className="nav-item mb-0">
            <NavLink to="/logs" className="nav-link py-3 d-flex">
              <span className="nav-icon nav-icon-logs"></span>
              <span className="label">Network Traffic</span>
            </NavLink>
          </li>
        </ul>
        <div className="nav-item mb-0">
          <button 
            className="nav-link py-3 ps-3 d-flex border-0 bg-transparent w-100"
            onClick={() => setShowSettingsModal(true)}
            style={{ color: '#fff' }}
          >
            <span className="nav-icon nav-icon-settings"></span>
            <span className="label">Settings</span>
          </button>
        </div>
        {passwordProtection.enabled && (
          <div className="nav-item mb-0">
            <button 
              className="nav-link py-3 ps-3 d-flex border-0 bg-transparent w-100"
              onClick={() => setIsLocked(true)}
              title="Lock Application"
              style={{ color: '#fff' }}
            >
              <i className="bi bi-lock-fill ms-2 me-3" style={{ fontSize: '1.2rem' }}></i>
              <span className="label">Lock</span>
            </button>
          </div>
        )}
      </nav>
      <div id="content" className="w-100 overflow-auto">
        <Routes>
          <Route path="/logs" element={<Logs />}></Route>
          <Route path="/backups" element={<Backups />}></Route>
          <Route path="/allow-lists" element={<AllowLists />}></Route>
          <Route path="/block-lists" element={<BlockLists />}></Route>
          <Route path="/hosts-file" element={<HostsFile {...passwordProtectionProps} />}></Route>
          <Route exact path="/" element={<Home />}></Route>
        </Routes>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isBlockServerEnabled={false}
        onToggleBlockServer={() => {}}
        isTauriEnv={true}
        {...passwordProtectionProps}
      />

      {/* Password Lock Screen */}
      <PasswordLockScreen
        isLocked={isLocked}
        onUnlock={handleUnlock}
        passwordProtection={passwordProtection}
        hashPassword={hashPassword}
      />
    </Router>
  );
}

export default App;
