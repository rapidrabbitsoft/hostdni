import React, { useState, useEffect } from "react";

function Logs() {
  // State to hold network calls and search term
  const [networkCalls, setNetworkCalls] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Simulate fetching network call data
  useEffect(() => {
    // This function simulates fetching network call data
    const fetchNetworkCalls = () => {
      // Mock network call data
      const mockData = [
        { date: "December 12th, 2023", domain: "example.com" },
        { date: "December 13th, 2023", domain: "google.com" },
        { date: "December 14th, 2023", domain: "facebook.com" },
        { date: "December 15th, 2023", domain: "twitter.com" },
      ];
      setNetworkCalls(mockData);
    };

    fetchNetworkCalls();
  }, []);

  // Filter network calls based on search term
  const filteredCalls = networkCalls.filter((call) =>
    call.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="br text-center vh-100 p-4">
        <div className="content-header d-flex justify-content-between br">
          <div className="br w-100">
            <h3>Network Logs</h3>
          </div>
          <button
            type="button"
            className="btn btn-link"
            onClick={() => setSearchTerm("")}
          >
            Clear Search
          </button>
        </div>

        <div className="mt-5 mb-2">
          <input
            className="w-100 form-control"
            type="text"
            placeholder="Search log file"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          {filteredCalls.length > 0 ? (
            <table
              className="table table-striped mb-0"
              cellSpacing="0"
              width="100%"
            >
              <thead className="fixedheader">
                <tr>
                  <th className="text-center">Date</th>
                  <th className="text-center">Entry</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((call, index) => (
                  <tr key={index}>
                    <td className="text-center">{call.date}</td>
                    <td className="text-center">{call.domain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No network calls found.</p>
          )}
        </div>
      </div>
    </>
  );
}

export default Logs;
