import React, { useState, useEffect } from "react";

// Simple hash function for password storage (in production, use a proper crypto library)
const hashPassword = (password) => {
  let hash = 0;
  if (password.length === 0) return hash.toString();
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

function SettingsModal({
  isOpen,
  onClose,
  isBlockServerEnabled,
  onToggleBlockServer,
  isTauriEnv,
  passwordProtection,
  onUpdatePasswordProtection
}) {
  const [passwordSettings, setPasswordSettings] = useState({
    enabled: passwordProtection.enabled,
    password: '',
    confirmPassword: '',
    idleTimeout: passwordProtection.idleTimeout
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [error, setError] = useState('');

  // Update local state when props change
  useEffect(() => {
    setPasswordSettings({
      enabled: passwordProtection.enabled,
      password: '',
      confirmPassword: '',
      idleTimeout: passwordProtection.idleTimeout
    });
  }, [passwordProtection]);

  const handlePasswordToggle = (enabled) => {
    if (enabled && !passwordProtection.passwordHash) {
      setShowPasswordFields(true);
    } else if (!enabled) {
      setPasswordSettings(prev => ({ ...prev, enabled: false }));
      onUpdatePasswordProtection({
        ...passwordProtection,
        enabled: false
      });
    }
  };

  const handlePasswordChange = () => {
    if (passwordSettings.password !== passwordSettings.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordSettings.password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }
    
    setError('');
    const passwordHash = hashPassword(passwordSettings.password);
    onUpdatePasswordProtection({
      ...passwordProtection,
      enabled: true,
      passwordHash: passwordHash,
      idleTimeout: passwordSettings.idleTimeout
    });
    setPasswordSettings(prev => ({ 
      ...prev, 
      enabled: true, 
      password: '', 
      confirmPassword: '' 
    }));
    setShowPasswordFields(false);
    setShowChangePassword(false);
  };

  const handleChangePassword = () => {
    if (passwordSettings.password !== passwordSettings.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordSettings.password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    setError('');
    const passwordHash = hashPassword(passwordSettings.password);
    onUpdatePasswordProtection({
      ...passwordProtection,
      passwordHash: passwordHash
    });
    setPasswordSettings(prev => ({ 
      ...prev, 
      password: '', 
      confirmPassword: '' 
    }));
    setShowChangePassword(false);
  };

  const handleIdleTimeoutChange = (timeout) => {
    setPasswordSettings(prev => ({ ...prev, idleTimeout: timeout }));
    onUpdatePasswordProtection({
      ...passwordProtection,
      idleTimeout: timeout
    });
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop show" 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(5px)',
          zIndex: 1040
        }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div 
        className="modal show d-block" 
        style={{ zIndex: 1050 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-gear me-2"></i>
                Settings
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Password Protection Settings */}
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0 text-primary">
                    <i className="bi bi-shield-lock me-2"></i>
                    Password Protection
                  </h5>
                </div>
                <div className="card-body">
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="passwordProtectionCheck"
                      checked={passwordSettings.enabled}
                      onChange={(e) => handlePasswordToggle(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="passwordProtectionCheck">
                      Enable password protection
                    </label>
                    <div className="form-text text-muted">
                      Require a password to access the application
                    </div>
                  </div>

                  {showPasswordFields && (
                    <div className="border rounded p-3 mb-3 bg-light">
                      <h6 className="fw-semibold mb-3">Set Password</h6>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={passwordSettings.password}
                            onChange={(e) => setPasswordSettings(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter password"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Confirm Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={passwordSettings.confirmPassword}
                            onChange={(e) => setPasswordSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm password"
                          />
                        </div>
                      </div>
                      {error && (
                        <div className="text-danger mt-2">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          {error}
                        </div>
                      )}
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-primary me-2"
                          onClick={handlePasswordChange}
                          disabled={!passwordSettings.password || !passwordSettings.confirmPassword}
                        >
                          <i className="bi bi-check-circle me-2"></i>
                          Set Password
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setShowPasswordFields(false);
                            setPasswordSettings(prev => ({ ...prev, enabled: false }));
                            setError('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {passwordSettings.enabled && (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Idle Timeout</label>
                        <select 
                          className="form-select"
                          value={passwordSettings.idleTimeout}
                          onChange={(e) => handleIdleTimeoutChange(parseInt(e.target.value))}
                        >
                          <option value={1}>1 minute</option>
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                        </select>
                        <div className="form-text text-muted">
                          Lock app after inactivity
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Current Status</label>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-success me-2">
                            <i className="bi bi-shield-check"></i>
                          </span>
                          <span className="text-success fw-semibold">Protected</span>
                        </div>
                        <div className="form-text text-muted">
                          Password protection is active
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm mt-2"
                          onClick={() => setShowChangePassword(true)}
                        >
                          <i className="bi bi-key me-1"></i>
                          Change Password
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm mt-2 ms-2"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to disable password protection? This will remove the password requirement.')) {
                              onUpdatePasswordProtection({
                                ...passwordProtection,
                                enabled: false,
                                passwordHash: ''
                              });
                              setPasswordSettings(prev => ({ ...prev, enabled: false }));
                            }
                          }}
                        >
                          <i className="bi bi-shield-x me-1"></i>
                          Disable Protection
                        </button>
                      </div>
                    </div>
                  )}

                  {showChangePassword && (
                    <div className="border rounded p-3 mb-3 bg-light">
                      <h6 className="fw-semibold mb-3">Change Password</h6>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">New Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={passwordSettings.password}
                            onChange={(e) => setPasswordSettings(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter new password"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Confirm New Password</label>
                          <input
                            type="password"
                            className="form-control"
                            value={passwordSettings.confirmPassword}
                            onChange={(e) => setPasswordSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                      {error && (
                        <div className="text-danger mt-2">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          {error}
                        </div>
                      )}
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-primary me-2"
                          onClick={handleChangePassword}
                          disabled={!passwordSettings.password || !passwordSettings.confirmPassword}
                        >
                          <i className="bi bi-check-circle me-2"></i>
                          Change Password
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setShowChangePassword(false);
                            setPasswordSettings(prev => ({ ...prev, password: '', confirmPassword: '' }));
                            setError('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Block Page Settings */}
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0 text-primary">
                  <i className="bi bi-shield-lock me-2"></i>
                  Block Page Settings
                  </h5>
                </div>
                <div className="card-body">
                  <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="blockServerToggle"
                    checked={isBlockServerEnabled}
                    onChange={onToggleBlockServer}
                    disabled={!isTauriEnv}
                  />
                    <label className="form-check-label fw-semibold" htmlFor="blockServerToggle">
                    Enable block landing page
                  </label>
                    <div className="form-text text-muted">
                      When enabled, blocked domains will redirect to a custom landing page instead of 0.0.0.0
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Update Settings */}
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0 text-primary">
                    <i className="bi bi-clock-history me-2"></i>
                    Automatic Updates
                  </h5>
                </div>
                <div className="card-body">
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                      id="autoUpdateCheck"
                      defaultChecked
                    />
                    <label className="form-check-label fw-semibold" htmlFor="autoUpdateCheck">
                      Enable automatic host file updates
                  </label>
                    <div className="form-text text-muted">
                      Automatically update your hosts file with the latest block lists
                    </div>
                </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Update Frequency</label>
                      <select className="form-select">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Update Time</label>
                        <input
                        type="time"
                          className="form-control"
                        defaultValue="02:00"
                      />
                    </div>
                  </div>

                  <div className="row g-3 mt-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Day of Week</label>
                      <select className="form-select">
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                        <option value="saturday">Saturday</option>
                        <option value="sunday">Sunday</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Backup Retention</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="30"
                        min="1"
                        max="365"
                      />
                      <div className="form-text text-muted">Number of backups to keep</div>
                    </div>
                  </div>
                      </div>
                    </div>

              {/* Application Settings */}
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0 text-primary">
                    <i className="bi bi-gear me-2"></i>
                    Application Settings
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Log Retention</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="1000"
                        min="100"
                        max="10000"
                      />
                      <div className="form-text text-muted">Number of log entries to keep</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Startup Behavior</label>
                      <select className="form-select">
                        <option value="normal">Normal startup</option>
                        <option value="minimized">Start minimized</option>
                        <option value="tray">Start in system tray</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-check form-switch mt-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="notificationsCheck"
                      defaultChecked
                    />
                    <label className="form-check-label fw-semibold" htmlFor="notificationsCheck">
                      Enable notifications
                    </label>
                    <div className="form-text text-muted">
                      Show notifications for blocked domains and updates
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration Management */}
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0 text-primary">
                    <i className="bi bi-files me-2"></i>
                    Configuration Management
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <h6 className="fw-semibold mb-3">Backup Configuration</h6>
                      <button type="button" className="btn btn-outline-success w-100 mb-2">
                        <i className="bi bi-download me-2"></i>
                        Export Configuration
                      </button>
                      <div className="form-text text-muted">
                        Save your current settings to a file
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-semibold mb-3">Restore Configuration</h6>
                      <button type="button" className="btn btn-outline-primary w-100 mb-2">
                        <i className="bi bi-upload me-2"></i>
                        Import Configuration
                      </button>
                      <div className="form-text text-muted">
                        Load settings from a previously saved file
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-outline-secondary"
              >
                Reset to Defaults
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
              >
                <i className="bi bi-check-circle me-2"></i>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingsModal; 