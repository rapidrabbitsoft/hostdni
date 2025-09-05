import React, { useState, useEffect, useRef } from "react";
import { Tooltip } from "bootstrap";
import ConfirmationModal from "./ConfirmationModal";
import DeploymentModal from './DeploymentModal';
import { invoke } from "@tauri-apps/api/core";
import dbHelpers from "../src/db";

const DEFAULT_SOURCE_ALLOW_LISTS = [
  [
    "Adware & malware",
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
  ],
]

function AllowLists() {
  const selectRef = useRef(null);

  // Initialize tooltips and bootstrap-select (For Bootstrap 5 - put this in a useEffect hook if using React)
  useEffect(() => {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new Tooltip(tooltipTriggerEl);
    });

    // Initialize bootstrap-select with a longer delay to ensure DOM is ready
    const timer = setTimeout(() => {
      console.log('Initializing bootstrap-select...');
      console.log('jQuery available:', typeof $);
      console.log('Bootstrap available:', typeof $.fn.dropdown);
      console.log('bootstrap-select available:', typeof $.fn.selectpicker);
      console.log('Select elements found:', $('.selectpicker').length);
      
      // Ensure Bootstrap version is set
      if ($.fn.selectpicker && !$.fn.selectpicker.Constructor.BootstrapVersion) {
        $.fn.selectpicker.Constructor.BootstrapVersion = '5';
        console.log('Set Bootstrap version to 5');
      }
      
      if ($('.selectpicker').length > 0 && typeof $.fn.selectpicker === 'function') {
        try {
          $('.selectpicker').selectpicker('destroy');
          console.log('Destroyed existing selectpicker');
        } catch (e) {
          console.log('No existing selectpicker to destroy');
        }
        
        $('.selectpicker').selectpicker({
          liveSearch: true,
          size: 8
        });
        console.log('Initialized selectpicker');
      } else {
        console.log('No selectpicker elements found or bootstrap-select not loaded');
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      // Cleanup bootstrap-select on unmount
      try {
        $('.selectpicker').selectpicker('destroy');
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // States for the modal
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(() => () => {});
  const [modalMessage, setModalMessage] = useState("");

  // Hostname validation function
  const validateHostname = (hostname) => {
    // RFC 1123 compliant hostname regex
    // Allows: letters, digits, hyphens (but not at start/end), dots, up to 253 characters total
    // Each label (part between dots) can be 1-63 characters
    const hostnameRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))*$/;

    // Additional checks
    if (!hostname || hostname.length === 0) {
      return { isValid: false, error: "Hostname cannot be empty" };
    }
    
    if (hostname.length > 253) {
      return { isValid: false, error: "Hostname cannot exceed 253 characters" };
    }
    
    if (!hostnameRegex.test(hostname)) {
      return { isValid: false, error: "Invalid hostname format. Use format like 'example.com' or 'sub.example.com'" };
    }
    
    // Check that it doesn't start or end with a dot
    if (hostname.startsWith('.') || hostname.endsWith('.')) {
      return { isValid: false, error: "Hostname cannot start or end with a dot" };
    }
    
    // Check for consecutive dots
    if (hostname.includes('..')) {
      return { isValid: false, error: "Hostname cannot contain consecutive dots" };
    }
    
    return { isValid: true, error: null };
  };

  const validateIP = (ip) => {
    if (!ip || ip.length === 0) {
      return { isValid: false, error: "IP address cannot be empty" };
    }

    // IPv4 validation regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6 validation regex
    const ipv6Regex = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    if (ipv4Regex.test(ip)) {
      return { isValid: true, error: null };
    }
    
    if (ipv6Regex.test(ip)) {
      return { isValid: true, error: null };
    }
    
    return { isValid: false, error: "Invalid IP address format. Please enter a valid IPv4 or IPv6 address" };
  };

  // Logic for Allowlist (Manual)
  // The states
  const [inputAllow, setInputAllow] = useState("");
  const [inputAllowError, setInputAllowError] = useState("");
  const [searchAllow, setSearchAllow] = useState("");
  const [searchEntries, setSearchEntries] = useState("");
  const [manualAllowList, setManualAllowList] = useState(() => {
    // Initialize from local storage, or default to an empty array
    const saved = localStorage.getItem("manualAllowList");
    return saved ? JSON.parse(saved) : [];
  });

  // State for manual allow list checkboxes
  const [manualAllowStates, setManualAllowStates] = useState(() => {
    const saved = localStorage.getItem("manualAllowStates");
    return saved ? JSON.parse(saved) : {};
  });

  // State for custom entries checkboxes
  const [customEntryStates, setCustomEntryStates] = useState(() => {
    const saved = localStorage.getItem("customEntryStates");
    return saved ? JSON.parse(saved) : {};
  });

  // State for URL checkboxes
  const [urlStates, setUrlStates] = useState(() => {
    const saved = localStorage.getItem("urlStates");
    return saved ? JSON.parse(saved) : {};
  });

  // State for source lists search
  const [searchSourceLists, setSearchSourceLists] = useState("");

  // State for custom allow source lists
  const [customAllowSourceLists, setCustomAllowSourceLists] = useState(() => {
    const saved = localStorage.getItem("customAllowSourceLists");
    return saved ? JSON.parse(saved) : [];
  });

  // State for custom source form
  const [customAllowSourceName, setCustomAllowSourceName] = useState("");
  const [customAllowSourceUrl, setCustomAllowSourceUrl] = useState("");
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Refresh manualAllowList when component is focused or localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("manualAllowList");
      const newList = saved ? JSON.parse(saved) : [];
      setManualAllowList(newList);
    };

    // Listen for storage events (when localStorage changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom event when localStorage is updated from same tab
    const handleManualAllowListUpdated = (event) => {
      console.log('AllowLists received manualAllowListUpdated event:', event.detail);
      setManualAllowList(event.detail.updatedList);
    };
    
    window.addEventListener('manualAllowListUpdated', handleManualAllowListUpdated);
    
    // Also refresh when the component gains focus (for same-tab updates)
    const handleFocus = () => {
      handleStorageChange();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Initial refresh
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('manualAllowListUpdated', handleManualAllowListUpdated);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // For the source file list
  useEffect(() => {
    // Update local storage whenever the manualAllowList changes
    localStorage.setItem("manualAllowList", JSON.stringify(manualAllowList));
    // console.log(manualAllowList);
  }, [manualAllowList]);

  // Save manual allow states to localStorage
  useEffect(() => {
    localStorage.setItem("manualAllowStates", JSON.stringify(manualAllowStates));
  }, [manualAllowStates]);

  // Save custom entry states to localStorage
  useEffect(() => {
    localStorage.setItem("customEntryStates", JSON.stringify(customEntryStates));
  }, [customEntryStates]);

  const handleInputChange2 = (event) => {
    const value = event.target.value;
    setInputAllow(value);
    
    // Real-time validation
    if (value.trim() === "") {
      setInputAllowError("");
    } else {
      const validation = validateHostname(value);
      if (!validation.isValid) {
        setInputAllowError(validation.error);
      } else if (manualAllowList.includes(value)) {
        setInputAllowError("This entry already exists in the list");
      } else {
        setInputAllowError("");
      }
    }
  };

  const addAllowToList = () => {
    if (inputAllow && !manualAllowList.includes(inputAllow)) {
      const updatedList = [...manualAllowList, inputAllow].sort();
      setManualAllowList(updatedList);
      // Set the new entry as enabled by default
      setManualAllowStates(prev => ({
        ...prev,
        [updatedList.length - 1]: true
      }));
      setInputAllow(""); // Clear the input field
    } else {
      console.log("The domain already exists!");
    }
  };

  const addAllowFromList = (index) => {
    const updatedList = manualAllowList.filter((_, i) => i !== index);
    setManualAllowList(updatedList);
  };

  // Handle manual allow checkbox changes
  const handleManualAllowChange = (index, enabled) => {
    setManualAllowStates(prev => ({
      ...prev,
      [index]: enabled
    }));
  };

  // Handle custom entry checkbox changes
  const handleCustomEntryChange = (index, enabled) => {
    setCustomEntryStates(prev => ({
      ...prev,
      [index]: enabled
    }));
  };

  // Logic for the Allow List
  // The necessary states for the Allow List
  const [inputUrl, setInputUrl] = useState("");

  const [urls, setUrls] = useState(() => {
    // Load URLs from local storage or default to an empty array
    const savedUrls = JSON.parse(localStorage.getItem("sourceList2") || "[]");
    return savedUrls;
  });

  const handleInputChange = (event) => {
    setInputUrl(event.target.value);
  };

  useEffect(() => {
    // Update local storage whenever the URLs list changes
    localStorage.setItem("sourceList2", JSON.stringify(urls));
  }, [urls]);

  //
  //
  //
  // Default List logic
  const [inputIp, setInputIp] = useState("");
  const [inputIpError, setInputIpError] = useState("");
  const [inputDomain, setInputDomain] = useState("");
  const [inputDomainError, setInputDomainError] = useState("");
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("defaultEntries");
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem("defaultEntries", JSON.stringify(entries));
  }, [entries]);

  // Handling function

  const handleIpInputChange = (e) => {
    const value = e.target.value;
    setInputIp(value);
    
    // Real-time validation
    if (value.trim() === "") {
      setInputIpError("");
    } else {
      const validation = validateIP(value);
      if (!validation.isValid) {
        setInputIpError(validation.error);
      } else {
        // Check for duplicate IP-hostname combination
        const isDuplicate = entries.some(entry => entry.ip === value && entry.domain === inputDomain);
        if (isDuplicate) {
          setInputIpError("This IP and hostname combination already exists");
        } else {
          setInputIpError("");
        }
      }
    }
  };

  const handleDomainInputChange = (e) => {
    const value = e.target.value;
    setInputDomain(value);
    
    // Real-time validation
    if (value.trim() === "") {
      setInputDomainError("");
    } else {
      const validation = validateHostname(value);
      if (!validation.isValid) {
        setInputDomainError(validation.error);
      } else {
        // Check for duplicate IP-hostname combination
        const isDuplicate = entries.some(entry => entry.ip === inputIp && entry.domain === value);
        if (isDuplicate) {
          setInputDomainError("This IP and hostname combination already exists");
        } else {
          setInputDomainError("");
        }
      }
    }
  };

  const handleAddDefaultEntry = () => {
    // Check for validation errors
    if (inputIpError || inputDomainError) {
      return; // Don't add if there's a validation error
    }
    
    const newEntry = { ip: inputIp, domain: inputDomain };
    const updatedEntries = [...entries, newEntry].sort((a, b) => {
      // First sort by IP address
      const ipComparison = a.ip.localeCompare(b.ip);
      if (ipComparison !== 0) {
        return ipComparison;
      }
      // If IPs are the same, sort by hostname
      return a.domain.localeCompare(b.domain);
    });

    console.log("Added new default entry:", newEntry);
    console.log("Updated defaultEntries list:", updatedEntries);
    
    setEntries(updatedEntries);
    // Set the new entry as enabled by default
    setCustomEntryStates(prev => ({
      ...prev,
      [updatedEntries.length - 1]: true
    }));
    setInputIp("");
    setInputDomain("");
    setInputIpError(""); // Clear any error state
    setInputDomainError(""); // Clear any error state
  };

  // Deleting
  const deleteEntry = (index) => {
    const deletedEntry = entries[index];
    const updatedEntries = entries.filter((_, idx) => idx !== index);
    
    console.log("Deleted default entry:", deletedEntry);
    console.log("Updated defaultEntries list:", updatedEntries);
    
    setEntries(updatedEntries);
  };
  //
  //
  //

  // MasterHostFile building and dependencies
  useEffect(() => {
    // Extracting manual allows from local storage
    const manualAllow = JSON.parse(
      localStorage.getItem("manualAllowList") || "[]"
    );

    // Use only manual allow entries
    const masterHostAllowList = Array.from(
      new Set([
        ...manualAllow,
      ])
    );

    console.log("Updated masterHostsFileAllowList:", masterHostAllowList);

    // Updating local storage with the merged list
    localStorage.setItem(
      "masterHostsFileAllowList",
      JSON.stringify(masterHostAllowList)
    );
  }, [manualAllowList]); // Only depend on manualAllowList

  // Default allow list
  const DEFAULT_ALLOW_LIST = [
    ["127.0.0.1", "localhost"],
    ["127.0.0.1", "localhost.localdomain"],
    ["127.0.0.1", "local"],
    ["255.255.255.255", "broadcasthost"],
    ["::1", "localhost"],
    ["::1", "ip6-localhost"],
    ["::1", "ip6-loopback"],
    ["fe80::1%lo0", "localhost"],
    ["ff00::0", "ip6-localnet"],
    ["ff00::0", "ip6-mcastprefix"],
    ["ff02::1", "ip6-allnodes"],
    ["ff02::2", "ip6-allrouters"],
    ["ff02::3", "ip6-allhosts"],
    ["0.0.0.0", "0.0.0.0"],
  ];

  // State for default allow list checkboxes
  const [defaultAllowStates, setDefaultAllowStates] = useState(() => {
    const saved = localStorage.getItem("defaultAllowStates");
    return saved ? JSON.parse(saved) : {};
  });

  // Handle default allow checkbox changes
  const handleDefaultAllowChange = (index, enabled) => {
    setDefaultAllowStates(prev => ({
      ...prev,
      [index]: enabled
    }));
  };

  // Save default allow states to localStorage
  useEffect(() => {
    localStorage.setItem("defaultAllowStates", JSON.stringify(defaultAllowStates));
  }, [defaultAllowStates]);

  // URL state management
  const handleUrlStateChange = (index, enabled) => {
    setUrlStates(prev => ({
      ...prev,
      [index]: enabled
    }));
  };

  // Save URL states to localStorage
  useEffect(() => {
    localStorage.setItem("urlStates", JSON.stringify(urlStates));
  }, [urlStates]);

  // Save custom allow source lists to localStorage
  useEffect(() => {
    localStorage.setItem("customAllowSourceLists", JSON.stringify(customAllowSourceLists));
  }, [customAllowSourceLists]);

  // Reset dropdown scroll on close
  useEffect(() => {
    const dropdown = document.getElementById('allowSourceListDropdown');
    const dropdownMenu = dropdown?.nextElementSibling;
    
    const handleDropdownHidden = () => {
      if (dropdownMenu) {
        dropdownMenu.scrollTop = 0;
      }
    };

    if (dropdown) {
      dropdown.addEventListener('hidden.bs.dropdown', handleDropdownHidden);
    }

    return () => {
      if (dropdown) {
        dropdown.removeEventListener('hidden.bs.dropdown', handleDropdownHidden);
      }
    };
  }, []);

  // Add URL to list
  const addUrlToList = async (url) => {
    if (url && !urls.includes(url)) {
      const updatedUrls = [...urls, url];
      setUrls(updatedUrls);
      setInputUrl(""); // Clear the input field
    } else {
      console.log("The Source List URL already exists!");
    }
  };

  // Delete URL from list
  const deleteUrlFromList = async (index) => {
    const updatedUrls = urls.filter((_, i) => i !== index);
    setUrls(updatedUrls);
  };

  // Save custom allow source
  const handleSaveCustomAllowSource = async () => {
    if (customAllowSourceName.trim() && customAllowSourceUrl.trim() && validateCustomUrl(customAllowSourceUrl)) {
      const newSource = {
        name: customAllowSourceName.trim(),
        url: customAllowSourceUrl.trim()
      };
      
      const updatedSources = [...customAllowSourceLists, newSource];
      setCustomAllowSourceLists(updatedSources);
      
      // Clear form
      setCustomAllowSourceName("");
      setCustomAllowSourceUrl("");
    }
  };

  // Delete custom allow source
  const handleDeleteCustomAllowSource = async (index) => {
    const updatedSources = customAllowSourceLists.filter((_, i) => i !== index);
    setCustomAllowSourceLists(updatedSources);
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
    // Check if it's a default source list
    const defaultSource = DEFAULT_SOURCE_ALLOW_LISTS.find(([name, defaultUrl]) => defaultUrl === url);
    if (defaultSource) {
      return defaultSource[0];
    }
    
    // Check if it's a custom source list
    const customSource = customAllowSourceLists.find(source => source.url === url);
    if (customSource) {
      return customSource.name;
    }
    
    // Fallback to URL
    return url;
  };

  // Add confirmation for adding an allow
  const confirmAddAllow = () => {
    // Validate the hostname first
    const validation = validateHostname(inputAllow);
    if (!validation.isValid) {
      // Show error message instead of confirmation
      setModalMessage(validation.error);
      setModalAction(() => () => setShowModal(false));
      setShowModal(true);
      return;
    }
    
    setModalMessage("Are you sure you want to add this domain?");
    setModalAction(() => () => addAllowToList());
    setShowModal(true);
  };

  // Add confirmation for deleting an allow
  const confirmDeleteAllow = (index) => {
    setModalMessage("Are you sure you want to delete this domain?");
    setModalAction(() => () => addAllowFromList(index)); // Note: The function name seems like adding, but it's actually used for deletion based on your initial setup
    setShowModal(true);
  };

  return (
    <>
      {/* Header Section */}
      <div className="bg-white border-bottom p-4">
        <div className="d-flex justify-content-between align-items-center">
          <div className="w-100">
            <h1 className="text-primary mb-0 fw-bold">Allow Lists</h1>
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
                className="bi bi-question-circle-fill fs-6 text-muted text-muted align-middle"
              data-bs-toggle="tooltip"
              data-bs-placement="right"
                title="Predefined source lists to be allowed"
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
              id="allowSourceListDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{ 
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6'
              }}
            >
              Select an allow source
            </button>
            <ul className="dropdown-menu w-100 pb-0" aria-labelledby="allowSourceListDropdown" style={{ 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', 
              border: '1px solid #dee2e6',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {/* Default source lists */}
              <li><h6 className="dropdown-header fw-bold text-dark">Default Source Lists</h6></li>
              {DEFAULT_SOURCE_ALLOW_LISTS.map(([name, url], index) => {
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
              {customAllowSourceLists.length > 0 && (
                <>
                  <li><h6 className="dropdown-header fw-bold text-dark">Custom Source Lists</h6></li>
                  {customAllowSourceLists.map((source, index) => {
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
                            className="btn btn-link p-0 text-danger border-0 bg-transparent text-end"
                            type="button"
                            style={{ 
                              fontSize: '0.875rem',
                              textDecoration: 'none',
                              marginLeft: '8px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomAllowSource(index);
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
                      value={customAllowSourceName}
                      onChange={(e) => setCustomAllowSourceName(e.target.value)}
                      style={{ fontSize: '0.875rem' }}
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="url"
                      className={`form-control form-control-sm ${customAllowSourceUrl && !validateCustomUrl(customAllowSourceUrl) ? 'is-invalid' : ''}`}
                      placeholder="Source URL"
                      value={customAllowSourceUrl}
                      onChange={(e) => setCustomAllowSourceUrl(e.target.value)}
                      style={{ fontSize: '0.875rem' }}
                    />
                    {customAllowSourceUrl && !validateCustomUrl(customAllowSourceUrl) && (
                      <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>
                        Please enter a valid URL
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-1">
            <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveCustomAllowSource}
                      disabled={!customAllowSourceName.trim() || !customAllowSourceUrl.trim() || !validateCustomUrl(customAllowSourceUrl)}
                      style={{ fontSize: '0.875rem' }}
            >
                      Save
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setCustomAllowSourceName("");
                        setCustomAllowSourceUrl("");
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

        {/* Source Lists Table */}
        <div className="border rounded" style={{ maxHeight: '400px', overflow: 'hidden' }}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table mb-0" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead className="table-light" style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 1,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                borderBottom: '1px solid #dee2e6'
              }}>
                <tr>
                  <th className="border-0" style={{ width: '50px', padding: '12px 16px' }}>
                    <div className="form-check">
                      <input
                        className="form-check-input p-2"
                        type="checkbox"
                        checked={
                          urls
                            .filter(url => getUrlName(url).toLowerCase().includes(searchSourceLists.toLowerCase()))
                            .length > 0 && 
                          urls
                            .filter(url => getUrlName(url).toLowerCase().includes(searchSourceLists.toLowerCase()))
                            .every(url => {
                              const originalIndex = urls.indexOf(url);
                              return urlStates[originalIndex];
                            })
                        }
                        onChange={(e) => {
                          const newStates = { ...urlStates };
                          urls
                            .filter(url => getUrlName(url).toLowerCase().includes(searchSourceLists.toLowerCase()))
                            .forEach(url => {
                              const originalIndex = urls.indexOf(url);
                              newStates[originalIndex] = e.target.checked;
                            });
                          setUrlStates(newStates);
                        }}
                        style={{ boxShadow: 'none' }}
                      />
                    </div>
                  </th>
                  <th className="border-0 ps-0" colspan="2" style={{ padding: '12px 16px' }}>
                    <div className="d-flex align-items-center">
                      <span className="fw-bold">Source</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {urls
                  .filter(url => getUrlName(url).toLowerCase().includes(searchSourceLists.toLowerCase()))
                  .map((url, index) => {
                    // Find the original index in the unfiltered list
                    const originalIndex = urls.indexOf(url);
                    return (
                      <tr key={originalIndex} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div className="form-check">
                            <input
                              className="form-check-input p-2"
                              type="checkbox"
                              checked={urlStates[originalIndex] || false}
                              onChange={(e) => handleUrlStateChange(originalIndex, e.target.checked)}
                              style={{ boxShadow: 'none' }}
                            />
                          </div>
                        </td>
                        <td className="border-0 ps-0" style={{ padding: '12px 16px' }}>
                          <span>{getUrlName(url)}</span>
                        </td>
                        <td className="text-end" style={{ padding: '12px 16px' }}>
                          <button
                            className="btn btn-link p-0 text-danger border-0 bg-transparent"
                            type="button"
                            style={{
                              fontSize: '0.875rem',
                              textDecoration: 'none'
                            }}
                            onClick={() => deleteUrlFromList(originalIndex)}
                            title="Remove entry"
                          >
                            <i className="bi bi-x-circle"></i>
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

      {/* Manual Allow List */}
      <div className="mt-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold text-primary mb-0">
            Manual Entries{" "}
          <i
              className="bi bi-question-circle-fill fs-6 text-muted align-middle"
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Manually add hostnames to be allowed"
          ></i>
        </h3>

          {/* Search input for manual entries */}
          <div className="d-flex align-items-center">
            <div className="input-group" style={{ width: '300px' }}>
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
            <input
              type="text"
              className="form-control"
                placeholder="Search manual entries..."
                value={searchAllow}
                onChange={(e) => setSearchAllow(e.target.value)}
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
        <div className="mb-3">
          <div className="input-group">
            <input
              type="text"
              className={`form-control ${inputAllowError ? 'is-invalid' : ''}`}
              placeholder="Manually add an allow list entry (e.g., example.com)"
              aria-label="Add new allow"
              value={inputAllow}
              onChange={handleInputChange2}
              style={{
                boxShadow: 'none',
                outline: 'none'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputAllow && !inputAllowError && !manualAllowList.includes(inputAllow)) {
                  const updatedList = [...manualAllowList, inputAllow].sort();
                  setManualAllowList(updatedList);
                  // Set the new entry as enabled by default
                  setManualAllowStates(prev => ({
                    ...prev,
                    [updatedList.length - 1]: true
                  }));
                  setInputAllow(""); // Clear the input field
                  setInputAllowError(""); // Clear any error state
                }
              }}
            />
            <button
              className="btn btn-primary"
              type="button"
              disabled={!!inputAllowError || !inputAllow.trim()}
              style={{
                boxShadow: 'none',
                cursor: 'pointer'
              }}
              onClick={confirmAddAllow}
            >
              <i className="bi bi-plus me-1"></i>
              Add
            </button>
          </div>
          {/* Validation error message */}
          {inputAllowError && (
            <div className="text-danger small mt-2">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              {inputAllowError}
            </div>
          )}
        </div>

        {/* List of Allows with borders */}
        <div className="border rounded" style={{ maxHeight: '400px', overflow: 'hidden' }}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                        manualAllowList
                          .filter(allow => allow.toLowerCase().includes(searchAllow.toLowerCase()))
                          .length > 0 && 
                        manualAllowList
                          .filter(allow => allow.toLowerCase().includes(searchAllow.toLowerCase()))
                          .every(allow => {
                            const originalIndex = manualAllowList.indexOf(allow);
                            return manualAllowStates[originalIndex];
                          })
                      }
                      onChange={(e) => {
                        const newStates = { ...manualAllowStates };
                        manualAllowList
                          .filter(allow => allow.toLowerCase().includes(searchAllow.toLowerCase()))
                          .forEach(allow => {
                            const originalIndex = manualAllowList.indexOf(allow);
                            newStates[originalIndex] = e.target.checked;
                          });
                        setManualAllowStates(newStates);
                      }}
                    />
                  </th>
                  <th className="border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                    Entry
                  </th>
                  <th className="border-0" style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {manualAllowList
                  .filter(allow => allow.toLowerCase().includes(searchAllow.toLowerCase()))
                  .map((allow, index) => {
                    // Find the original index in the unfiltered list
                    const originalIndex = manualAllowList.indexOf(allow);
                    return (
                      <tr key={originalIndex} style={{ borderTop: '1px solid #dee2e6' }}>
                        <td className="ps-3 px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                          <input
                            type="checkbox"
                            className="form-check-input p-2"
                            id={`allow-${originalIndex}`}
                            checked={manualAllowStates[originalIndex] || false}
                            onChange={(e) => handleManualAllowChange(originalIndex, e.target.checked)}
                          />
                        </td>
                        <td className="px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                          <label htmlFor={`allow-${originalIndex}`} className="mb-0">
                            {allow}
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
                            onClick={() => confirmDeleteAllow(originalIndex)}
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

      {/* Default Entries Section */}
      <div className="mt-3 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold text-primary mb-0">
            Custom IP & Hostname Entries{" "}
          <i
              className="bi bi-question-circle-fill fs-6 text-muted align-middle"
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Modifies both the IP and Hostname values."
          ></i>
        </h3>
          
          {/* Search input for custom entries */}
          <div className="d-flex align-items-center">
            <div className="input-group" style={{ width: '300px' }}>
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search custom entries..."
                value={searchEntries}
                onChange={(e) => setSearchEntries(e.target.value)}
                autoCorrect="off"
            style={{
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Input fields for adding new entries */}
        <div className="mb-3">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex gap-3 flex-grow-1">
              <input
                type="text"
                className={`form-control ${inputIpError ? 'is-invalid' : ''}`}
                placeholder="IP4 or IP6"
                value={inputIp}
                onChange={handleIpInputChange}
                autoCorrect="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !inputIpError && !inputDomainError && inputIp.trim() && inputDomain.trim()) {
                    handleAddDefaultEntry();
                  }
                }}
                style={{
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
              <input
                type="text"
                className={`form-control ${inputDomainError ? 'is-invalid' : ''}`}
                placeholder="Hostname"
                value={inputDomain}
                onChange={handleDomainInputChange}
                autoCorrect="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !inputIpError && !inputDomainError && inputIp.trim() && inputDomain.trim()) {
                    handleAddDefaultEntry();
                  }
                }}
                style={{
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={!!inputIpError || !!inputDomainError || !inputIp.trim() || !inputDomain.trim()}
              onClick={handleAddDefaultEntry}
            >
              <i className="bi bi-plus me-1"></i>
              Add
            </button>
          </div>
          {/* Validation error messages */}
          {(inputIpError || inputDomainError) && (
            <div className="text-danger small mt-2">
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              {inputIpError || inputDomainError}
            </div>
          )}
          </div>

          {/* List of Entries */}
          <div>
          {console.log("Current entries:", entries)}
          <div className="border rounded" style={{ maxHeight: '400px', overflow: 'hidden' }}>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                          (() => {
                            const allEntries = [
                              // Custom entries
                              ...entries.map(entry => ({ ...entry, type: 'custom' })),
                              // Default entries
                              ...DEFAULT_ALLOW_LIST.map(([ip, hostname], index) => ({ 
                                ip, 
                                domain: hostname, 
                                type: 'default',
                                defaultIndex: index 
                              }))
                            ];
                            
                            const filteredEntries = allEntries.filter(entry => 
                              entry.ip.toLowerCase().includes(searchEntries.toLowerCase()) ||
                              entry.domain.toLowerCase().includes(searchEntries.toLowerCase())
                            );
                            
                            return filteredEntries.length > 0 && filteredEntries.every(entry => {
                              if (entry.type === 'custom') {
                                return customEntryStates[entries.indexOf(entry)] || false;
                              } else {
                                return defaultAllowStates[entry.defaultIndex] || false;
                              }
                            });
                          })()
                        }
                        onChange={(e) => {
                          const allEntries = [
                            // Custom entries
                            ...entries.map(entry => ({ ...entry, type: 'custom' })),
                            // Default entries
                            ...DEFAULT_ALLOW_LIST.map(([ip, hostname], index) => ({ 
                              ip, 
                              domain: hostname, 
                              type: 'default',
                              defaultIndex: index 
                            }))
                          ];
                          
                          const filteredEntries = allEntries.filter(entry => 
                            entry.ip.toLowerCase().includes(searchEntries.toLowerCase()) ||
                            entry.domain.toLowerCase().includes(searchEntries.toLowerCase())
                          );
                          
                          // Handle custom entries
                          const newCustomStates = { ...customEntryStates };
                          filteredEntries.forEach(entry => {
                            if (entry.type === 'custom') {
                              // Find the correct index in the original entries array
                              const originalIndex = entries.findIndex(e => e.ip === entry.ip && e.domain === entry.domain);
                              if (originalIndex !== -1) {
                                newCustomStates[originalIndex] = e.target.checked;
                              }
                            }
                          });
                          setCustomEntryStates(newCustomStates);
                          
                          // Handle default entries
                          const newDefaultStates = { ...defaultAllowStates };
                          filteredEntries.forEach(entry => {
                            if (entry.type === 'default') {
                              newDefaultStates[entry.defaultIndex] = e.target.checked;
                            }
                          });
                          setDefaultAllowStates(newDefaultStates);
                        }}
                      />
                    </th>
                    <th className="border-0" style={{ borderRight: '1px solid #dee2e6' }}>IP</th>
                    <th className="border-0" style={{ borderRight: '1px solid #dee2e6' }}>Hostname</th>
                    <th className="border-0" style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    // Custom entries
                    ...entries.map(entry => ({ ...entry, type: 'custom' })),
                    // Default entries
                    ...DEFAULT_ALLOW_LIST.map(([ip, hostname], index) => ({ 
                      ip, 
                      domain: hostname, 
                      type: 'default',
                      defaultIndex: index 
                    }))
                  ]
                    .filter(entry => 
                      entry.ip.toLowerCase().includes(searchEntries.toLowerCase()) ||
                      entry.domain.toLowerCase().includes(searchEntries.toLowerCase())
                    )
                    .map((entry, index) => (
                    <tr key={`${entry.type}-${entry.defaultIndex || index}`} style={{ borderTop: '1px solid #dee2e6' }}>
                      <td className="ps-3 px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                        <input
                          type="checkbox"
                          className="form-check-input p-2"
                          id={`custom-entry-${entry.type}-${entry.defaultIndex || index}`}
                          checked={entry.type === 'custom' 
                            ? (customEntryStates[index] || false)
                            : (defaultAllowStates[entry.defaultIndex] || false)
                          }
                          onChange={(e) => {
                            if (entry.type === 'custom') {
                              handleCustomEntryChange(index, e.target.checked);
                            } else {
                              handleDefaultAllowChange(entry.defaultIndex, e.target.checked);
                            }
                          }}
                        />
                      </td>
                      <td className="px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                        <label htmlFor={`custom-entry-${entry.type}-${entry.defaultIndex || index}`} className="mb-0">
                          {entry.ip}
                        </label>
                      </td>
                      <td className="px-1 border-0" style={{ borderRight: '1px solid #dee2e6' }}>
                        <label htmlFor={`custom-entry-${entry.type}-${entry.defaultIndex || index}`} className="mb-0">
                          {entry.domain}
                        </label>
                      </td>
                      <td className="text-end pe-3 px-1 border-0">
                        {entry.type === 'custom' ? (
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
                            onClick={() => deleteEntry(entry.defaultIndex || index)}
                >
                            <i className="bi bi-x-circle" style={{ fontSize: '14px' }}></i>
                </button>
                        ) : (
                          <span className="text-muted small">Default</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {
          modalAction();
          setShowModal(false);
        }}
      >
        {modalMessage}
      </ConfirmationModal>

      {/* Deployment Modal */}
      <DeploymentModal 
        isOpen={showDeployModal} 
        onClose={() => setShowDeployModal(false)} 
      />
    </>
  );
}

export default AllowLists;
