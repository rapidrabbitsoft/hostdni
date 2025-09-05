import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import DeploymentModal from './DeploymentModal';

function Logs() {
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [networkLogs, setNetworkLogs] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const refreshIntervalRef = useRef(null);

  // Load network logs
  const loadNetworkLogs = async () => {
    try {
      const count = await invoke('get_network_logs_count');
      // Get all logs (no pagination)
      const logs = await invoke('get_network_logs_page', { page: 1, pageSize: count });
      // Reverse the order to show newest first
      setNetworkLogs(logs.reverse());
    } catch (error) {
      console.error("Error loading network logs:", error);
    }
  };

  // Clear all logs
  const clearLogs = async () => {
    try {
      // Temporarily pause monitoring to prevent new logs from being added
      const wasMonitoring = isMonitoring;
      if (wasMonitoring) {
        await stopMonitoring();
      }
      
      // Clear the frontend state immediately for responsive UI
      setNetworkLogs([]);
      
      // Clear the backend
      await invoke('clear_network_logs');
      
      // Wait a moment for the backend to fully clear
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Double-check by reloading logs to ensure they're really cleared
      const count = await invoke('get_network_logs_count');
      if (count > 0) {
        console.warn("Backend still has logs after clear, forcing reload");
        await loadNetworkLogs();
      }
      
      // Restart monitoring if it was running before
      if (wasMonitoring) {
        await startMonitoring();
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
      // Even if backend fails, keep frontend cleared
      setNetworkLogs([]);
    }
  };

  // Start monitoring
  const startMonitoring = async () => {
    try {
      await invoke('start_network_monitoring');
      setIsMonitoring(true);
      
      // Set up real-time refresh
      refreshIntervalRef.current = setInterval(() => {
        loadNetworkLogs();
      }, 2000); // Refresh every 2 seconds
    } catch (error) {
      console.error("Error starting monitoring:", error);
    }
  };

  // Stop monitoring
  const stopMonitoring = async () => {
    try {
      await invoke('stop_network_monitoring');
      setIsMonitoring(false);
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    } catch (error) {
      console.error("Error stopping monitoring:", error);
    }
  };

  // Generate sample logs for testing
  const generateSampleLogs = async () => {
    try {
      await invoke('generate_sample_logs');
      loadNetworkLogs(); // Reload to show the new logs
    } catch (error) {
      console.error("Error generating sample logs:", error);
    }
  };

  // Filter logs based on search term and status
  const filteredLogs = networkLogs.filter(log => {
    const matchesSearch = log.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.ip_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || log.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'blocked':
        return <span className="badge bg-danger">Blocked</span>;
      case 'allowed':
        return <span className="badge bg-success">Allowed</span>;
      case 'unknown':
        return <span className="badge bg-warning">Unknown</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  // Get direction badge color
  const getDirectionBadge = (direction) => {
    switch (direction.toLowerCase()) {
      case 'outgoing':
        return <span className="badge bg-primary">Outgoing</span>;
      case 'incoming':
        return <span className="badge bg-info">Incoming</span>;
      default:
        return <span className="badge bg-secondary">{direction}</span>;
    }
  };

  // Load logs on component mount and when page changes
  useEffect(() => {
    loadNetworkLogs();
  }, []);

  // Start monitoring by default when component mounts
  useEffect(() => {
    startMonitoring();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="vh-100 p-4 ms-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="flex-grow-1 text-center">
          <h1 className="text-primary">Network Traffic Monitor</h1>
        </div>
        <div className="d-flex gap-2">
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

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search domains or IP addresses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoCorrect="off"
            />
          </div>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="blocked">Blocked</option>
            <option value="allowed">Allowed</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div className="col-md-3">
          <div className="d-flex align-items-center">
            <div className={`badge ${isMonitoring ? 'bg-success' : 'bg-secondary'} me-2`}>
              <i className={`bi ${isMonitoring ? 'bi-circle-fill' : 'bi-circle'} me-1`}></i>
              {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Network Logs Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Real-time Network Activity</h5>
          <div className="text-muted small">
            {filteredLogs.length} entries
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: '60vh' }}>
            <table className="table table-striped table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Timestamp</th>
                  <th>Domain</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Direction</th>
                  <th>Protocol</th>
                  <th>Port</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-muted small">{log.timestamp}</td>
                      <td>
                        <div className="fw-semibold">{log.domain}</div>
                        <div className="text-muted small">{log.ip_version}</div>
                      </td>
                      <td className="font-monospace small">{log.ip_address}</td>
                      <td>{getStatusBadge(log.status)}</td>
                      <td>{getDirectionBadge(log.direction)}</td>
                      <td>
                        <span className="badge bg-secondary">{log.protocol}</span>
                      </td>
                      <td>
                        {log.port ? (
                          <span className="badge bg-light text-dark">{log.port}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      {networkLogs.length === 0 ? (
                        <div>
                          <i className="bi bi-activity display-4 text-muted"></i>
                          <p className="mt-2">No network activity logged yet</p>
                          <p className="small">Start monitoring to capture real-time network traffic</p>
                        </div>
                      ) : (
                        <div>
                          <i className="bi bi-search display-4 text-muted"></i>
                          <p className="mt-2">No logs match your search criteria</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 d-flex justify-content-center gap-3">
        <button
          type="button"
          className={`btn ${isMonitoring ? 'btn-warning' : 'btn-success'}`}
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
        >
          <i className={`bi ${isMonitoring ? 'bi-stop-circle' : 'bi-play-circle'} me-1`}></i>
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
        <button
          type="button"
          className="btn btn-outline-info"
          onClick={generateSampleLogs}
          title="Generate sample logs for testing"
        >
          <i className="bi bi-plus-circle me-1"></i>
          Generate Sample Data
        </button>
        <button 
          type="button" 
          className="btn btn-outline-danger"
          onClick={clearLogs}
        >
          <i className="bi bi-trash me-1"></i>
          Clear All Logs
        </button>
      </div>

      {/* Deployment Modal */}
      <DeploymentModal 
        isOpen={showDeployModal} 
        onClose={() => setShowDeployModal(false)} 
      />
    </div>
  );
}

export default Logs; 