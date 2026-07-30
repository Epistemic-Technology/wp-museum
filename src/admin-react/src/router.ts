/**
 * Simple URL-based router for WordPress admin pages.
 * Uses URL parameters to manage navigation state and history.
 */

/**
 * Parameters parsed from the URL query string; values read back are always
 * strings.
 */
export type UrlParams = Record<string, string>;

/**
 * Parameter updates written by callers; values may be numbers or
 * null/undefined (null/undefined/"" entries are stripped before
 * serialization).
 */
export type UrlParamUpdates = Record<string, string | number | null | undefined>;

/**
 * Get current URL parameters as an object.
 */
export const getUrlParams = (): UrlParams => {
  const urlParams = new URLSearchParams(window.location.search);
  const params: UrlParams = {};
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  return params;
};

/**
 * Update URL parameters without page reload.
 */
export const updateUrlParams = (
  newParams: UrlParamUpdates,
  replace: boolean = false,
): void => {
  const currentParams = getUrlParams();
  const updatedParams: UrlParamUpdates = { ...currentParams, ...newParams };

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

  // NOTE(wp-types): remaining values may be numbers at runtime;
  // URLSearchParams stringifies them, but its lib type only accepts strings.
  const urlParams = new URLSearchParams(updatedParams as Record<string, string>);
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
export const navigateTo = (view: string, params: UrlParamUpdates = {}): void => {
  const newParams = { view, ...params };
  updateUrlParams(newParams);
};

/**
 * Go back to the main view.
 */
export const navigateToMain = (): void => {
  updateUrlParams({ view: null, kind_id: null });
};

/**
 * Hook for handling browser navigation events.
 */
export const useRouter = (
  onRouteChange?: (params: UrlParams) => void,
): (() => void) => {
  const handlePopState = () => {
    if (onRouteChange) {
      const params = getUrlParams();
      onRouteChange(params);
    }
  };

  const handleUrlChange = (event: Event) => {
    if (onRouteChange) {
      const params =
        (event as CustomEvent<UrlParams>).detail || getUrlParams();
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
export const getCurrentView = (): string => {
  const params = getUrlParams();
  return params.view || "main";
};

/**
 * Get a specific parameter from the URL.
 */
export const getParam = (
  key: string,
  defaultValue: string | null = null,
): string | null => {
  const params = getUrlParams();
  return params[key] || defaultValue;
};

/**
 * Check if we can navigate back (has history).
 */
export const canGoBack = (): boolean => {
  return window.history.length > 1;
};

/**
 * Navigate back in history.
 */
export const goBack = (): void => {
  if (canGoBack()) {
    window.history.back();
  }
};

/**
 * Get current page identifier from URL.
 */
export const getCurrentPage = (): string => {
  const params = getUrlParams();
  return params.page || "";
};
