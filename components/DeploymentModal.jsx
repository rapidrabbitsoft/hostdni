import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

function DeploymentModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState(['pending', 'pending', 'pending', 'pending', 'pending', 'pending']);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState(null);

  const [blocklistCount, setBlocklistCount] = useState(0);
  const [allowlistCount, setAllowlistCount] = useState(0);
  const [hostFileCount, setHostFileCount] = useState(0);

  const getStepText = (index) => {
    switch (index) {
      case 0:
        return stepStatus[0] === 'success' 
          ? `Download and compile block host list (entries: ${blocklistCount.toLocaleString()})`
          : 'Download and compile block host list';
      case 1:
        return stepStatus[1] === 'success'
          ? `Download and compile the allowed host list (entries: ${allowlistCount.toLocaleString()})`
          : 'Download and compile the allowed host list';
      case 2:
        return stepStatus[2] === 'success'
          ? `Build and compile the host file (entries: ${hostFileCount.toLocaleString()})`
          : 'Build and compile the host file';
      case 3:
        return 'Back up current host file';
      case 4:
        return 'Save the new host file';
      case 5:
        return 'Done';
      default:
        return '';
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);
    setCurrentStep(0);
    setStepStatus(['pending', 'pending', 'pending', 'pending', 'pending', 'pending']);
    setBlocklistCount(0);
    setAllowlistCount(0);
    setHostFileCount(0);

    try {
      // Step 1: Download and compile block lists
      setCurrentStep(0);
      const blocklist = await compileBlockLists();
      console.log('Block list compilation completed. Total entries:', blocklist.length);
      console.log('Block list array:', blocklist);
      setBlocklistCount(blocklist.length);
      setStepStatus(prev => ['success', ...prev.slice(1)]);

      // Step 2: Download and compile allow lists
      setCurrentStep(1);
      const allowlist = await compileAllowLists();
      console.log('Allow list compilation completed. Total entries:', allowlist.length);
      console.log('Allow list array:', allowlist);
      setAllowlistCount(allowlist.length);
      setStepStatus(prev => [prev[0], 'success', ...prev.slice(2)]);

      // Step 3: Build host file
      setCurrentStep(2);
      const masterHostFileList = await buildHostFile(blocklist, allowlist);
      console.log('Host file build completed. Total entries:', masterHostFileList.length);
      setHostFileCount(masterHostFileList.length);
      setStepStatus(prev => [prev[0], prev[1], 'success', ...prev.slice(3)]);

      // Step 4: Backup current host file
      setCurrentStep(3);
      await backupCurrentHostsFile();
      setStepStatus(prev => [prev[0], prev[1], prev[2], 'success', ...prev.slice(4)]);

      // Step 5: Save new host file
      setCurrentStep(4);
      await saveNewHostsFile(masterHostFileList);
      setStepStatus(prev => [prev[0], prev[1], prev[2], prev[3], 'success', ...prev.slice(5)]);

      // Step 6: Done
      setCurrentStep(5);
      setStepStatus(prev => [prev[0], prev[1], prev[2], prev[3], prev[4], 'success']);

      // Close modal after a short delay and redirect to hosts file
      setTimeout(() => {
        onClose();
        // Reset state
        setCurrentStep(0);
        setStepStatus(['pending', 'pending', 'pending', 'pending', 'pending', 'pending']);
        setIsDeploying(false);
        // Redirect to hosts file view
        window.location.hash = '#hosts-file';
        // Trigger a custom event to refresh the hosts file list
        window.dispatchEvent(new CustomEvent('refreshHostsFile'));
      }, 2000);

    } catch (err) {
      setError(`Deployment failed: ${err.message}`);
      setStepStatus(prev => {
        const newStatus = [...prev];
        newStatus[currentStep] = 'error';
        return newStatus;
      });
      setIsDeploying(false);
      
      // Log detailed error for debugging
      console.error('Deployment error details:', err);
    }
  };

  // Helper function to download and verify a file
  const downloadAndVerifyFile = async (url, filename) => {
    try {
      console.log(`Downloading: ${filename} from ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // Verify the content is not empty
      if (!content || content.trim().length === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      // Verify it contains some valid content (not just error pages)
      if (content.includes('404 Not Found') || content.includes('Error') || content.includes('Access Denied')) {
        throw new Error('Downloaded content appears to be an error page');
      }
      
      console.log(`Successfully downloaded: ${filename} (${content.length} bytes)`);
      return content;
    } catch (error) {
      throw new Error(`Failed to download ${filename}: ${error.message}`);
    }
  };

  // Helper function to parse hosts file content and extract hostnames
  const parseHostsContent = (content) => {
    const hostnames = new Set();
    const lines = content.split('\n');
    
    // Items to ignore/filter out
    const IGNORED_HOSTNAMES = [
      'broadcasthost',
      'ip6-localnet', 
      'ip6-mcastprefix',
      'ip6-allnodes',
      'ip6-allrouters',
      'ip6-allhosts',
      'localhost'
    ];
    
    const IGNORED_IPS = [
      '127.0.0.1',
      '::1',
      'localhost',
      '0.0.0.0'
    ];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse IP and hostname
      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 2) {
        const ip = parts[0];
        const hostname = parts[1];
        
        // Skip ignored IPs
        if (IGNORED_IPS.includes(ip)) {
          continue;
        }
        
        // Skip ignored hostnames
        if (IGNORED_HOSTNAMES.includes(hostname)) {
          continue;
        }
        
        // Basic validation
        if (hostname && hostname.length > 0 && !hostname.startsWith('#')) {
          hostnames.add(hostname);
        }
      }
    }
    
    return Array.from(hostnames);
  };

  // Helper function to compile block lists
  const compileBlockLists = async () => {
    const blocklist = new Set();
    
    try {
      console.log('Compiling block lists...');
      
      // TODO: Fetch enabled block source lists from API
      // For now, use some example lists for testing
      const blockSourceLists = [
        {
          name: 'Example Block List 1',
          url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts',
          enabled: true
        },
        {
          name: 'Example Block List 2', 
          url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews/hosts',
          enabled: true
        }
      ];
      
      // Download and process each enabled block source list
      for (const list of blockSourceLists) {
        if (list.enabled) {
          try {
            const content = await downloadAndVerifyFile(list.url, list.name);
            const hostnames = parseHostsContent(content);
            
            // Add hostnames to blocklist
            hostnames.forEach(hostname => blocklist.add(hostname));
            
            console.log(`Added ${hostnames.length} hostnames from ${list.name}`);
          } catch (error) {
            // Stop deployment and show error
            throw new Error(`Block list download failed: ${list.name} - ${error.message}`);
          }
        }
      }
      
      // TODO: Fetch enabled manual block list items
      // For now, add some example manual entries
      const manualBlockList = [
        'example.com',
        'test.com'
      ];
      
      manualBlockList.forEach(hostname => blocklist.add(hostname));
      
      console.log(`Total blocklist entries: ${blocklist.size}`);
      return Array.from(blocklist);
    } catch (error) {
      throw new Error(`Failed to compile block lists: ${error.message}`);
    }
  };

  // Helper function to compile allow lists
  const compileAllowLists = async () => {
    const allowlist = new Set();
    
    try {
      console.log('Compiling allow lists...');
      
      // TODO: Fetch enabled allow source lists from API
      // For now, use some example lists for testing
      const allowSourceLists = [
        {
          name: 'Example Allow List 1',
          url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling/hosts',
          enabled: true
        }
      ];
      
      // Download and process each enabled allow source list
      for (const list of allowSourceLists) {
        if (list.enabled) {
          try {
            const content = await downloadAndVerifyFile(list.url, list.name);
            const hostnames = parseHostsContent(content);
            
            // Add hostnames to allowlist
            hostnames.forEach(hostname => allowlist.add(hostname));
            
            console.log(`Added ${hostnames.length} hostnames from ${list.name}`);
          } catch (error) {
            // Stop deployment and show error
            throw new Error(`Allow list download failed: ${list.name} - ${error.message}`);
          }
        }
      }
      
      // TODO: Fetch enabled manual allow list items
      // For now, add some example manual entries
      const manualAllowList = [
        'google.com',
        'github.com'
      ];
      
      manualAllowList.forEach(hostname => allowlist.add(hostname));
      
      // Add default allow list items
      const DEFAULT_ALLOW_LIST = [
        'broadcasthost',
        'ip6-localnet',
        'ip6-mcastprefix',
        'ip6-allnodes',
        'ip6-allrouters',
        'ip6-allhosts',
        'localhost',
        '0.0.0.0',
      ];
      DEFAULT_ALLOW_LIST.forEach(hostname => allowlist.add(hostname));
      
      console.log(`Total allowlist entries: ${allowlist.size}`);
      return Array.from(allowlist);
    } catch (error) {
      throw new Error(`Failed to compile allow lists: ${error.message}`);
    }
  };

  // Helper function to build host file
  const buildHostFile = async (blocklist, allowlist) => {
    try {
      // Remove items from blocklist that exist in allowlist
      const filteredBlocklist = blocklist.filter(hostname => !allowlist.includes(hostname));
      
      // Build master host file list
      const masterHostFileList = [];
      
      // Add block entries (0.0.0.0 for blocking)
      filteredBlocklist.forEach(hostname => {
        masterHostFileList.push(['0.0.0.0', hostname]);
      });
      
      // TODO: Add custom IP & hostname entries from allow list
      // These should be prepended to the front of the array
      
      console.log('Built host file with', masterHostFileList.length, 'entries');
      return masterHostFileList;
    } catch (error) {
      throw new Error(`Failed to build host file: ${error.message}`);
    }
  };

  // Helper function to backup current hosts file
  const backupCurrentHostsFile = async () => {
    try {
      await invoke('backup_current_hosts_file');
      console.log('Hosts file backed up successfully');
    } catch (error) {
      throw new Error(`Failed to backup hosts file: ${error}`);
    }
  };

  // Helper function to save new hosts file
  const saveNewHostsFile = async (masterHostFileList) => {
    try {
      // Convert array to hosts file content
      let hostsContent = "";
      
      masterHostFileList.forEach(([ip, hostname]) => {
        hostsContent += `${ip}\t${hostname}\n`;
      });
      
      await invoke('save_hosts_file', { hostsContent });
      console.log('Hosts file saved successfully');
    } catch (error) {
      throw new Error(`Failed to save hosts file: ${error}`);
    }
  };

  const getStatusIcon = (status, index) => {
    if (status === 'success') {
      return <i className="bi bi-check-circle-fill text-success"></i>;
    } else if (status === 'error') {
      return <i className="bi bi-x-circle-fill text-danger"></i>;
    } else if (index === currentStep && isDeploying) {
      return <span className="spinner-border spinner-border-sm text-primary"></span>;
    } else {
      return <i className="bi bi-circle text-muted"></i>;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen modal backdrop */}
      <div 
        className="modal-backdrop fade show" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 1040
        }}
        onClick={isDeploying ? undefined : onClose}
      ></div>
      
      {/* Modal container */}
      <div 
        className="modal fade show" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050
        }} 
        tabIndex="-1"
      >
        <div className="modal-dialog" style={{ maxWidth: '70vw', width: '70vw' }}>
          <div className="modal-content shadow-lg border-0">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title mb-0">
                <i className="bi bi-rocket-takeoff me-2"></i>
                Deploy Hosts File
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                disabled={isDeploying}
              ></button>
            </div>
            
            <div className="modal-body p-4">
              <div className="mb-4">
                <p className="text-muted mb-3">
                  Are you ready to save your hosts file? This process will backup your current hosts file and deploy a new one with your selected block and allow lists.
                </p>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}

              <div className="deployment-steps">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className={`d-flex align-items-center p-3 border rounded mb-2 transition-all ${
                      index === currentStep && isDeploying 
                        ? 'border-primary bg-primary bg-opacity-10 shadow-sm' 
                        : 'border-light'
                    }`}
                    style={{
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <div className="me-3">
                      {getStatusIcon(stepStatus[index], index)}
                    </div>
                    <div className="flex-grow-1">
                      <span className={index === currentStep && isDeploying ? 'fw-bold text-primary' : ''}>
                        {getStepText(index)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-footer bg-light border-top">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={isDeploying}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success px-4"
                onClick={handleDeploy}
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Deploying...
                  </>
                ) : (
                  <>
                    <i className="bi bi-rocket-takeoff me-2"></i>
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DeploymentModal; 