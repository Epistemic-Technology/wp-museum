import { useState, useEffect } from "@wordpress/element";
import { getUrlParams, getCurrentView, getParam } from "../router";
import type { UrlParams } from "../router";

/**
 * Props for the NavDebug component.
 */
interface NavDebugProps {
  enabled?: boolean;
}

/**
 * Debug component to show current navigation state.
 * Useful for testing and development.
 */
const NavDebug = ({ enabled = false }: NavDebugProps) => {
  const [urlParams, setUrlParams] = useState<UrlParams>({});
  const [currentView, setCurrentView] = useState<string>("");

  useEffect(() => {
    const updateNavState = () => {
      setUrlParams(getUrlParams());
      setCurrentView(getCurrentView());
    };

    // Update initially
    updateNavState();

    // Listen for navigation changes
    const handlePopState = () => {
      updateNavState();
    };

    window.addEventListener("popstate", handlePopState);

    // Also listen for pushstate/replacestate (custom events)
    const handleUrlChange = () => {
      updateNavState();
    };

    // Override pushState and replaceState to dispatch custom events
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args: Parameters<History["pushState"]>) {
      originalPushState.apply(window.history, args);
      window.dispatchEvent(new Event('urlchange'));
    };

    window.history.replaceState = function(...args: Parameters<History["replaceState"]>) {
      originalReplaceState.apply(window.history, args);
      window.dispatchEvent(new Event('urlchange'));
    };

    window.addEventListener("urlchange", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("urlchange", handleUrlChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <div className="nav-debug" style={{
      position: "fixed",
      top: "32px",
      right: "10px",
      background: "#23282d",
      color: "#fff",
      padding: "10px",
      borderRadius: "4px",
      fontSize: "12px",
      fontFamily: "monospace",
      zIndex: 9999,
      maxWidth: "300px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
    }}>
      <div style={{ marginBottom: "8px", fontWeight: "bold", color: "#00a0d2" }}>
        Navigation Debug
      </div>
      <div>
        <strong>Current View:</strong> {currentView}
      </div>
      <div>
        <strong>URL Params:</strong>
      </div>
      <div style={{ marginLeft: "10px", fontSize: "11px" }}>
        {Object.keys(urlParams).length === 0 ? (
          <div style={{ color: "#999" }}>No parameters</div>
        ) : (
          Object.entries(urlParams).map(([key, value]) => (
            <div key={key}>
              <span style={{ color: "#72aee6" }}>{key}:</span> {value}
            </div>
          ))
        )}
      </div>
      <div style={{ marginTop: "8px", fontSize: "11px", color: "#999" }}>
        History Length: {window.history.length}
      </div>
    </div>
  );
};

export default NavDebug;
