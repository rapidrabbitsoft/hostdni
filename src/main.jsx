import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Import jQuery and bootstrap-select
import $ from 'jquery';
import * as bootstrap from 'bootstrap';
import 'bootstrap-select';
import 'bootstrap-select/dist/css/bootstrap-select.css';

// Make jQuery and Bootstrap available globally
window.jQuery = window.$ = $;
window.bootstrap = bootstrap;

// Manually add dropdown functionality if it doesn't exist
if (!$.fn.dropdown) {
  $.fn.dropdown = function() {
    return this;
  };
}

// Manually specify Bootstrap version for bootstrap-select
if ($.fn.selectpicker) {
  $.fn.selectpicker.Constructor.BootstrapVersion = '5';
}

// Debug: Check if bootstrap-select is loaded
console.log('jQuery loaded:', typeof $);
console.log('Bootstrap loaded:', typeof bootstrap);
console.log('Bootstrap dropdown available:', typeof $.fn.dropdown);
console.log('bootstrap-select loaded:', typeof $.fn.selectpicker);
console.log('Bootstrap version:', $.fn.selectpicker ? $.fn.selectpicker.Constructor.BootstrapVersion : 'not set');

// Initialize Bootstrap components after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, {
      customClass: 'tooltip-dark'
    });
  });
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
