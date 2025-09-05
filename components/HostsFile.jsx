import React, { useState, useEffect, useCallback, useMemo } from "react";
import Dexie from 'dexie';
import DeploymentModal from './DeploymentModal';
import SettingsModal from './SettingsModal';
import HostsFileToolbar from './HostsFileToolbar';
import HostsFileTable from './HostsFileTable';
import HostsFileRow from './HostsFileRow';

// Initialize IndexedDB
const db = new Dexie('HostsFileDB');
db.version(1).stores({
  hostEntries: 'id, ip, hostname, enabled, comment, created_at, updated_at',
  metadata: 'key, value',
  allowList: 'ip, hostname'
});

const ROW_HEIGHT = 50;
const VIRTUAL_SCROLL_THRESHOLD = 1000;
const CHUNK_SIZE = 1000;

function HostsFile({ passwordProtection, onUpdatePasswordProtection }) {
  const [hostsEntries, setHostsEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [lastPublishedAt, setLastPublishedAt] = useState(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState({ loaded: 0, total: 0 });
  const [isHostsFileDisabled, setIsHostsFileDisabled] = useState(() => {
    // Try to get the last known status from localStorage
    const saved = localStorage.getItem('hostsFileStatus');
    return saved ? JSON.parse(saved) : false;
  });
  const [isTogglingHostsFile, setIsTogglingHostsFile] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadFromIndexedDB();
    checkHostsFileStatus();
  }, []);

  // Listen for refresh events from deployment modal
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('Received refreshHostsFile event, refreshing hosts file...');
      loadHostsFile();
      // Also check hosts file status since deployment might have changed it
      checkHostsFileStatus();
    };

    window.addEventListener('refreshHostsFile', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshHostsFile', handleRefreshEvent);
    };
  }, []);

  // Check hosts file status only when needed (not periodically)
  // Status will be checked on mount and after relevant operations

  // Check if hosts file is currently disabled
  const checkHostsFileStatus = async () => {
    try {
      let token = localStorage.getItem('api_token');
      if (!token) return;

      const res = await fetch('http://localhost:8080/api/etc/hosts/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        // Token expired, try to get a fresh one
        console.log('Token expired, fetching fresh token...');
        const freshTokenRes = await fetch('http://localhost:8080/api/auth/token');
        if (freshTokenRes.ok) {
          const freshTokenData = await freshTokenRes.json();
          const freshToken = freshTokenData.token;
          localStorage.setItem('api_token', freshToken);
          token = freshToken;
          
          // Retry with fresh token
          const retryRes = await fetch('http://localhost:8080/api/etc/hosts/status', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (retryRes.ok) {
            const data = await retryRes.json();
            if (data.success) {
              const disabled = data.data.disabled || false;
              setIsHostsFileDisabled(disabled);
              localStorage.setItem('hostsFileStatus', JSON.stringify(disabled));
              console.log('Hosts file status updated:', disabled ? 'Disabled' : 'Enabled');
            }
          }
        }
      } else if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const disabled = data.data.disabled || false;
          setIsHostsFileDisabled(disabled);
          // Save to localStorage for persistence
          localStorage.setItem('hostsFileStatus', JSON.stringify(disabled));
          console.log('Hosts file status updated:', disabled ? 'Disabled' : 'Enabled');
        }
      }
    } catch (err) {
      console.log('Could not check hosts file status:', err.message);
    }
  };

  // Manual refresh of hosts file status
  const refreshHostsFileStatus = async () => {
    console.log('Manually refreshing hosts file status...');
    await checkHostsFileStatus();
  };

  // Save data to IndexedDB
  const saveToIndexedDB = async (entries, refreshedAt = null, publishedAt = null) => {
    console.log('=== saveToIndexedDB called ===');
    console.log('Entries to save:', entries.length);
    console.log('Refreshed at:', refreshedAt);
    console.log('Published at:', publishedAt);
    
    try {
      // Clear existing data
      console.log('Clearing existing IndexedDB data...');
      await db.hostEntries.clear();
      await db.metadata.clear();
      console.log('✅ Cleared existing data');
      
      // Insert new entries with order preservation
      if (entries.length > 0) {
        const entriesWithOrder = entries.map((entry, index) => ({
          ...entry,
          orderIndex: index // Add order index to preserve sequence
        }));
        console.log('Saving entries with order indices...');
        await db.hostEntries.bulkAdd(entriesWithOrder);
        console.log('✅ Saved', entries.length, 'entries to IndexedDB');
        
        // Verify the save
        const savedCount = await db.hostEntries.count();
        console.log('✅ Verified saved count:', savedCount);
      } else {
        console.log('No entries to save');
      }
      
      // Save timestamps
      const metadata = [];
      if (refreshedAt) {
        metadata.push({ key: 'last_refreshed_at', value: refreshedAt });
      }
      if (publishedAt) {
        metadata.push({ key: 'last_published_at', value: publishedAt });
      }
      
      if (metadata.length > 0) {
        console.log('Saving metadata...');
        await db.metadata.bulkAdd(metadata);
        console.log('✅ Saved metadata:', metadata.length, 'items');
      }
      
      console.log('=== saveToIndexedDB completed successfully ===');
    } catch (err) {
      console.error('❌ Error saving to IndexedDB:', err);
      console.error('Error details:', err.message, err.stack);
    }
  };

  // Add entries to IndexedDB (for streaming)
  const addEntriesToIndexedDB = async (entries) => {
    try {
      if (entries.length > 0) {
        // Get current count to determine order index
        const currentCount = await db.hostEntries.count();
        const entriesWithOrder = entries.map((entry, index) => ({
          ...entry,
          orderIndex: currentCount + index // Continue from current count
        }));
        await db.hostEntries.bulkAdd(entriesWithOrder);
      }
    } catch (err) {
      console.error('Error adding entries to IndexedDB:', err);
      // Fallback: try individual adds
      try {
        const currentCount = await db.hostEntries.count();
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          try {
            await db.hostEntries.add({
              ...entry,
              orderIndex: currentCount + i
            });
          } catch (addErr) {
            console.warn('Skipping entry due to error:', addErr, entry);
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback IndexedDB add also failed:', fallbackErr);
      }
    }
  };

  // Load data from IndexedDB
  const loadFromIndexedDB = async () => {
    console.log('=== loadFromIndexedDB called ===');
    try {
      console.log('Checking IndexedDB for cached entries...');
      
      // Try to load with orderIndex first
      let entries;
      try {
        entries = await db.hostEntries.orderBy('orderIndex').toArray();
      } catch (orderError) {
        console.log('orderIndex query failed, trying without ordering...');
        // Fallback: try without ordering if orderIndex is not available
        entries = await db.hostEntries.toArray();
        // Sort by id as fallback
        entries.sort((a, b) => {
          const aNum = parseInt(a.id.replace('entry_', '')) || 0;
          const bNum = parseInt(b.id.replace('entry_', '')) || 0;
          return aNum - bNum;
        });
      }
      
      const metadata = await db.metadata.toArray();
      
      if (entries.length > 0) {
        console.log('✅ IndexedDB has', entries.length, 'entries. Loading from cache.');
        setHostsEntries(entries);
        // Load timestamps
        const refreshedMeta = metadata.find(m => m.key === 'last_refreshed_at');
        const publishedMeta = metadata.find(m => m.key === 'last_published_at');
        setLastRefreshedAt(refreshedMeta?.value || null);
        setLastPublishedAt(publishedMeta?.value || null);
        console.log('✅ Successfully loaded from IndexedDB, skipping backend load');
      } else {
        // No cached data, load from backend
        console.log('❌ IndexedDB is empty, will refresh from backend...');
        await loadHostsFile();
      }
    } catch (err) {
      console.error('❌ Error loading from IndexedDB:', err);
      console.error('Error details:', err.message, err.stack);
      // Only load from backend if there's a database error
      console.log('Falling back to backend load due to IndexedDB error');
      await loadHostsFile();
    }
  };

  // Load hosts file from backend using chunked approach
  const loadHostsFile = async () => {
    console.log('Starting loadHostsFile...');
    setLoading(true);
    setError(null);

    try {
      let token = localStorage.getItem('api_token');
      console.log('Token available:', !!token);
      console.log('Token value:', token ? token.substring(0, 10) + '...' : 'null');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      // Test the token first
      console.log('Testing token validity...');
      const testRes = await fetch('http://localhost:8080/api/etc/hosts?page=0&page_size=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (testRes.status === 401) {
        console.log('Token is invalid, fetching fresh token...');
        const freshTokenRes = await fetch('http://localhost:8080/api/auth/token');
        if (freshTokenRes.ok) {
          const freshTokenData = await freshTokenRes.json();
          const freshToken = freshTokenData.token;
          console.log('Fresh token fetched:', !!freshToken);
          localStorage.setItem('api_token', freshToken);
          // Use fresh token for the rest of the function
          token = freshToken;
        } else {
          throw new Error('Failed to fetch fresh token');
        }
      }

      // Try to get count first, but fallback if it fails
      let totalCount = null;
      try {
        console.log('Fetching count...');
        const countRes = await fetch('http://localhost:8080/api/etc/hosts/count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (countRes.ok) {
          const countData = await countRes.json();
          if (countData.success) {
            totalCount = countData.data;
            console.log('Total entries from count:', totalCount);
          }
        }
      } catch (countError) {
        console.log('Count endpoint failed, will load until empty:', countError);
      }



      // Load all entries in chunks
      const allEntries = [];
      const chunkSize = 20000;
      let chunkIndex = 0;
      let hasMoreData = true;
      
      console.log('Loading entries in chunks...');
      
      while (hasMoreData) {
        console.log(`Loading chunk ${chunkIndex + 1} (offset: ${chunkIndex * chunkSize})`);
        
        const chunkRes = await fetch(`http://localhost:8080/api/etc/hosts?page=${chunkIndex}&page_size=${chunkSize}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!chunkRes.ok) {
          throw new Error(`Failed to load chunk ${chunkIndex + 1}: ${chunkRes.status}`);
        }
        
        const chunkData = await chunkRes.json();
        if (!chunkData.success) {
          throw new Error(chunkData.error || `Failed to load chunk ${chunkIndex + 1}`);
        }
        
        const chunkEntries = chunkData.data.data;
        
        // If we got fewer entries than requested, we've reached the end
        if (chunkEntries.length < chunkSize) {
          hasMoreData = false;
        }
        
        allEntries.push(...chunkEntries);
        
        // Update progress
        const estimatedTotal = totalCount || (hasMoreData ? (chunkIndex + 2) * chunkSize : allEntries.length);
        setStreamProgress({ loaded: allEntries.length, total: estimatedTotal });
        
        chunkIndex++;
        
        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log('All entries loaded:', allEntries.length);
      setHostsEntries(allEntries);
      
      // Save to IndexedDB
      const now = new Date().toISOString();
      await saveToIndexedDB(allEntries, now, null);
      setLastRefreshedAt(now);
      
    } catch (err) {
      console.error('Error loading hosts file:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  // Filtering
  useEffect(() => {
    let filtered = hostsEntries;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry =>
        statusFilter === 'enabled' ? entry.enabled : !entry.enabled
      );
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.ip.toLowerCase().includes(searchLower) ||
        entry.hostname.toLowerCase().includes(searchLower)
      );
    }
    setFilteredEntries(filtered);
    setUseVirtualScrolling(filtered.length >= VIRTUAL_SCROLL_THRESHOLD);
  }, [hostsEntries, searchTerm, statusFilter]);

  // Save changes to backend (add new entry example)
  const saveToBackend = async (newEntry) => {
    setIsSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('api_token');
              const res = await fetch('http://localhost:8080/api/etc/hosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEntry)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save entry');
      await loadHostsFile(); // Reload all data
      setHasUnsavedChanges(false);
      setLastPublishedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // UI event handlers
  const onRefresh = useCallback(() => {
    console.log('Refresh button clicked');
    loadHostsFile();
  }, []);

  // Handle individual entry selection
  const handleSelectEntry = useCallback((entryId, enabled) => {
    console.log('Selecting entry:', entryId, 'enabled:', enabled);
    setHostsEntries(prevEntries => {
      const updatedEntries = prevEntries.map(entry => 
        entry.id === entryId ? { ...entry, enabled } : entry
      );
      
      // Save to IndexedDB immediately
      saveToIndexedDB(updatedEntries, lastRefreshedAt, lastPublishedAt);
      
      return updatedEntries;
    });
    setHasUnsavedChanges(true);
  }, [lastRefreshedAt, lastPublishedAt]);

  // Handle select all/none
  const handleSelectAll = useCallback((enabled) => {
    console.log('Selecting all entries:', enabled);
    setHostsEntries(prevEntries => {
      const updatedEntries = prevEntries.map(entry => ({ ...entry, enabled }));
      
      // Save to IndexedDB immediately
      saveToIndexedDB(updatedEntries, lastRefreshedAt, lastPublishedAt);
      
      return updatedEntries;
    });
    setHasUnsavedChanges(true);
  }, [lastRefreshedAt, lastPublishedAt]);

  // Save changes to backend
  const handleSave = useCallback(async () => {
    console.log('Saving changes to backend...');
    setIsSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('api_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get current entries
      const currentEntries = hostsEntries.filter(entry => entry.enabled);
      
      // Call backend to save the enabled entries
      const res = await fetch('http://localhost:8080/api/etc/hosts/build_and_save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ entries: currentEntries })
      });
      
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to save changes');
      }
      
      console.log('✅ Changes saved successfully');
      setHasUnsavedChanges(false);
      setLastPublishedAt(new Date().toISOString());
      
      // Update metadata in IndexedDB
      await saveToIndexedDB(hostsEntries, lastRefreshedAt, new Date().toISOString());
      
    } catch (err) {
      console.error('❌ Error saving changes:', err);
      
      // Provide user-friendly error messages for permission issues
      let userMessage = err.message;
      if (err.message.includes('authentication') || err.message.includes('permission') || err.message.includes('denied')) {
        userMessage = `Authentication required: This action requires administrator privileges. A system dialog should have appeared asking for your password. If you didn't see it, please try again.`;
      }
      
      setError(userMessage);
    } finally {
      setIsSaving(false);
    }
  }, [hostsEntries, lastRefreshedAt]);

  // Toggle hosts file enable/disable
  const handleToggleHostsFile = useCallback(async () => {
    console.log('Toggling hosts file:', isHostsFileDisabled ? 'enable' : 'disable');
    setIsTogglingHostsFile(true);
    setError(null);
    
    try {
      let token = localStorage.getItem('api_token');
      console.log('Token available:', !!token);
      
      if (!token) {
        throw new Error('No authentication token found. Please refresh the page.');
      }

      const action = isHostsFileDisabled ? 'enable' : 'disable';
      
      // Test the token first
      console.log('Testing token validity...');
      const testRes = await fetch('http://localhost:8080/api/etc/hosts?page=0&page_size=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (testRes.status === 401) {
        console.log('Token is invalid, fetching fresh token...');
        const freshTokenRes = await fetch('http://localhost:8080/api/auth/token');
        if (freshTokenRes.ok) {
          const freshTokenData = await freshTokenRes.json();
          const freshToken = freshTokenData.token;
          console.log('Fresh token fetched:', !!freshToken);
          localStorage.setItem('api_token', freshToken);
          // Use fresh token for the toggle request
          token = freshToken;
        } else {
          throw new Error('Failed to fetch fresh token');
        }
      }

      console.log('Making toggle request...');
      const res = await fetch(`http://localhost:8080/api/etc/hosts/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || `Failed to ${action} hosts file`);
      }
      
      console.log(`✅ Hosts file ${action}d successfully`);
      // Refresh the status to get the current state
      await checkHostsFileStatus();
      
    } catch (err) {
      console.error(`❌ Error ${isHostsFileDisabled ? 'enabling' : 'disabling'} hosts file:`, err);
      
      // Provide user-friendly error messages for permission issues
      let userMessage = err.message;
      if (err.message.includes('authentication') || err.message.includes('permission') || err.message.includes('denied')) {
        userMessage = `Authentication required: This action requires administrator privileges. A system dialog should have appeared asking for your password. If you didn't see it, please try again.`;
      }
      
      setError(userMessage);
    } finally {
      setIsTogglingHostsFile(false);
    }
  }, [isHostsFileDisabled]);

  // Debug function to check IndexedDB contents (call from console)
  const debugIndexedDB = async () => {
    try {
      const entries = await db.hostEntries.orderBy('orderIndex').toArray();
      const metadata = await db.metadata.toArray();
      console.log('=== IndexedDB Debug Info ===');
      console.log('Total entries:', entries.length);
      console.log('Total metadata:', metadata.length);
      console.log('First 5 entries:', entries.slice(0, 5));
      console.log('Metadata:', metadata);
      return { entries, metadata };
    } catch (err) {
      console.error('Debug IndexedDB error:', err);
      return null;
    }
  };

  // Expose debug function globally for console access
  React.useEffect(() => {
    window.debugHostDNI = debugIndexedDB;
    console.log('Debug function available: window.debugHostDNI()');
  }, []);

  return (
    <>
      {/* Header Section */}
      <div className="bg-white border-bottom p-4">
        <div className="d-flex justify-content-between align-items-center">
          <div className="w-100">
            <h1 className="text-primary mb-0 fw-bold">Hosts File</h1>
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
      </div>
      
      <div className="p-4">
        <HostsFileToolbar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onRefresh={onRefresh}
          onSave={handleSave}
          onToggleHostsFile={handleToggleHostsFile}
          onOpenSettings={() => setShowSettingsModal(true)}
          isRefreshing={loading}
          isSaving={isSaving}
          isTogglingHostsFile={isTogglingHostsFile}
          isHostsFileDisabled={isHostsFileDisabled}
          hasUnsavedChanges={hasUnsavedChanges}
          hasWritePermissions={true}
          isTauriEnv={true}
        />
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}
        
        {/* Hosts File Status Alert */}
        {isHostsFileDisabled && (
          <div className="alert alert-warning" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Hosts file is currently disabled.</strong> 
            The system is not using any hosts file entries. Click the "Enable" button to restore the hosts file.
          </div>
        )}
        {/* Streaming Progress */}
        {loading && streamProgress.total > 0 && (
          <div className="alert alert-info" role="alert">
            <div className="d-flex align-items-center mb-2">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <strong>Loading your host file entries...</strong>
            </div>
            <div className="progress mb-2" style={{ height: '20px' }}>
              <div 
                className="progress-bar" 
                role="progressbar" 
                style={{ 
                  width: `${(streamProgress.loaded / streamProgress.total) * 100}%` 
                }}
                aria-valuenow={streamProgress.loaded}
                aria-valuemin="0"
                aria-valuemax={streamProgress.total}
              >
                {Math.round((streamProgress.loaded / streamProgress.total) * 100)}%
              </div>
            </div>
            <small className="text-muted">
              Loaded {streamProgress.loaded.toLocaleString()} of {streamProgress.total.toLocaleString()} entries.
            </small>
          </div>
        )}
        {/* Table */}
        <div className="border rounded" style={{ maxHeight: '600px', overflow: 'hidden' }}>
          {/* Table Header */}
          <div className="d-flex align-items-center bg-light border-bottom" style={{ height: '50px' }}>
            <div className="d-flex align-items-center" style={{ width: '50px', paddingLeft: '1rem' }}>
              <input
                type="checkbox"
                className="form-check-input p-2"
                checked={filteredEntries.length > 0 && filteredEntries.every(entry => entry.enabled)}
                onChange={e => handleSelectAll(e.target.checked)}
                disabled={filteredEntries.length === 0}
              />
            </div>
            <div className="d-flex" style={{ width: 'calc(100% - 50px)' }}>
              <div style={{ width: '35%', padding: '0.5rem 1rem' }} className="fw-bold">IP</div>
              <div style={{ width: '55%', padding: '0.5rem 1rem' }} className="fw-bold">Host</div>
              <div style={{ width: '10%', padding: '0.5rem 0.5rem' }} className="fw-bold text-center"></div>
            </div>
          </div>
          {/* Virtual List */}
          <div style={{ height: '550px' }}>
            <HostsFileTable
              filteredEntries={filteredEntries}
              ROW_HEIGHT={ROW_HEIGHT}
              VirtualRow={({ index, style }) => {
                const entry = filteredEntries[index];
                if (!entry) return null;
                return (
                  <div style={style}>
                    <HostsFileRow
                      entry={entry}
                      isHostsFileDisabled={false}
                      handleSelectEntry={handleSelectEntry}
                      addToAllowList={() => {}}
                    />
                  </div>
                );
              }}
              searchTerm={searchTerm}
              isLoading={loading}
            />
          </div>
        </div>
        {/* Footer Stats */}
        {filteredEntries.length > 0 && (
          <div className="mt-3 d-flex justify-content-between align-items-center text-muted small">
            <div>
              <i className="bi bi-list-ul me-1"></i>
              Total Entries: {hostsEntries.length.toLocaleString()}
            </div>
            <div>
              <i className="bi bi-check-circle-fill text-success me-1"></i>
              {filteredEntries.filter(entry => entry.enabled).length.toLocaleString()} enabled,
              <i className="bi bi-x-circle-fill text-danger me-1 ms-2"></i>
              {filteredEntries.filter(entry => !entry.enabled).length.toLocaleString()} disabled
            </div>
          </div>
        )}
        {/* Status indicators at bottom */}
        <div className="mt-3 d-flex justify-content-between text-muted small">
          <div>
            <i className="bi bi-clock me-1"></i>
            Last refreshed: {lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleString() : 'Never'}
          </div>
          <div>
            <i className="bi bi-calendar-check me-1"></i>
            Last published: {lastPublishedAt ? new Date(lastPublishedAt).toLocaleString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Deployment Modal */}
      <DeploymentModal 
        isOpen={showDeployModal} 
        onClose={() => setShowDeployModal(false)} 
      />
      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isBlockServerEnabled={false}
        onToggleBlockServer={() => {}}
        isTauriEnv={false}
        passwordProtection={passwordProtection}
        onUpdatePasswordProtection={onUpdatePasswordProtection}
      />
    </>
  );
}

export default HostsFile; 