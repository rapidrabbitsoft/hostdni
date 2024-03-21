import React, { useState, useEffect } from "react";
import { Tooltip } from "bootstrap";
import ConfirmationModal from "./ConfirmationModal";

function AllowLists() {
  // Initialize tooltips (For Bootstrap 5 - put this in a useEffect hook if using React)
  useEffect(() => {
    var tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new Tooltip(tooltipTriggerEl);
    });
  }, []);

  // States for the modal
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(() => () => {});
  const [modalMessage, setModalMessage] = useState("");

  // Add confirmation for adding a URL
  const confirmAddUrl = () => {
    setModalMessage("Are you sure you want to add this URL?");
    setModalAction(() => () => handleButtonClick());
    setShowModal(true);
  };

  // Add confirmation for deleting a URL
  const confirmDeleteUrl = (index) => {
    setModalMessage("Are you sure you want to delete this URL?");
    setModalAction(() => () => deleteUrl(index));
    setShowModal(true);
  };

  // Modal for the manual

  // Add confirmation for adding an allow
  const confirmAddAllow = () => {
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

  // Logic for Allowlist (Manual)
  // The states
  const [inputAllow, setInputAllow] = useState("");
  const [manualAllowList, setManualAllowList] = useState(() => {
    // Initialize from local storage, or default to an empty array
    const saved = localStorage.getItem("manualAllowList");
    return saved ? JSON.parse(saved) : [];
  });

  // For the source file list
  useEffect(() => {
    // Update local storage whenever the manualAllowList changes
    localStorage.setItem("manualAllowList", JSON.stringify(manualAllowList));
    // console.log(manualAllowList);
  }, [manualAllowList]);

  const handleInputChange2 = (event) => {
    setInputAllow(event.target.value);
  };

  const addAllowToList = () => {
    if (inputAllow && !manualAllowList.includes(inputAllow)) {
      const updatedList = [...manualAllowList, inputAllow];
      setManualAllowList(updatedList);
      setInputAllow(""); // Clear the input field
    } else {
      console.log("The domain already exists!");
    }
  };

  const addAllowFromList = (index) => {
    const updatedList = manualAllowList.filter((_, i) => i !== index);
    setManualAllowList(updatedList);
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

  const handleButtonClick = () => {
    if (inputUrl && !urls.includes(inputUrl)) {
      const updatedUrls = [...urls, inputUrl];
      setUrls(updatedUrls);
      fetchAndProcessURL(inputUrl);
      setInputUrl(""); // Clear the input field
    } else {
      // A modal showing that the url already exists
      console.log("The Source List URL already exists!");
    }
  };

  const deleteUrl = (index) => {
    const updatedUrls = urls.filter((_, i) => i !== index);
    setUrls(updatedUrls);
    // Rebuild the domains list after a URL is deleted
    rebuildAllowDomainsList(updatedUrls);
  };

  // Acts on deletion to create a new array
  const updateDomainsInLocalStorage = (newDomains) => {
    const existingDomains = JSON.parse(
      localStorage.getItem("domainsAllow") || "[]"
    );
    const updatedDomains = Array.from(
      new Set([...existingDomains, ...newDomains])
    );
    localStorage.setItem("domainsAllow", JSON.stringify(updatedDomains));
    // console.log(updatedDomains);
  };

  // Acts to initialize the fetching process for addition/deletion
  const fetchAndProcessURL = (url) => {
    fetch(url, { headers: { Accept: "text/plain" } })
      .then((response) => response.text())
      .then((text) => {
        const newDomains = processTextForDomains(text);
        updateDomainsInLocalStorage(newDomains); // Update domainsAllow in localStorage
      })
      .catch((error) => {
        console.error("Error fetching or processing URL:", error);
      });
  };

  // Acts after deletion
  const rebuildAllowDomainsList = async (updatedUrls) => {
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
        "domainsAllow",
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
  // Default List logic
  const [inputIp, setInputIp] = React.useState("");
  const [inputDomain, setInputDomain] = React.useState("");
  const [entries, setEntries] = React.useState(() => {
    const storedEntries =
      JSON.parse(localStorage.getItem("defaultEntries")) || [];
    // setEntries(storedEntries);
    return storedEntries;
  });

  React.useEffect(() => {
    localStorage.setItem("defaultEntries", JSON.stringify(entries));
  }, [entries]);

  // Handling function

  const handleIpInputChange = (e) => setInputIp(e.target.value);
  const handleDomainInputChange = (e) => setInputDomain(e.target.value);

  const handleAddDefaultEntry = () => {
    const newEntry = { ip: inputIp, domain: inputDomain };
    const updatedEntries = [...entries, newEntry];

    // console.log(newEntry);
    setEntries(updatedEntries);
    setInputIp("");
    setInputDomain("");
  };

  // Deleting
  const deleteEntry = (index) => {
    const updatedEntries = entries.filter((_, idx) => idx !== index);
    setEntries(updatedEntries);
  };
  //
  //
  //

  // MasterHostFile building and dependencies
  useEffect(() => {
    // Extracting manual allows and domains from local storage
    const manualAllow = JSON.parse(
      localStorage.getItem("manualAllowList") || "[]"
    );
    const domainsAllowList = JSON.parse(
      localStorage.getItem("domainsAllow") || "[]"
    );

    // Extracting domains from the 'entries' (Default Entries section)
    const defaultEntryDomains = JSON.parse(
      localStorage.getItem("defaultEntries") || "[]"
    );

    // // Merging all lists while removing duplicates
    // const masterHostAllowList = Array.from(
    //   new Set([...defaultEntryDomains, ...manualAllow, ...domainsAllowList])
    // );

    // Merging all lists while removing duplicates
    const masterHostAllowList = Array.from(
      new Set([
        ...entries.map((entry) => entry.domain),
        ...manualAllow,
        ...domainsAllowList,
      ])
    );

    console.log("Updated masterHostsFileAllowList:", masterHostAllowList);

    // Updating local storage with the merged list
    localStorage.setItem(
      "masterHostsFileAllowList",
      JSON.stringify(masterHostAllowList)
    );
  }, [manualAllowList, urls, entries]); // Ensure 'entries' is a dependency to reflect changes

  return (
    <>
      {/* Header Section */}
      <div className="text-center vh-30 mb-4" style={{ padding: "20px" }}>
        <div className="content-header d-flex justify-content-between br">
          <div className="br w-100" style={{ color: "#646cff" }}>
            {" "}
            <h1>Allow List </h1>
          </div>
          <button type="button" className="btn btn-link">
            Update
          </button>
        </div>
      </div>

      {/* Source List Section - Ensuring it fills the remaining vertical space */}
      <div style={{ padding: "0 20px", height: "auto" }}>
        <h3
          className="mb-4 fw-bold"
          style={{ color: "#646cff", padding: "20px 0" }}
        >
          Source List{" "}
          <i
            className="bi bi-question-circle-fill"
            style={{ fontSize: "16px" }}
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Description of SourceList."
          ></i>
        </h3>
        {/* Input field and Add button */}
        <div style={{ padding: "0 20px" }}>
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Add the URL to the Hosts file"
              aria-label="Add new source"
              value={inputUrl}
              onChange={handleInputChange}
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={confirmAddUrl}
            >
              <i className="bi bi-plus-circle"></i>
            </button>
          </div>
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
                onClick={() => confirmDeleteUrl(index)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Allow List */}
      <div style={{ padding: "0 20px", height: "auto", marginTop: "5rem" }}>
        <h3
          className="mb-4 fw-bold"
          style={{ color: "#646cff", padding: "20px 0" }}
        >
          Manual Allow List{" "}
          <i
            className="bi bi-question-circle-fill"
            style={{ fontSize: "16px" }}
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Description of Manual Allow List."
          ></i>
        </h3>

        {/* Input field and Add button */}
        <div style={{ padding: "0 20px" }}>
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Add a Allow to the Manual Allow List"
              aria-label="Add new Allow"
              value={inputAllow}
              onChange={handleInputChange2}
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={confirmAddAllow}
            >
              <i className="bi bi-plus-circle"></i>
            </button>
          </div>
        </div>

        {/* List of Allows with borders */}
        <div style={{ padding: "0 20px" }}>
          {manualAllowList.map((Allow, index) => (
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
                {index + 1}. {Allow}
              </span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => confirmDeleteAllow(index)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Default Entries Section */}
      <div style={{ padding: "0 20px", marginTop: "2rem" }}>
        <h3
          className="mb-4 fw-bold"
          style={{ color: "#646cff", padding: "20px 0" }}
        >
          Default Entries{" "}
          <i
            className="bi bi-question-circle-fill"
            style={{ fontSize: "16px" }}
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Description of Default Entries."
          ></i>
        </h3>
        <div style={{ padding: "0 20px" }}>
          <div
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            {/* Inputs for ips and domains */}

            <input
              type="text"
              className="form-control"
              placeholder="Enter IP"
              value={inputIp}
              onChange={handleIpInputChange}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Enter Domain"
              value={inputDomain}
              onChange={handleDomainInputChange}
            />
            <button
              className="btn btn-outline-secondary"
              onClick={handleAddDefaultEntry}
            >
              <i className="bi bi-plus-circle"></i>
            </button>
          </div>

          {/* List of Entries */}
          <div>
            {entries.map((entry, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                  border: "1px solid #ddd",
                  padding: "8px",
                  borderRadius: "5px",
                }}
              >
                <span>
                  IP: {entry.ip}, Domain: {entry.domain}
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteEntry(index)}
                >
                  Delete
                </button>
              </div>
            ))}
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
    </>
  );
}

export default AllowLists;
