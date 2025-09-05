import React, { useState, useEffect } from 'react';
import DeploymentModal from './DeploymentModal';

function Backups() {
  const [backupFiles, setBackupFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Fetch backup files from backend API
  const fetchBackupFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if hosts_backups folder exists and create if needed
      let folderStatusResponse = await fetch('/api/backups/folder-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Handle 401 error for folder status
      if (folderStatusResponse.status === 401) {
        const freshTokenRes = await fetch('http://localhost:8080/api/auth/token');
        if (freshTokenRes.ok) {
          const tokenData = await freshTokenRes.json();
          localStorage.setItem('api_token', tokenData.token);
          
          // Retry with fresh token
          folderStatusResponse = await fetch('/api/backups/folder-status', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenData.token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }
      
      if (!folderStatusResponse.ok) {
        // Fail silently for folder status check
        console.warn('Failed to check backup folder status');
      }
      
      // Then fetch the backup files
      let response = await fetch('/api/backups/files', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Handle 401 error for backup files
      if (response.status === 401) {
        const freshTokenRes = await fetch('http://localhost:8080/api/auth/token');
        if (freshTokenRes.ok) {
          const tokenData = await freshTokenRes.json();
          localStorage.setItem('api_token', tokenData.token);
          
          // Retry with fresh token
          response = await fetch('/api/backups/files', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenData.token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }
      
      if (!response.ok) {
        // Fail silently for backup files fetch
        console.warn('Failed to fetch backup files');
        setBackupFiles([]);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setBackupFiles(result.data || []);
      } else {
        // Fail silently for API errors
        console.warn('API returned error:', result.error);
        setBackupFiles([]);
      }
    } catch (err) {
      // Fail silently for any errors
      console.warn('Error fetching backup files:', err.message);
      setBackupFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Load backup files on component mount
  useEffect(() => {
    fetchBackupFiles();
  }, []);

  // Format file size in human readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle backup restoration
  const handleRestoreBackup = async (file) => {
    if (window.confirm(`Are you sure you want to restore the backup "${file.filename}"? This will replace your current hosts file.`)) {
      try {
        // TODO: Implement backup restoration API endpoint
        alert('Backup restoration feature coming soon!');
      } catch (err) {
        setError(`Failed to restore backup: ${err.message}`);
      }
    }
  };

  // Refresh backup files
  const handleRefresh = () => {
    fetchBackupFiles();
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-bottom p-4">
        <div className="d-flex justify-content-between align-items-center">
          <div className="w-100">
            <h1 className="text-primary mb-0 fw-bold">Hosts File Backups</h1>
          </div>
          <button
            className="btn btn-success"
            onClick={() => setShowDeployModal(true)}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            data-bs-custom-class="tooltip-dark"
            title="Deploy Hosts File"
          >
            <i className="bi bi-rocket-takeoff"></i>
          </button>
        </div>
      </div>

      <div className="container-fluid p-4">
        {/* Section Header with Right-Aligned Buttons */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold text-primary mb-0">
            Backup Files{" "}
            <i
              className="bi bi-question-circle-fill fs-6 text-muted align-middle"
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              title="View and manage hosts file backups"
            ></i>
          </h3>
          
          {/* Right-aligned buttons container */}
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={handleRefresh}
              disabled={loading}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              data-bs-custom-class="tooltip-dark"
              title="Refresh"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-arrow-clockwise"></i>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        {loading ? (
          <div className="d-flex align-items-center justify-content-center" style={{ height: '400px' }}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading backup files...</p>
            </div>
          </div>
        ) : backupFiles.length === 0 ? (
          <div className="d-flex align-items-center justify-content-center" style={{ height: '400px' }}>
            <div className="text-center text-muted">
              <i className="bi bi-folder-x fs-1 mb-3"></i>
              <p>No backup files found</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3 border-0" style={{ width: '40%' }}>
                        Filename
                      </th>
                      <th className="border-0" style={{ width: '25%' }}>
                        Date
                      </th>
                      <th className="border-0" style={{ width: '20%' }}>
                        Size
                      </th>
                      <th className="border-0" style={{ width: '15%' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupFiles.map((file, index) => (
                      <tr key={index} style={{ borderTop: '1px solid #dee2e6' }}>
                        <td className="ps-3 px-1 border-0">
                          <span className="font-monospace small">
                            {file.filename}
                          </span>
                        </td>
                        <td className="px-1 border-0">
                          <span className="text-muted">
                            {file.backup_date}
                          </span>
                        </td>
                        <td className="px-1 border-0">
                          <span className="text-muted">
                            {formatFileSize(file.file_size)}
                          </span>
                        </td>
                        <td className="px-1 border-0">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleRestoreBackup(file)}
                            title="Restore this backup"
                          >
                            <i className="bi bi-arrow-clockwise"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {backupFiles.length > 0 && (
          <div className="mt-3 text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            Found {backupFiles.length} backup file{backupFiles.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Deployment Modal */}
      <DeploymentModal 
        isOpen={showDeployModal} 
        onClose={() => setShowDeployModal(false)} 
      />
    </>
  );
}

export default Backups; 