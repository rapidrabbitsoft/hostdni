import React from "react";

function Home() {

    const appVersion = process.env.VERSION;
  
  
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
            <p>Hosts Blocker v{appVersion}</p>
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

export default Home;