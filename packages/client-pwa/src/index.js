import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ Register Service Worker with update detection
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("✅ Service Worker registered:", reg);

        // Detect new versions of SW (optional but useful)
        reg.onupdatefound = () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // A new SW has been installed, but it’s waiting to activate
                console.log("🔄 New Service Worker available. Refresh the page to update.");
              }
            };
          }
        };
      })
      .catch((err) => {
        console.error("❌ Service Worker registration failed:", err);
      });
  });
}

// ✅ Performance measuring (optional)
reportWebVitals();
