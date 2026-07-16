/**
 * Simple URL-based router for WordPress admin pages.
 * Uses URL parameters to manage navigation state and history.
 */

/**
 * Get current URL parameters as an object.
 */
export const getUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  return params;
};

/**
 * Update URL parameters without page reload.
 */
export const updateUrlParams = (newParams, replace = false) => {
  const currentParams = getUrlParams();
  const updatedParams = { ...currentParams, ...newParams };

  // Remove null/undefined values
  Object.keys(updatedParams).forEach((key) => {
    if (
      updatedParams[key] === null ||
      updatedParams[key] === undefined ||
      updatedParams[key] === ""
    ) {
      delete updatedParams[key];
    }
  });

  const urlParams = new URLSearchParams(updatedParams);
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;

  if (replace) {
    window.history.replaceState({}, "", newUrl);
  } else {
    window.history.pushState({}, "", newUrl);
  }

  // Dispatch custom event to notify router hook of URL change
  window.dispatchEvent(
    new CustomEvent("urlchange", { detail: getUrlParams() }),
  );
};

/**
 * Navigate to a new view within the admin app.
 */
export const navigateTo = (view, params = {}) => {
  const newParams = { view, ...params };
  updateUrlParams(newParams);
};

/**
 * Go back to the main view.
 */
export const navigateToMain = () => {
  updateUrlParams({ view: null, kind_id: null });
};

/**
 * Hook for handling browser navigation events.
 */
export const useRouter = (onRouteChange) => {
  const handlePopState = () => {
    if (onRouteChange) {
      const params = getUrlParams();
      onRouteChange(params);
    }
  };

  const handleUrlChange = (event) => {
    if (onRouteChange) {
      const params = event.detail || getUrlParams();
      onRouteChange(params);
    }
  };

  // Set up event listeners
  window.addEventListener("popstate", handlePopState);
  window.addEventListener("urlchange", handleUrlChange);

  // Return cleanup function
  return () => {
    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("urlchange", handleUrlChange);
  };
};

/**
 * Get the current view from URL parameters.
 */
export const getCurrentView = () => {
  const params = getUrlParams();
  return params.view || "main";
};

/**
 * Get a specific parameter from the URL.
 */
export const getParam = (key, defaultValue = null) => {
  const params = getUrlParams();
  return params[key] || defaultValue;
};

/**
 * Check if we can navigate back (has history).
 */
export const canGoBack = () => {
  return window.history.length > 1;
};

/**
 * Navigate back in history.
 */
export const goBack = () => {
  if (canGoBack()) {
    window.history.back();
  }
};

/**
 * Get current page identifier from URL.
 */
export const getCurrentPage = () => {
  const params = getUrlParams();
  return params.page || "";
};
