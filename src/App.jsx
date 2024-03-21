import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { v4 as uuidv4 } from "uuid";
import "./App.scss";
// import "../node_modules/bootstrap/dist/css/bootstrap.min.css"
// import '../node_modules/bootstrap-icons/font/bootstrap-icons.css';
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap CSS
import "bootstrap-icons/font/bootstrap-icons.css"; // Bootstrap Icons

import BlockLists from "../components/BlockLists";
import AllowLists from "../components/AllowLists";
import Home from "../components/Home";
import Logs from "../components/Logs";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";

function App() {
  return (
    <Router>
      <nav
        id="sidebar"
        class="d-flex flex-column flex-shrink-0 overflow-hidden nav-width"
      >
        <NavLink
          to="/"
          className="d-block p-3 text-center text-decoration-none home"
        >
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
    <div className="br vh-100 p-4" style={{ marginLeft: "40px" }}>
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div style={{ flexGrow: 1, textAlign: "center", color: "#0077A0" }}>
            <h1>Settings</h1>
          </div>
          <button type="button" className="btn btn-link">
            Update
          </button>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            value=""
            id="autoUpdateCheck"
            style={{
              backgroundColor: "grey",
              marginTop: "4rem",
              marginBottom: "15px",
            }}
          />
          <label
            className="form-check-label"
            htmlFor="autoUpdateCheck"
            style={{
              marginTop: "4rem",
              marginLeft: "10px",
              color: "#4A77A0",
              fontSize: "1rem",
              marginBottom: "15px",
            }}
          >
            Automatically update the host file
          </label>
        </div>

        <div className="mt-3">
          <h5 style={{ color: "#4A77A0", fontWeight: "700", fontSize: "2rem" }}>
            Check for updates every
          </h5>
          <div className="d-flex align-items-center mt-3">
            <select className="form-select me-2" style={{ width: "auto" }}>
              <option value="" disabled>
                Select Day
              </option>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>

            <input
              type="time"
              className="form-control"
              style={{ width: "auto" }}
            />
          </div>
        </div>

        <div
          className=""
          style={{
            marginTop: "4rem",
            color: "#4A77A0",
            fontWeight: "700",
            fontSize: "2rem",
          }}
        >
          Number of inputs to save
          <input
            type="number"
            className="form-control mt-2"
            style={{ width: "8rem" }}
            min="0"
          />
        </div>

        <div className="" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className=""
            style={{
              backgroundColor: "#D8D8D8",
              color: "#0077A0",
              marginRight: "1rem",
            }}
          >
            Save
          </button>
        </div>

        {/* Restore an existing configuration */}
        <div className="" style={{ marginTop: "4rem", color: "#4A77A0" }}>
          <h5>Restore an existing configuration</h5>
          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className=""
              style={{
                backgroundColor: "#D8D8D8",
                color: "#0077A0",
                marginRight: "1rem",
              }}
            >
              Select File
            </button>
            <button
              type="button"
              className=""
              style={{
                backgroundColor: "#D8D8D8",
                color: "#0077A0",
                marginRight: "1rem",
              }}
            >
              Restore
            </button>
          </div>
        </div>

        {/* Backup current configuration */}
        <div className="" style={{ marginTop: "4rem", color: "#4A77A0" }}>
          <h5>Backup current configuration</h5>
          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className=""
              style={{
                backgroundColor: "#D8D8D8",
                color: "#0077A0",
                marginRight: "1rem",
              }}
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Backups() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100">
          <h3>Backups</h3>
        </div>
        <button type="button" className="btn btn-link">
          Update
        </button>
      </div>

      <div className="mt-5 mb-2">
        <input
          className="w-100 form-control"
          type="text"
          placeholder="Search hosts file"
        />
      </div>
      <div>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left">
                <input type="checkbox" />
              </th>
              <th class="text-center">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">December 12th, 2023</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HostsFile() {
  return (
    <div className="br text-center vh-100 p-4">
      <div className="content-header d-flex justify-content-between br">
        <div className="br w-100">
          <h3>Hosts File</h3>
        </div>
        <button type="button" className="btn btn-link">
          Update
        </button>
      </div>

      <div className="mt-5 mb-2">
        <input
          className="w-100 form-control"
          type="text"
          placeholder="Search hosts file"
        />
      </div>
      <div>
        <table class="table table-striped mb-0" cellspacing="0" width="100%">
          <thead class="fixedheader">
            <tr>
              <th class="text-left">
                <input type="checkbox" />
              </th>
              <th class="text-center">IP</th>
              <th class="text-center">HOST</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
            <tr>
              <td class="text-left">
                <input type="checkbox" />
              </td>
              <td class="text-center">127.0.0.1</td>
              <td class="text-center">google.com</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
