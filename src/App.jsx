import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { v4 as uuidv4 } from 'uuid';
import "./App.scss";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink
} from "react-router-dom";

function App() {
  return (
    <Router>
        <nav id="sidebar" class="d-flex flex-column flex-shrink-0 overflow-hidden nav-width">
          <NavLink to="/" className="d-block p-3 text-center text-decoration-none home">
            <img src="./images/logo-100x100.svg" alt="[logo]" />
            <span className="visually-hidden">Icon-only</span>
          </NavLink>
          <ul className="nav nav-flush flex-column mb-auto">
            <li className="nav-item mb-0">
              <NavLink to="/hosts-file" className="nav-link py-3 d-flex">
                <span className="nav-icon nav-icon-hosts-file"></span>
                <span className="label">Hosts file</span>
              </NavLink>
            </li>

            <li className="nav-item mb-0">
              <NavLink to="/block-lists" className="nav-link py-3 d-flex">
                <span className="nav-icon nav-icon-block-lists"></span>
                <span className="label">Block Lists</span>
              </NavLink>
            </li>

            <li className="nav-item mb-0">
              <NavLink to="/allow-lists" className="nav-link py-3 d-flex">
                <span className="nav-icon nav-icon-allow-lists"></span>
                <span className="label">Allow Lists</span>
              </NavLink>
            </li>

            <li className="nav-item mb-0">
              <NavLink to="/backups" className="nav-link py-3 d-flex">
                <span className="nav-icon nav-icon-backups"></span>
                <span className="label">Backups</span>
              </NavLink>
            </li>

            <li className="nav-item mb-0">
              <NavLink to="/logs" className="nav-link py-3 d-flex">
                <span className="nav-icon nav-icon-logs"></span>
                <span className="label">Network Logs</span>
              </NavLink>
            </li>
          </ul>
          <div className="nav-item mb-0">
            <NavLink to="/settings" className="nav-link py-3 ps-3 d-flex">
              <span className="nav-icon nav-icon-settings"></span>
              <span className="label">Settings</span>
            </NavLink>
          </div>
        </nav>
        <div id="content" class="w-100 overflow-auto">
          <Routes>
            <Route path="/settings" element={<Settings />}></Route>
            <Route path="/logs" element={<Logs />}></Route>
            <Route path="/backups" element={<Backups />}></Route>
            <Route path="/allow-lists" element={<AllowLists />}></Route>
            <Route path="/block-lists" element={<BlockLists />}></Route>
            <Route path="/hosts-file" element={<HostsFile />}></Route>
            <Route exact path="/" element={<Home />}></Route>
          </Routes>
        </div>
    </Router>
  );
}

function Settings() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100"></div>
        <button type="button" className="btn btn-link">Update</button>
      </div>
    </div>
  );
}

function Logs() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100"><h3>Network Logs</h3></div>
        <button type="button" className="btn btn-link">Update</button>
      </div>

      <div className="mt-5 mb-2">
        <input className="w-100 form-control" type="text" placeholder="Search log file" />
      </div>
      <div>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-center">Date</th>
              <th class="text-center">Entry</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">December 12th, 2023</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-center">December 12th, 2023</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-center">December 12th, 2023</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-center">December 12th, 2023</td>
              <td class="text-center">google.com</td>
            </tr>
          </tbody>
          </table>
      </div>
    </div>
  );
}

function Backups() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100"><h3>Backups</h3></div>
        <button type="button" className="btn btn-link">Update</button>
      </div>

      <div className="mt-5 mb-2">
        <input className="w-100 form-control" type="text" placeholder="Search hosts file" />
      </div>
      <div>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left"><input type="checkbox" /></th>
              <th class="text-center">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
          </tbody>
          </table>
      </div>
    </div>
  );
}

function AllowLists() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100"><h3>Allow Lists</h3></div>
        <button type="button" className="btn btn-link">Update</button>
      </div>

      <div className="sources-list">
        <h1>Sources List</h1>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left"><input type="checkbox" /></th>
              <th class="text-center">Name</th>
              <th class="text-center">URL</th>
              <th class="text-left"><button>X</button></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Sub-Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Sub-Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
          </tbody>
          </table>
          <button>ADD</button>
      </div>

      <div>
        <h1>Manual Entries</h1>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left"><input type="checkbox" /></th>
              <th class="text-center">Name</th>
              <th class="text-center">URL</th>
              <th class="text-left"><button>X</button></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Sub-Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Sub-Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
          </tbody>
          </table>
          <button>ADD</button>
      </div>

    </div>
  );
}

