import React, { useState, useEffect } from "react";
import { Tooltip } from "bootstrap";
import ConfirmationModal from "./ConfirmationModal";

function BlockLists() {
  // Initialize tooltips (For Bootstrap 5 - put this in a useEffect hook if using React)
  useEffect(() => {
    var tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new Tooltip(tooltipTriggerEl);
    });
  }, []);

  const [selectedUrl, setSelectedUrl] = useState("");

  // Modal logic (Manual one)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(() => () => {});

  const requestAddDomainConfirmation = (domain) => {
    setConfirmationMessage(
      `Are you sure you want to add this domain: ${domain}?`
    );
    setConfirmAction(() => () => addDomainToList(domain));
    setShowConfirmationModal(true);
  };

  const addDomainToList = () => {
    if (inputBlock && !manualBlockList.includes(inputBlock)) {
      const updatedList = [...manualBlockList, inputBlock];
      setManualBlockList(updatedList);
      setInputBlock(""); // Optionally clear the input field after addition
      setShowConfirmationModal(false); // Close the modal
    } else {
      console.log("The domain already exists!");
    }
  };

  const requestDeleteDomainConfirmation = (index) => {
    setConfirmationMessage("Are you sure you want to delete this domain?");
    setConfirmAction(() => () => deleteDomainFromList(index));
    setShowConfirmationModal(true);
  };

  const deleteDomainFromList = (index) => {
    const updatedList = manualBlockList.filter((_, i) => i !== index);
    setManualBlockList(updatedList);
    setShowConfirmationModal(false); // Close the modal
  };
  //
  //
  //

  // Modal

  const requestAddUrlConfirmation = (url) => {
    setConfirmationMessage(`Are you sure you want to add this URL: ${url}?`);
    setConfirmAction(() => () => addUrlToList(url));
    setShowConfirmationModal(true);
  };

  const addUrlToList = (url) => {
    if (url && !urls.includes(url)) {
      fetchAndProcessURL(url);
      const updatedUrls = [...urls, url];
      setUrls(updatedUrls);
      setSelectedUrl(""); // Reset the dropdown
      // Optionally, if you need to fetch and process the URL
      setShowConfirmationModal(false);
    } else {
      console.log("The URL already exists in the list!");
    }
  };

  const handleSelectChange = (event) => {
    const { value } = event.target;
    if (value !== "custom") {
      requestAddUrlConfirmation(value);
    } else {
      setSelectedUrl(value); // Set for custom URL input
    }
  };

  const requestDeleteUrlConfirmation = (index) => {
    setConfirmationMessage(`Are you sure you want to delete this URL?`);
    setConfirmAction(() => () => deleteUrlFromList(index));
    setShowConfirmationModal(true);
  };

  const deleteUrlFromList = (index) => {
    const updatedUrls = urls.filter((_, i) => i !== index);
    setUrls(updatedUrls);
    // Rebuild the domains list after a URL is deleted
    rebuildDomainsList(updatedUrls);
    setShowConfirmationModal(false);
  };

  const deleteUrl = (index) => {
    requestDeleteUrlConfirmation(index);
  };

  // Dropdown List Values
  const DEFAULT_SOURCE_BLOCK_LISTS = [
    [
      "Adware & malware",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    ],
    [
      "Fakenews",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews/hosts",
    ],
    [
      "Gambling",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling/hosts",
    ],
    [
      "Porn",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts",
    ],
    [
      "Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/social-only/hosts",
    ],
    [
      "Fakenews & Gambling",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling/hosts",
    ],
    [
      "Fakenews & Porn",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-porn/hosts",
    ],
    [
      "Fakenews & Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-social/hosts",
    ],
    [
      "Gambling & Porn",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-porn/hosts",
    ],
    [
      "Gambling + Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-social/hosts",
    ],
    [
      "Porn & Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-social/hosts",
    ],
    [
      "Fakenews & Gambling & Porn",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts",
    ],
    [
      "Fakenews & Gambling & Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-social/hosts",
    ],
    [
      "Fakenews & Porn & Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-porn-social/hosts",
    ],
    [
      "Gambling & Porn & Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-porn-social/hosts",
    ],
    [
      "Fakenews & Gambling & Porn & Social",
      "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn-social/hosts",
    ],
  ];

  //
  //
  // Logic for the Block List
  // The necessary states for the Block List
  const [inputUrl, setInputUrl] = useState("");

  const [urls, setUrls] = useState(() => {
    // Load URLs from local storage or default to an empty array
    const savedUrls = JSON.parse(localStorage.getItem("sourceList") || "[]");
    return savedUrls;
  });

  // Used for creating the SourceList
  useEffect(() => {
    // Update local storage whenever the URLs list changes
    localStorage.setItem("sourceList", JSON.stringify(urls));
  }, [urls]);

  // to create the Block Domains' list
  const [domainsBlock, setDomainsBlock] = useState(() => {
    // Initialize state from localStorage or default to an empty array
    const saved = localStorage.getItem("domainsBlock");
    return saved ? JSON.parse(saved) : [];
  });

  // To track the changes in thhe domains block
  useEffect(() => {
    // Update localStorage whenever domainsBlock changes
    localStorage.setItem("domainsBlock", JSON.stringify(domainsBlock));
  }, [domainsBlock]);

  // // For the drop-down list
  // const handleSelectChange = (event) => {
  //   const { value } = event.target;
  //   setSelectedUrl(value); // Update the selectedUrl state with the chosen option
  //   // Check if the selected value is a valid URL and not the custom URL option
  //   if (value !== "custom" && value) {
  //     // Fetch and process the URL to update the block list
  //     fetchAndProcessURL(value);
  //     const updatedUrls = [...urls, value];
  //     setUrls(updatedUrls);
  //   }
  // };

  // To add the url path to the list
  const handleButtonClick = () => {
    if (inputUrl && !urls.includes(inputUrl)) {
      // const updatedUrls = [...urls, inputUrl];
      // setUrls(updatedUrls);
      // fetchAndProcessURL(inputUrl);
      // setInputUrl(""); // Clear the input field
      requestAddUrlConfirmation(inputUrl);
    } else {
      // A modal showing that the url already exists
      console.log("The Source List URL already exists!");
    }
  };

  // const deleteUrl = (index) => {
  //   const updatedUrls = urls.filter((_, i) => i !== index);
  //   setUrls(updatedUrls);
  //   // Rebuild the domains list after a URL is deleted
  //   rebuildDomainsList(updatedUrls);
  // };

  // Handler for when the custom URL input field loses focus
  const handleInputBlur = () => {
    // Check if the inputUrl is empty and if so, reset selectedUrl
    if (!inputUrl.trim()) {
      setSelectedUrl(""); // This hides the input field based on your conditional rendering logic
    }
  };

  // Acts on deletion to create a new array
  const updateDomainsInLocalStorage = (newDomains) => {
    const existingDomains = JSON.parse(
      localStorage.getItem("domainsBlock") || "[]"
    );
    const updatedDomains = Array.from(
      new Set([...existingDomains, ...newDomains])
    );
    setDomainsBlock(updatedDomains);
    localStorage.setItem("domainsBlock", JSON.stringify(updatedDomains));
    console.log(updatedDomains);
  };

  // Acts to initialize the fetching process for addition/deletion
  const fetchAndProcessURL = (url) => {
    fetch(url, { headers: { Accept: "text/plain" } })
      .then((response) => response.text())
      .then((text) => {
        const newDomains = processTextForDomains(text);
        updateDomainsInLocalStorage(newDomains); // Update domainsBlock in localStorage
      })
      .catch((error) => {
        console.error("Error fetching or processing URL:", error);
      });
  };

  // Acts after deletion
  const rebuildDomainsList = async (updatedUrls) => {
    const fetchPromises = updatedUrls.map(
      (url) =>
        new Promise((resolve) => {
          fetch(url, { headers: { Accept: "text/plain" } })
            .then((response) => response.text())
            .then((text) => {
              const newDomains = processTextForDomains(text);
              resolve(newDomains);
            })
            .catch((error) => {
              console.error("Error fetching or processing URL:", error);
              resolve([]);
            });
        })
    );

    try {
      const results = await Promise.all(fetchPromises);
      const allDomains = [].concat(...results); // Flatten the array of arrays
      localStorage.setItem(
        "domainsBlock",
        JSON.stringify(Array.from(new Set(allDomains)))
      );
      // console.log(allDomains);
    } catch (error) {
      console.error("Error rebuilding domains list:", error);
    }
  };

  // Function which process the url to extract the domains
  const processTextForDomains = (text) => {
    const newDomains = [];
    const lines = text.split("\n");
    lines.forEach((line) => {
      if (!line.startsWith("#") && line.trim() !== "") {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          newDomains.push(parts[1]);
        }
      }
    });
    return newDomains;
  };

  //
  //
  //
  // Logic for Blocklist (Manual)
  // The states
  const [inputBlock, setInputBlock] = useState("");
  const [manualBlockList, setManualBlockList] = useState(() => {
    // Initialize from local storage, or default to an empty array
    const saved = localStorage.getItem("manualBlockList");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Update local storage whenever the manualBlockList changes
    localStorage.setItem("manualBlockList", JSON.stringify(manualBlockList));
    console.log(manualBlockList);
  }, [manualBlockList]);

  const handleInputChange2 = (event) => {
    setInputBlock(event.target.value);
  };

  const addBlockToList = () => {
    if (inputBlock && !manualBlockList.includes(inputBlock)) {
      const updatedList = [...manualBlockList, inputBlock];
      setManualBlockList(updatedList);
      setInputBlock(""); // Clear the input field
    } else {
      console.log("The domain already exists!");
    }
  };

  const deleteBlockFromList = (index) => {
    const updatedList = manualBlockList.filter((_, i) => i !== index);
    setManualBlockList(updatedList);
  };

  //
  //
  //

  const [masterHostFile, setMasterHostFile] = useState(() => {
    // Load the masterHostFile data from localStorage, or default to an empty array
    const saved = localStorage.getItem("masterHostBlockList");
    return saved ? JSON.parse(saved) : [];
  });

  // Logic for the Master Host File
  useEffect(() => {
    const masterHostsFileAllowList = JSON.parse(
      localStorage.getItem("masterHostsFileAllowList") || "[]"
    );

    const manualBlocks = JSON.parse(
      localStorage.getItem("manualBlockList") || "[]"
    );
    const domainsBlocks = JSON.parse(
      localStorage.getItem("domainsBlock") || "[]"
    );

    // Combine manualBlocks and domainsBlocks into a single list
    const combinedBlockList = Array.from(
      new Set([...manualBlocks, ...domainsBlocks])
    );

    // Filter out domains that are present in masterHostsFileAllowList
    const filteredBlockList = combinedBlockList.filter(
      (domain) => !masterHostsFileAllowList.includes(domain)
    );

    try {
      // Update LocalStorage with the new master block list that excludes allowed domains
      localStorage.setItem(
        "masterHostBlockList",
        JSON.stringify(filteredBlockList)
      );
      console.log("Updated masterHostsFileList:", filteredBlockList);
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        // Handle the Quota Exceeded Error
        console.error(
          "Local storage quota exceeded. Unable to update the master host block list."
        );
        // Implement further error handling or user notification here
      } else {
        throw e; // Rethrow if it's not a QuotaExceededError
      }
    }
    // Update the state as well
    setMasterHostFile(filteredBlockList);
  }, [manualBlockList, urls, domainsBlock]);

  return (
    <>
      {/* Header Section */}
      <div className="text-center vh-30 mb-4" style={{ padding: "20px" }}>
        <div className="content-header d-flex justify-content-between br">
          <div className="br w-100" style={{ color: "#646cff" }}>
            <h1>Block List</h1>
          </div>
          <button type="button" className="btn btn-link">
            Update
          </button>
        </div>
      </div>

      {/* Source List Section - Ensuring it fills the remaining vertical space */}
      <div className="vh-40" style={{ padding: "0 20px", height: "auto" }}>
        <h3
          className="mb-4 fw-bold"
          style={{ color: "#646cff", margin: "20px 0" }}
        >
          Source List{" "}
          <i
            className="bi bi-question-circle-fill"
            style={{ fontSize: "16px" }}
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Description of Source List."
          ></i>
        </h3>

        {/* // Dropdown for selecting predefined URLs or custom input */}
        <div style={{ padding: "0 20px" }}>
          <select
            className="form-select"
            value={selectedUrl}
            onChange={handleSelectChange}
          >
            {/* Default dropdown option */}
            <option value="" disabled={selectedUrl !== ""}>
              Select a path from the dropdown
            </option>

            {/* Predefined URLs */}

            {DEFAULT_SOURCE_BLOCK_LISTS.map(([name, url], index) => (
              <option key={index} value={url}>
                {name}
              </option>
            ))}

            {/* Custom URL option */}
            <option value="custom">Custom URL</option>
          </select>
          {/* Conditionally rendered custom URL input field */}
          {selectedUrl === "custom" && (
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Add the URL to the Hosts file"
                aria-label="Add new source"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onBlur={handleInputBlur} // Add the onBlur event handler here
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={handleButtonClick}
              >
                <i className="bi bi-plus-circle"></i>
              </button>
            </div>
          )}
        </div>

        {/* List of URLs */}
        <div style={{ padding: "0 20px" }}>
          {urls.map((url, index) => (
            <div
              key={index}
              className="d-flex justify-content-between align-items-center mb-2"
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                borderRadius: "5px",
              }}
            >
              <span>
                {index + 1}. {url}
              </span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => deleteUrl(index)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Block List */}
      <div className="mt-5" style={{ padding: "0 20px", height: "auto" }}>
        <h3
          className="mb-4 fw-bold"
          style={{ color: "#646cff", padding: "20px 0" }}
        >
          Manual Block List{" "}
          <i
            className="bi bi-question-circle-fill"
            style={{ fontSize: "16px" }}
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Description of Manual Block List."
          ></i>
        </h3>
        {/* Input field and Add button */}
        <div style={{ padding: "0 20px" }}>
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Add a block to the Manual Block List"
              aria-label="Add new block"
              value={inputBlock}
              onChange={handleInputChange2}
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => requestAddDomainConfirmation(inputBlock)} // Updated for add
            >
              <i className="bi bi-plus-circle"></i>
            </button>
          </div>
        </div>

        {/* List of Blocks with borders */}
        <div style={{ padding: "0 20px" }}>
          {manualBlockList.map((block, index) => (
            <div
              key={index}
              className="d-flex justify-content-between align-items-center mb-2"
              style={{
                border: "1px solid #ddd",
                padding: "8px",
                borderRadius: "5px",
              }}
            >
              <span>
                {index + 1}. {block}
              </span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => requestDeleteDomainConfirmation(index)} // Updated for delete
              >
                Delete
              </button>
            </div>
          ))}
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
    </>
  );
}

export default BlockLists;
