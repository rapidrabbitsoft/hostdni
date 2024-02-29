import React, { useState, useEffect } from 'react';


function AllowLists() {

// Logic for Blocklist (Manual)
// The states
const [inputAllow, setInputAllow] = useState('');
const [manualAllowList, setManualAllowList] = useState(() => {
    // Initialize from local storage, or default to an empty array
    const saved = localStorage.getItem('manualAllowList');
    return saved ? JSON.parse(saved) : [];
  });


useEffect(() => {
  // Update local storage whenever the manualBlockList changes
  localStorage.setItem('manualAllowList', JSON.stringify(manualAllowList));
  console.log(manualAllowList)
}, [manualAllowList]);

const handleInputChange2 = (event) => {
  setInputAllow(event.target.value);
};

const addAllowToList = () => {
  if (inputAllow && !manualAllowList.includes(inputAllow)) {
    const updatedList = [...manualAllowList, inputAllow];
    setManualAllowList(updatedList);
    setInputAllow(''); // Clear the input field
  } else {
    console.log("The domain already exists!")
  }
};

const addAllowFromList = (index) => {
  const updatedList = manualAllowList.filter((_, i) => i !== index);
  setManualAllowList(updatedList);
};




// Logic for the Allow List
// The necessary states for the Allow List
const [inputUrl, setInputUrl] = useState('');

const [urls, setUrls] = useState(() => {
  // Load URLs from local storage or default to an empty array
  const savedUrls = JSON.parse(localStorage.getItem('sourceList') || '[]');
  return savedUrls;
});

useEffect(() => {
  // Update local storage whenever the URLs list changes
  localStorage.setItem('sourceList', JSON.stringify(urls));
}, [urls]);


const handleInputChange = (event) => {
  setInputUrl(event.target.value);
};


const handleButtonClick = () => {
  if (inputUrl && !urls.includes(inputUrl)) {
    const updatedUrls = [...urls, inputUrl];
    setUrls(updatedUrls);
    fetchAndProcessURL(inputUrl);
    setInputUrl(''); // Clear the input field
  } else {
    // A modal showing that the url already exists
    console.log("The Source List URL already exists!")
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
  const existingDomains = JSON.parse(localStorage.getItem('domainsAllow') || '[]');
  const updatedDomains = Array.from(new Set([...existingDomains, ...newDomains]));
  localStorage.setItem('domainsAllow', JSON.stringify(updatedDomains));
  console.log(updatedDomains);
};


// Acts to initialize the fetching process for addition/deletion
const fetchAndProcessURL = (url) => {
  fetch(url, { headers: { 'Accept': 'text/plain' } })
    .then(response => response.text())
    .then(text => {
      const newDomains = processTextForDomains(text);
      updateDomainsInLocalStorage(newDomains); // Update domainsBlock in localStorage
    })
    .catch(error => {
      console.error('Error fetching or processing URL:', error);
    });
};


// Acts after deletion
const rebuildAllowDomainsList = async (updatedUrls) => {
  const fetchPromises = updatedUrls.map(url => 
    new Promise(resolve => {
      fetch(url, { headers: { 'Accept': 'text/plain' } })
        .then(response => response.text())
        .then(text => {
          const newDomains = processTextForDomains(text);
          resolve(newDomains);
        })
        .catch(error => {
          console.error('Error fetching or processing URL:', error);
          resolve([]);
        });
    })
  );

  try {
    const results = await Promise.all(fetchPromises);
    const allDomains = [].concat(...results); // Flatten the array of arrays
    localStorage.setItem('domainsAllow', JSON.stringify(Array.from(new Set(allDomains))));
    console.log(allDomains);

  } catch (error) {
    console.error('Error rebuilding domains list:', error);
  }
};

// Function which process the url to extract the domains
const processTextForDomains = (text) => {
  const newDomains = [];
  const lines = text.split('\n');
  lines.forEach(line => {
    if (!line.startsWith('#') && line.trim() !== '') {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        newDomains.push(parts[1]);
      }
    }
  });
  return newDomains;
};

// Logic for the Master Host File
useEffect(() => {
  // with the most up-to-date information.
  const manualAllow = JSON.parse(localStorage.getItem('manualAllowList') || '[]');
  const domainsAllowList = JSON.parse(localStorage.getItem('domainsAllow') || '[]');

  const masterHostAllowList = Array.from(new Set([...manualAllow, ...domainsAllowList]));

  // Updating local storage with the merged list
  localStorage.setItem('masterHostsFileAllowList', JSON.stringify(masterHostAllowList));

  console.log('Updated masterHostsFileAllowList:', masterHostAllowList);
}, [manualAllowList, urls]);


    return (
        <>
        {/* Header Section */}
        <div className="text-center vh-30 mb-4" style={{padding: '20px'}}>
          <div className="content-header d-flex justify-content-between br">
            <div className="br w-100" style={{color: '#646cff'}}> <h1>Allow List</h1> </div>
            <button type="button" className="btn btn-link">Update</button>
         </div>
        </div>
 
 
     {/* Source List Section - Ensuring it fills the remaining vertical space */}
     <div className="flex-grow-1 d-flex overflow-auto vh-40" style={{padding: '0 20px', height: '30vh'}}>
       <div className="container-fluid bg-light border rounded flex-grow-1 d-flex flex-column" style={{padding: '20px'}}>
         <h3 className="mb-4 fw-bold" style={{color: '#646cff'}}>Source List</h3>
         <div className="input-group mb-3">
 
         <input
           type="text"
           className="form-control"
           placeholder="Add the URL to the Hosts file"
           aria-label="Add new source"
           value={inputUrl}
           onChange={handleInputChange}
           />
           <button className="btn btn-outline-secondary" type="button" onClick={handleButtonClick}>
             <i className="bi bi-plus-circle"></i>
           </button>
         </div>
 
          {/* List of URLs */}
       <div>
         {urls.map((url, index) => (
             <div key={index} className="d-flex justify-content-between align-items-center mb-2" style={{border: '1px solid #ddd', padding: '8px', borderRadius: '5px'}}>
             <span>{index + 1}. {url}</span>
             <button className="btn btn-danger btn-sm" onClick={() => deleteUrl(index)}>Delete</button>
           </div>
         ))}
 
          </div>
       </div>
     </div>  
 
 
 
 
     {/* Manual Block List */}
     <div className="flex-grow-1 d-flex overflow-auto vh-40 mt-5" style={{padding: '0 20px', height: '30vh'}}>
       <div className="container-fluid bg-light border rounded flex-grow-1 d-flex flex-column" style={{padding: '20px'}}>
         <h3 className="mb-4 fw-bold" style={{color: '#646cff'}}>Manual Allow List</h3>
       {/* Input field and Add button */}
       <div className="input-group mb-3">
         <input
           type="text"
           className="form-control"
           placeholder="Add a block to the Manual Block List"
           aria-label="Add new block"
           value={inputAllow}
           onChange={handleInputChange2}
         />
         <button className="btn btn-outline-secondary" type="button" onClick={addAllowToList}>
           <i className="bi bi-plus-circle"></i>
         </button>
       </div>
       
       {/* List of Blocks with borders */}
       <div>
         {manualAllowList.map((block, index) => (
           <div key={index} className="d-flex justify-content-between align-items-center mb-2" style={{border: '1px solid #ddd', padding: '8px', borderRadius: '5px'}}>
             <span>{index + 1}. {block}</span>
             <button className="btn btn-danger btn-sm" onClick={() => addAllowFromList(index)}>Delete</button>
           </div>
         ))}
       </div>
     </div>
     </div>
       </>
     );
  }

  export default AllowLists;
  