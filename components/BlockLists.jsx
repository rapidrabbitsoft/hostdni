import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { dbHelpers, db } from "../src/db.js";
import ConfirmationModal from "./ConfirmationModal";
import DeploymentModal from './DeploymentModal';

function BlockLists() {
  // State for manual block list
  const [manualBlockList, setManualBlockList] = useState([]);
  const [manualBlockStates, setManualBlockStates] = useState({});
  const [manualEntriesSearch, setManualEntriesSearch] = useState("");
  const [inputBlock, setInputBlock] = useState("");
  const [inputBlockError, setInputBlockError] = useState("");
  const [showDeployModal, setShowDeployModal] = useState(false);

  // State for source lists
  const [urls, setUrls] = useState([]);
  const [urlStates, setUrlStates] = useState({});
  const [searchSourceLists, setSearchSourceLists] = useState("");
  const [customSourceLists, setCustomSourceLists] = useState([]);
  const [customSourceName, setCustomSourceName] = useState("");
  const [customSourceUrl, setCustomSourceUrl] = useState("");

  // State for confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(() => () => {});

  // Load data from IndexedDB on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [manualBlocks, manualStates, sourceUrls, sourceStates, customSources] = await Promise.all([
          dbHelpers.getManualBlocks(),
          dbHelpers.getManualBlockStates(),
          dbHelpers.getSourceUrls(),
          dbHelpers.getSourceUrlStates(),
          dbHelpers.getCustomSourceLists()
        ]);
        
        setManualBlockList(manualBlocks);
        setManualBlockStates(manualStates);
        setUrls(sourceUrls);
        setUrlStates(sourceStates);
        setCustomSourceLists(customSources);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    
    loadData();
  }, []);

  // Validation function for hostname
  const validateHostname = (hostname) => {
    if (!hostname.trim()) {
      return "Hostname cannot be empty";
    }
    
    // Check for invalid characters
    const invalidChars = /[^a-zA-Z0-9.-]/;
    if (invalidChars.test(hostname)) {
      return "Hostname contains invalid characters";
    }
    
    // Check for consecutive dots
    if (hostname.includes("..")) {
      return "Hostname cannot contain consecutive dots";
    }
    
    // Check for leading/trailing dots
    if (hostname.startsWith(".") || hostname.endsWith(".")) {
      return "Hostname cannot start or end with a dot";
    }
    
    return "";
  };

  // Default source block lists
  const DEFAULT_SOURCE_BLOCK_LISTS = [
    ["Adware + Malware", "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts"],
    ["Fake News", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews/hosts"],
    ["Gambling", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling/hosts"],
    ["Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts"],
    ["Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/social/hosts"],
    ["Fakenews + Gambling", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling/hosts"],
    ["Fakenews + Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-porn/hosts"],
    ["Fakenews + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-social/hosts"],
    ["Gambling + Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-porn/hosts"],
    ["Gambling + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-social/hosts"],
    ["Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-social/hosts"],
    ["Fakenews + Gambling + Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts"],
    ["Fakenews + Gambling + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-social/hosts"],
    ["Fakenews + Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-porn-social/hosts"],
    ["Gambling + Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-porn-social/hosts"],
    ["Fakenews + Gambling + Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn-social/hosts"],
    ["Adware + Malware + Fakenews", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews/hosts"],
    ["Adware + Malware + Gambling", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-gambling/hosts"],
    ["Adware + Malware + Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-porn/hosts"],
    ["Adware + Malware + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-social/hosts"],
    ["Adware + Malware + Fakenews + Gambling", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews-gambling/hosts"],
    ["Adware + Malware + Fakenews + Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews-porn/hosts"],
    ["Adware + Malware + Fakenews + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews-social/hosts"],
    ["Adware + Malware + Gambling + Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-gambling-porn/hosts"],
    ["Adware + Malware + Gambling + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-gambling-social/hosts"],
    ["Adware + Malware + Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-porn-social/hosts"],
    ["Adware + Malware + Fakenews + Gambling + Porn", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews-gambling-porn/hosts"],
    ["Adware + Malware + Fakenews + Gambling + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews-gambling-social/hosts"],
    ["Adware + Malware + Fakenews + Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews-porn-social/hosts"],
    ["Adware + Malware + Gambling + Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-gambling-porn-social/hosts"],
    ["Adware + Malware + Fakenews + Gambling + Porn + Social", "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/unified-fakenews-gambling-porn-social/hosts"]
  ];

  // Add URL to list
  const addUrlToList = async (url) => {
    if (!urls.includes(url)) {
      try {
        await dbHelpers.addSourceUrl(url);
        const updatedUrls = [...urls, url];
        setUrls(updatedUrls);
        
        // Set the new entry as enabled by default and save to database
        await dbHelpers.updateSourceUrlState(url, true);
        setUrlStates(prev => ({
          ...prev,
          [url]: true
        }));
      } catch (error) {
        console.error("Error adding source URL to database:", error);
      }
    }
  };

  // Delete URL from list
  const deleteUrl = async (index) => {
    try {
      const urlToDelete = urls[index];
      const updatedUrls = urls.filter((_, i) => i !== index);
      setUrls(updatedUrls);
      
      // Delete from database
      const entries = await db.sourceList.where('url').equals(urlToDelete).toArray();
      if (entries.length > 0) {
        await db.sourceList.delete(entries[0].id);
      }
      
      // Delete the state from database
      await db.sourceUrlStates.where('url').equals(urlToDelete).delete();
      
      // Clean up the state for the deleted entry
      setUrlStates(prev => {
        const newStates = { ...prev };
        delete newStates[urlToDelete];
        return newStates;
      });
    } catch (error) {
      console.error("Error deleting source URL from database:", error);
    }
  };

  // Handle input change for manual block list
  const handleInputChange2 = (event) => {
    const value = event.target.value;
    setInputBlock(value);
    
    if (value.trim()) {
      const error = validateHostname(value);
      setInputBlockError(error);
    } else {
      setInputBlockError("");
    }
  };

  // Handle block state change
  const handleBlockStateChange = async (index, enabled) => {
    try {
      const domain = manualBlockList[index];
      await dbHelpers.updateManualBlockState(domain, enabled);
      setManualBlockStates(prev => ({
        ...prev,
        [domain]: enabled
      }));
    } catch (error) {
      console.error("Error updating block state in database:", error);
    }
  };

  // Add block to list
  const addBlockToList = async () => {
    if (inputBlock && !manualBlockList.includes(inputBlock)) {
      try {
        await dbHelpers.addManualBlock(inputBlock);
        const updatedList = [...manualBlockList, inputBlock].sort();
        setManualBlockList(updatedList);
        
        // Set the new entry as enabled by default and save to database
        await dbHelpers.updateManualBlockState(inputBlock, true);
        setManualBlockStates(prev => ({
          ...prev,
          [inputBlock]: true
        }));
        
        setInputBlock(""); // Clear the input field
        setInputBlockError(""); // Clear any error state
      } catch (error) {
        console.error("Error adding manual block to database:", error);
      }
    } else {
      console.log("The domain already exists!");
    }
  };

  // Delete block from list
  const deleteBlockFromList = async (index) => {
    try {
      const domainToDelete = manualBlockList[index];
      const updatedList = manualBlockList.filter((_, i) => i !== index);
      setManualBlockList(updatedList);
      
      // Delete from database
      const entries = await db.manualBlockList.where('domain').equals(domainToDelete).toArray();
      if (entries.length > 0) {
        await db.manualBlockList.delete(entries[0].id);
      }
      
      // Delete the state from database
      await db.manualBlockStates.where('domain').equals(domainToDelete).delete();
      
      // Clean up the state for the deleted entry
      setManualBlockStates(prev => {
        const newStates = { ...prev };
        delete newStates[domainToDelete];
        return newStates;
      });
    } catch (error) {
      console.error("Error deleting manual block from database:", error);
    }
  };

  // Save custom source
  const handleSaveCustomSource = async () => {
    if (customSourceName.trim() && customSourceUrl.trim() && validateCustomUrl(customSourceUrl)) {
      try {
        const newSource = { name: customSourceName, url: customSourceUrl };
        await dbHelpers.addCustomSourceList(newSource);
        setCustomSourceLists(prev => [...prev, newSource]);
        setCustomSourceName("");
        setCustomSourceUrl("");
      } catch (error) {
        console.error("Error saving custom source:", error);
      }
    }
  };

  // Delete custom source
  const handleDeleteCustomSource = async (index) => {
    try {
      const sourceToDelete = customSourceLists[index];
      const updatedSources = customSourceLists.filter((_, i) => i !== index);
      setCustomSourceLists(updatedSources);
      
      // Delete from database
      await dbHelpers.deleteCustomSourceList(sourceToDelete);
    } catch (error) {
      console.error("Error deleting custom source:", error);
    }
  };

  // Validate custom URL
  const validateCustomUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Get URL name for display
  const getUrlName = (url) => {
    // First try exact match
    const defaultEntry = DEFAULT_SOURCE_BLOCK_LISTS.find(([name, defaultUrl]) => defaultUrl === url);
    if (defaultEntry) {
      return defaultEntry[0];
    }
    
    // Try custom source lists
    const customEntry = customSourceLists.find(source => source.url === url);
    if (customEntry) {
      return customEntry.name;
    }
    
    // Try to extract a meaningful name from the URL
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length > 0) {
        // Try to use the last path segment as name
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart !== 'hosts') {
          return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
        }
      }
      
      // Fallback to hostname
      if (hostname && hostname !== 'raw.githubusercontent.com') {
        return hostname.replace(/^www\./, '');
      }
    } catch (e) {
      // If URL parsing fails, try to extract name from the URL string
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart !== 'hosts') {
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
      }
    }
    
    // Final fallback
    return url;
  };

  // Handle URL state change
  const handleUrlStateChange = async (index, enabled) => {
    try {
      const url = urls[index];
      await dbHelpers.updateSourceUrlState(url, enabled);
      setUrlStates(prev => ({
        ...prev,
        [url]: enabled
      }));
    } catch (error) {
      console.error("Error updating URL state in database:", error);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-bottom p-4">
        <div className="d-flex justify-content-between align-items-center">
          <div className="w-100">
            <h1 className="text-primary mb-0 fw-bold">Block Lists</h1>
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

      {/* Source List Section */}
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold text-primary mb-0">
            Source Lists{" "}
            <i
              className="bi bi-question-circle-fill fs-6 text-muted align-middle"
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              title="Predefined source lists to be blocked"
            ></i>
          </h3>

          {/* Search input for source lists */}
          <div className="d-flex align-items-center">
            <div className="input-group" style={{ width: '300px' }}>
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search source lists..."
                value={searchSourceLists}
                onChange={(e) => setSearchSourceLists(e.target.value)}
                autoCorrect="off"
                style={{
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Source List Dropdown */}
        <div className="mb-4">
          <div className="dropdown">
            <button
              className="btn w-100 text-start"
              type="button"
              id="sourceListDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{ 
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6'
              }}
            >
              Select a block source list
            </button>
            <ul className="dropdown-menu w-100 pb-0" aria-labelledby="sourceListDropdown" style={{ 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', 
              border: '1px solid #dee2e6',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {/* Default source lists */}
              <li><h6 className="dropdown-header fw-bold text-dark">Default Source Lists</h6></li>
              {DEFAULT_SOURCE_BLOCK_LISTS.map(([name, url], index) => {
                const isSelected = urls.includes(url);
                return (
                  <li key={index}>
                    <button
                      className="dropdown-item"
                      type="button"
                      style={{ 
                        boxShadow: 'none',
                        opacity: isSelected ? 0.5 : 1,
                        cursor: isSelected ? 'not-allowed' : 'pointer',
                        paddingLeft: '1.5rem'
                      }}
                      disabled={isSelected}
                      onClick={() => {
                        if (!isSelected) {
                          addUrlToList(url);
                        }
                      }}
                    >
                      {name}
                    </button>
                  </li>
                );
              })}

              {/* Custom source lists */}
              {customSourceLists.length > 0 && (
                <>
                  <li><h6 className="dropdown-header fw-bold text-dark">Custom Source Lists</h6></li>
                  {customSourceLists.map((source, index) => {
                    const isSelected = urls.includes(source.url);
                    return (
                      <li key={`custom-${index}`}>
                        <div className="dropdown-item d-flex justify-content-between align-items-center" style={{ 
                          boxShadow: 'none',
                          backgroundColor: 'transparent',
                          '--bs-dropdown-item-hover-bg': 'transparent',
                          paddingLeft: '1.5rem'
                        }}>
                          <button
                            className="btn btn-link p-0 text-start border-0 bg-transparent text-dark"
                            type="button"
                            style={{ 
                              opacity: isSelected ? 0.5 : 1,
                              cursor: isSelected ? 'not-allowed' : 'pointer',
                              textDecoration: 'none',
                              flex: 1,
                              pointerEvents: isSelected ? 'none' : 'auto'
                            }}
                            disabled={isSelected}
                            onClick={() => {
                              if (!isSelected) {
                                addUrlToList(source.url);
                              }
                            }}
                          >
                            {source.name} (Custom)
                          </button>
                          <button
                            className="btn btn-link p-0 text-danger border-0 bg-transparent"
                            type="button"
                            style={{ 
                              fontSize: '0.875rem',
                              textDecoration: 'none',
                              marginLeft: '8px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomSource(index);
                            }}
                            title="Remove custom source"
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </>
              )}
              
              {/* Add Custom Form */}
              <li>
                <div className="p-4" style={{ backgroundColor: '#f8f9fa', marginTop: '10px', borderTop: '1px solid #dee2e6' }}>
                  <h6 className="dropdown-header mb-2 fw-bold">Add Custom Source List</h6>
                  <div className="mb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Source name"
                      value={customSourceName}
                      onChange={(e) => setCustomSourceName(e.target.value)}
                      style={{ fontSize: '0.875rem' }}
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="url"
                      className={`form-control form-control-sm ${customSourceUrl && !validateCustomUrl(customSourceUrl) ? 'is-invalid' : ''}`}
                      placeholder="Source URL"
                      value={customSourceUrl}
                      onChange={(e) => setCustomSourceUrl(e.target.value)}
                      style={{ fontSize: '0.875rem' }}
                    />
                    {customSourceUrl && !validateCustomUrl(customSourceUrl) && (
                      <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>
                        Please enter a valid URL
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveCustomSource}
                      disabled={!customSourceName.trim() || !customSourceUrl.trim() || !validateCustomUrl(customSourceUrl)}
                      style={{ fontSize: '0.875rem' }}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setCustomSourceName("");
                        setCustomSourceUrl("");
                      }}
                      style={{ fontSize: '0.875rem' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* List of URLs */}
        <div>
          <div className="border rounded">
            <table className="table mb-0" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead className="table-light" style={{ 
                position: 'sticky', 
                top: 0, 
                backgroundColor: 'white', 
                zIndex: 1,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                borderBottom: '2px solid #dee2e6'
              }}>
                <tr>
                  <th className="ps-3 border-0" style={{ width: '50px', borderRight: '1px solid #dee2e6' }}>
                    <input
                      type="checkbox"
                      className="form-check-input p-2"
                      ref={(checkbox) => {
                        if (checkbox) {
                          const filteredUrls = urls.filter(url => 
                            getUrlName(url).toLowerCase().includes(searchSourceLists.toLowerCase())
                          );
                          const checkedCount = filteredUrls.filter(url => urlStates[url]).length;
                          
                          if (filteredUrls.length === 0) {
                            checkbox.indeterminate = false;
                            checkbox.checked = false;
                          } else if (checkedCount === 0) {
                            checkbox.indeterminate = false;
                            checkbox.checked = false;
                          } else if (checkedCount === filteredUrls.length) {
                            checkbox.indeterminate = false;
                            checkbox.checked = true;
                          } else {
                            checkbox.indeterminate = true;
                            checkbox.checked = false;
                          }
                        }
                      }}
                      onChange={async (e) => {
                        const newStates = { ...urlStates };
                        const filteredUrls = urls
                          .filter(url => getUrlName(url).toLowerCase().includes(searchSourceLists.toLowerCase()));
                        
                        console.log('Header checkbox clicked:', e.target.checked);
                        console.log('Filtered URLs:', filteredUrls);
                        console.log('Current states:', urlStates);
                        
                        // Update database for each URL
                        for (const url of filteredUrls) {
                          try {
                            await dbHelpers.updateSourceUrlState(url, e.target.checked);
                            newStates[url] = e.target.checked;
                            console.log(`Updated ${url} to ${e.target.checked}`);
                          } catch (error) {
                            console.error("Error updating URL state in database:", error);
                          }
                        }
                        
                        console.log('New states:', newStates);
                        setUrlStates(newStates);
                      }}
                    />
                  </th>
                  <th className="border-0 fw-semibold" style={{ borderRight: '1px solid #dee2e6' }}>Source</th>
                  <th className="border-0" style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {urls
                  .filter(url => getUrlName(url).toLowerCase().includes(searchSourceLists.toLowerCase()))
                  .map((url, index) => {
                    // Find the original index in the unfiltered list
                    const originalIndex = urls.indexOf(url);
                    return (
                      <tr key={originalIndex} style={{ borderTop: '1px solid #dee2e6' }}>
                        <td className="ps-3 px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                          <input
                            type="checkbox"
                            className="form-check-input p-2"
                            id={`url-${originalIndex}`}
                            checked={urlStates[url] || false}
                            onChange={(e) => handleUrlStateChange(originalIndex, e.target.checked)}
                          />
                        </td>
                        <td className="px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                          <label htmlFor={`url-${originalIndex}`} className="mb-0">
                            {getUrlName(url)}
                          </label>
                        </td>
                        <td className="text-end pe-3 px-1 border-0">
                          <button
                            className="btn btn-sm"
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#dc3545',
                              padding: '0.375rem 0.5rem',
                              minWidth: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={() => deleteUrl(originalIndex)}
                            title="Remove source list"
                          >
                            <i className="bi bi-x-circle" style={{ fontSize: '14px' }}></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Block List */}
      <div className="mt-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold text-primary mb-0">
            Manual Entries{" "}
            <i
              className="bi bi-question-circle-fill fs-6 text-muted align-middle"
              data-bs-toggle="tooltip"
              data-bs-placement="right"
              title="Manually add hostnames to be blocked"
            ></i>
          </h3>
            
          {/* Search input for manual entries */}
          <div className="d-flex align-items-center">
            <div className="input-group" style={{ width: '300px' }}>
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search manual entries..."
                value={manualEntriesSearch}
                onChange={(e) => setManualEntriesSearch(e.target.value)}
                autoCorrect="off"
                style={{
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
          
        {/* Input field and Add button */}
        <div className="mb-4">
          <div className="input-group">
            <input
              type="text"
              className={`form-control ${inputBlockError ? 'is-invalid' : ''}`}
              placeholder="Enter domain to block (e.g., example.com)"
              aria-label="Add new block"
              value={inputBlock}
              onChange={handleInputChange2}
              autoCorrect="off"
              style={{
                boxShadow: 'none',
                outline: 'none'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputBlock && !inputBlockError && !manualBlockList.includes(inputBlock)) {
                  addBlockToList();
                }
              }}
            />
            <button
              className="btn btn-primary"
              type="button"
              disabled={!!inputBlockError || !inputBlock.trim()}
              style={{
                boxShadow: 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (inputBlock && !inputBlockError && !manualBlockList.includes(inputBlock)) {
                  addBlockToList();
                }
              }}
            >
              <i className="bi bi-plus me-1"></i>
              Add
            </button>
          </div>
          {/* Validation error message */}
          {inputBlockError && (
            <div className="text-danger small mt-2">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              {inputBlockError}
            </div>
          )}
        </div>

        {/* List of Blocks with borders */}
        <div className="border rounded">
          <table className="table mb-0" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead className="table-light" style={{ 
              position: 'sticky', 
              top: 0, 
              backgroundColor: 'white', 
              zIndex: 1,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              borderBottom: '2px solid #dee2e6'
            }}>
              <tr>
                <th className="ps-3 border-0" style={{ width: '50px', borderRight: '1px solid #dee2e6' }}>
                  <input
                    type="checkbox"
                    className="form-check-input p-2"
                    checked={
                      manualBlockList
                        .filter(block => 
                          block.toLowerCase().includes(manualEntriesSearch.toLowerCase())
                        )
                        .length > 0 && 
                      manualBlockList
                        .filter(block => 
                          block.toLowerCase().includes(manualEntriesSearch.toLowerCase())
                        )
                        .every(block => {
                          return manualBlockStates[block];
                        })
                    }
                    onChange={async (e) => {
                      const newStates = { ...manualBlockStates };
                      const filteredBlocks = manualBlockList
                        .filter(block => 
                          block.toLowerCase().includes(manualEntriesSearch.toLowerCase())
                        );
                      
                      // Update database for each block
                      for (const block of filteredBlocks) {
                        try {
                          await dbHelpers.updateManualBlockState(block, e.target.checked);
                          newStates[block] = e.target.checked;
                        } catch (error) {
                          console.error("Error updating block state in database:", error);
                        }
                      }
                      
                      setManualBlockStates(newStates);
                    }}
                  />
                </th>
                <th className="border-0 fw-semibold" style={{ borderRight: '1px solid #dee2e6' }}>Domain</th>
                <th className="border-0" style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {manualBlockList
                .filter(block => 
                  block.toLowerCase().includes(manualEntriesSearch.toLowerCase())
                )
                .map((block, index) => {
                  const originalIndex = manualBlockList.indexOf(block);
                  return (
                    <tr key={originalIndex} style={{ borderTop: '1px solid #dee2e6' }}>
                      <td className="ps-3 px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                        <input
                          type="checkbox"
                          className="form-check-input p-2"
                          id={`block-${originalIndex}`}
                          checked={manualBlockStates[block] || false}
                          onChange={(e) => handleBlockStateChange(originalIndex, e.target.checked)}
                        />
                      </td>
                      <td className="px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                        <label htmlFor={`block-${originalIndex}`} className="mb-0">
                          {block}
                        </label>
                      </td>
                      <td className="text-end pe-3 px-1 border-0">
                        <button
                          className="btn btn-sm"
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#dc3545',
                            padding: '0.375rem 0.5rem',
                            minWidth: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={() => deleteBlockFromList(originalIndex)}
                          title="Remove entry"
                        >
                          <i className="bi bi-x-circle" style={{ fontSize: '14px' }}></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        show={showConfirmationModal}
        onHide={() => setShowConfirmationModal(false)}
        onConfirm={() => {
          confirmAction(); // Executes the action set by the confirmation request functions
        }}
        children={confirmationMessage}
      />

      {/* Deployment Modal */}
      <DeploymentModal 
        isOpen={showDeployModal} 
        onClose={() => setShowDeployModal(false)} 
      />
    </>
  );
}

export default BlockLists; 