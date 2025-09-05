import React from "react";

function Home() {

    const appVersion = process.env.VERSION;
  
  
    return (
      <div className="text-center vh-100 p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="w-100"></div>
          <button type="button" className="btn btn-link">Update</button>
        </div>
  
        <div>
          <div>
            <div className="text-center">
              <img src="./images/logo-350x350.svg" width="300" alt="[logo]" />
            </div>
          </div>
          <div className="app-version">
            <p>Hosts Blocker v{appVersion}</p>
          </div>
          <div className="auto-updates-enabled">
            <p>Updates (Daily at TIME) (Weekly on WEEKDAY at TIME) (Monthly on WEEK AND WEEKDAY at TIME) (Update update disabled)</p>
          </div>
  
          <div className="last-updated">
            <p>Last updated: 2023-12-12 at 1:20am</p>
          </div>
        </div>
  
        <div className="modal show" id="first-time-action-modal" tabIndex="-1" aria-labelledby="first-time-action-modal" aria-hidden="false">
          <div className="modal-lg modal-dialog modal-dialog-centered">
            <div className="modal-content bg-light">
              <div className="modal-body border-0 text-center pb-5 pt-4">
                <p className="text-muted mx-auto" style={{ maxWidth: "80%" }}>
                  Since this is the first time using our app, we recommend installing our default block list. Advanced users might want to manually configure
                </p>
                <div className="d-flex justify-content-center mt-5">
                  <button type="submit" className="btn btn-primary text-white text-uppercase me-3" style={{ width: "226px" }}>Use Default</button>
                  <button type="button" className="btn btn-secondary text-uppercase" style={{ width: "226px" }} data-bs-dismiss="modal">Manually Configure</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

export default Home;