function BlockLists() {
  const [manualEntryBlockList, setEntryManualBlockList] = useState([
    {
      "name": "This is a test", "entry": "TEST", "key": "TEST-key"
    },
    {
      "name": "This is a test2", "entry": "TEST2", "key": "TEST-key2"
    }
  ]);
  const [sourceBlockList, setSourceBlockList] = useState([]);
  const [formData, setFormData] = useState({name: '', entry: ''});

  const handleRemoveBlockListItem = (e) => {

  }

  const handleFormSubmit = (e) => {
    const { name, value } = e.target;
    setFormData({...formData, [name]: value});
     if (manualEntryBlockList != []) {
          // Fetches the source block list
          let lsBlockList = localStorage.getItem(blockKey);
          setEntryManualBlockList(lsBlockList ? JSON.parse(lsBlockList) : []);
        }
    setEntryManualBlockList(tempArray);
    localStorage.setItem('manualEntryBlockList', tempArray);
  };

  const changeBlockListItem = async (formData, blockList, blockKey=null) => {
    let tempArray = [{"name": name, "entry": entry, "key": uuidv4()}];
    // Check to see if entries already exists
    if (blockList != []) {
      // Check if a particular entry exists.
      let filteredIndex = blockList.findIndex(item => item["entry"] === entry || blockKey !== null && blockKey === blockKey);
      if (filteredIndex !== -1) {
        tempArray = [
            ...blockList.slice(0, filteredIndex),
            {...blockList[filteredIndex], "name": name, "entry": entry },
            ...blockList.slice(filteredIndex + 1)
        ]
      }
    }
    return tempArray;
  }

  const removeBlockListItem = async (blockList, blockKey) => {
    // Check to see if entries already exists
    if (blockList != []) {
      // Check if a particular entry exists.
      let filteredIndex = blockList.findIndex(item => item["entry"] === url);
      if (filteredIndex !== -1) {
        blockList.splice(filteredIndex, 1);
      }
    }
    return blockList
  }

  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100"><h3>Block Lists</h3></div>
        <button type="button" className="btn btn-link">Update</button>
      </div>

      <div className="sources-list">
        <h1>Sources List</h1>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left"><input type="checkbox" /></th>
              <th class="text-center">Name</th>
              <th class="text-center">URL</th>
              <th class="text-left"><button>X</button></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {manualEntryBlockList.map((entry) => (
                <tr key={entry.id}>
                  <td class="text-left"><input type="checkbox" /></td>
                  <td class="text-center">{entry.name}</td>
                  <td class="text-center">{entry.entry}</td>
                  <td class="text-left"><button type="click" onClick={handleRemoveBlockListItem}>X</button></td>
                </tr>
              ))}
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
          </tbody>
          </table>
          <form onSubmit={handleFormSubmit}>
            <label>
              Name:
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </label>
            <br />
            <label>
              Entry:
              <textarea
                name="entry"
                value={formData.entry}
                onChange={handleChange}
              />
            </label>
            <br />
            <button type="submit">Submit</button>
          </form>
      </div>

      <div>
        <h1>Manual Entries</h1>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left"><input type="checkbox" /></th>
              <th class="text-center">Name</th>
              <th class="text-center">URL</th>
              <th class="text-left"><button>X</button></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Sub-Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">Sub-Master Block List</td>
              <td class="text-center">http://github.com/dns.json</td>
              <td class="text-left"><button>X</button></td>
            </tr>
          </tbody>
          </table>
          <button>ADD</button>
      </div>

    </div>
  );
}

function HostsFile() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100"><h3>Hosts File</h3></div>
        <button type="button" className="btn btn-link">Update</button>
      </div>

      <div className="mt-5 mb-2">
        <input className="w-100 form-control" type="text" placeholder="Search hosts file" />
      </div>
      <div>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left"><input type="checkbox" /></th>
              <th class="text-center">IP</th>
              <th class="text-center">HOST</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-left"><input type="checkbox" /></td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
          </tbody>
          </table>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100"></div>
        <button type="button" className="btn btn-link">Update</button>
      </div>

      <div className="br">
        <div className="br">
          <div className="text-center">
            <img className="br" src="./images/logo-350x350.svg" width="300px" alt="[logo]" />
          </div>
        </div>
        <div className="app-version">
          <p>Hosts Blocker V2.01</p>
        </div>
        <div className="auto-updates-enabled">
          <p>Updates (Daily at TIME) (Weekly on WEEKDAY at TIME) (Monthly on WEEK AND WEEKDAY at TIME) (Upate update disabled)</p>
        </div>

        <div className="last-updated">
          <p>Last updated: 2023-12-12 at 1:20am</p>
        </div>
      </div>

      <div class="modal show" id="first-time-action-modal" tabindex="-1" aria-labelledby="first-time-action-modal" aria-hidden="false">
        <div class="modal-lg modal-dialog modal-dialog-centered">
          <div class="modal-content bg-soft-gray">
            <div class="modal-body border-0 text-center pb-5 pt-4">
              <p class="text-gray w-80 mx-auto">
                Since this is the first time using our app, we recommend installing our default block list. Advanced users might want to manually configure
              </p>
              <div class="d-flex justify-content-center mt-5">
                <button type="submit" class="btn btn-primary text-white text-uppercase w-226px">Use Default</button>
                <button type="button" class="btn btn-secondary ms-4 text-uppercase w-226px" data-bs-dismiss="modal">Manually Configure</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
