import "./admin.scss";

import { createRoot } from "@wordpress/element";

import Dashboard from "./dashboard";
import GeneralOptions from "./general";
import { ObjectPage } from "./objects";
import RemoteAdmin from "./remote";
import OmiPmhAdmin from "./oai-pmh";
import { updateUrlParams } from "./router";

// Initialize URL state for WordPress admin pages
const initializeAdminPageRouting = () => {
  // Ensure we have a view parameter for navigation consistency
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has("view")) {
    updateUrlParams({ view: "main" }, true); // Use replace for initial state
  }
};

if (!!document.getElementById("wpm-react-admin-app-container-general")) {
  initializeAdminPageRouting();
  const root = createRoot(
    document.getElementById("wpm-react-admin-app-container-general"),
  );
  root.render(<GeneralOptions />);
} else if (
  !!document.getElementById("wpm-react-admin-app-container-dashboard")
) {
  initializeAdminPageRouting();
  const root = createRoot(
    document.getElementById("wpm-react-admin-app-container-dashboard"),
  );
  root.render(<Dashboard />);
} else if (!!document.getElementById("wpm-react-admin-app-container-objects")) {
  initializeAdminPageRouting();
  const root = createRoot(
    document.getElementById("wpm-react-admin-app-container-objects"),
  );
  root.render(<ObjectPage />);
} else if (!!document.getElementById("wpm-react-admin-app-container-remote")) {
  initializeAdminPageRouting();
  const root = createRoot(
    document.getElementById("wpm-react-admin-app-container-remote"),
  );
  root.render(<RemoteAdmin />);
} else if (!!document.getElementById("wpm-react-admin-app-container-oai-pmh")) {
  initializeAdminPageRouting();
  const root = createRoot(
    document.getElementById("wpm-react-admin-app-container-oai-pmh"),
  );
  root.render(<OmiPmhAdmin />);
}
