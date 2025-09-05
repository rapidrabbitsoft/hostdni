import React, { useState, useEffect, useRef } from "react";

function PasswordLockScreen({
  isLocked,
  onUnlock,
  passwordProtection,
  hashPassword
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef(null);

  // Focus password input when component mounts
  useEffect(() => {
    if (isLocked && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [isLocked]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      const inputHash = hashPassword(password);
      if (inputHash === passwordProtection.passwordHash) {
        setIsLoading(false);
        setPassword("");
        onUnlock();
      } else {
        setIsLoading(false);
        setError("Incorrect password");
        setPassword("");
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      }
    }, 300);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  if (!isLocked) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999
      }}
    >
      <div className="bg-white rounded-3 shadow-lg p-5" style={{ maxWidth: '400px', width: '90%' }}>
        <div className="text-center mb-4">
          <div className="mb-3">
            <i className="bi bi-lock-fill text-primary" style={{ fontSize: '3rem' }}></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">App Locked</h4>
          <p className="text-muted mb-0">
            Enter your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-key"></i>
              </span>
              <input
                ref={passwordInputRef}
                type="password"
                className={`form-control ${error ? 'is-invalid' : ''}`}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="invalid-feedback d-block">
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={!password.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Unlocking...
              </>
            ) : (
              'Unlock'
            )}
          </button>
        </form>

        <div className="text-center mt-3">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            App will lock after {passwordProtection.idleTimeout} minute{passwordProtection.idleTimeout !== 1 ? 's' : ''} of inactivity
          </small>
        </div>
      </div>
    </div>
  );
}

export default PasswordLockScreen; 