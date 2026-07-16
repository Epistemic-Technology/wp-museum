# Admin React Routing System

This document explains the URL-based routing system implemented for the WordPress Museum admin interface.

## Overview

The admin React interface now uses URL-based routing instead of internal state management. This provides:

- **Browser history support**: Forward/back buttons work correctly
- **Bookmarkable URLs**: Users can bookmark specific admin pages
- **Refresh persistence**: Page refreshes maintain the current view
- **Better UX**: Standard web navigation behavior

## Router Functions

### Core Functions

- `getUrlParams()` - Returns current URL parameters as an object
- `updateUrlParams(params, replace)` - Updates URL without page reload
- `navigateTo(view, params)` - Navigate to a specific view
- `navigateToMain()` - Return to main view
- `getCurrentView()` - Get current view from URL
- `getParam(key, default)` - Get specific URL parameter

### Navigation Helpers

- `canGoBack()` - Check if browser can navigate back
- `goBack()` - Navigate back in browser history
- `useRouter(callback)` - Hook for handling route changes

## URL Structure

The routing system uses WordPress admin page URL parameters:

### Base URLs
- `?page=wpm-react-admin-objects` - Objects main page
- `?page=wpm-react-admin-general` - General settings
- `?page=wpm-react-admin-museum-remote` - Remote settings
- `?page=wpm-react-admin-oai-pmh` - OAI-PMH settings

### With Navigation State
- `?page=wpm-react-admin-objects&view=main` - Objects main view
- `?page=wpm-react-admin-objects&view=edit&kind_id=123` - Edit object type

## Component Integration

### Using the Router Hook

```javascript
import { useRouter, getCurrentView, getParam } from '../router';

const MyComponent = () => {
  const [currentView, setCurrentView] = useState(getCurrentView());

  useEffect(() => {
    const cleanup = useRouter((params) => {
      setCurrentView(params.view || 'main');
      // Handle other route changes
    });
    return cleanup;
  }, []);

  // Component logic...
};
```

### Navigation

```javascript
import { navigateTo, navigateToMain } from '../router';

// Navigate to edit view
const editItem = (itemId) => {
  navigateTo('edit', { kind_id: itemId });
};

// Return to main view
const goBack = () => {
  navigateToMain();
};
```

## Features

### Keyboard Shortcuts
- **Escape**: Return to main view (when in edit mode)
- **Ctrl/Cmd + S**: Save changes (when in edit mode)

### Unsaved Changes Protection
- Browser warning when leaving page with unsaved changes
- Confirmation dialog when navigating away
- Visual indicators for unsaved state

## Development

### Debug Component
Use `NavDebug` component during development to monitor routing state:

```javascript
import NavDebug from '../components/nav-debug';

// Add to any component for debugging
<NavDebug enabled={true} />
```

### Testing Navigation
1. Navigate between views using buttons/links
2. Use browser back/forward buttons
3. Refresh page to test state persistence
4. Test keyboard shortcuts
5. Test unsaved changes warnings

## Migration from State-based Navigation

The old system used internal state:
```javascript
const [selectedPage, setSelectedPage] = useState('main');
```

The new system uses URL state:
```javascript
const [selectedPage, setSelectedPage] = useState(getCurrentView());

useEffect(() => {
  const cleanup = useRouter((params) => {
    setSelectedPage(params.view || 'main');
  });
  return cleanup;
}, []);
```

## Best Practices

1. **Always use router functions** for navigation instead of direct state updates
2. **Update URL when view changes** to maintain browser history
3. **Handle route changes in useEffect** with cleanup
4. **Provide visual feedback** for current location (breadcrumbs, active states)
5. **Warn about unsaved changes** before navigation
6. **Test thoroughly** with browser navigation buttons

## Troubleshooting

### Common Issues

1. **Back button doesn't work**: Ensure you're using `navigateTo()` instead of direct state updates
2. **Page refresh loses state**: Check that initial state reads from URL parameters
3. **URLs don't update**: Make sure navigation functions call `updateUrlParams()`
4. **Multiple history entries**: Use `replace: true` for state updates that shouldn't create history entries

### Debug Tips

1. Use `NavDebug` component to monitor URL state
2. Check browser developer tools Network tab for unexpected page loads
3. Verify `useRouter` cleanup functions are being called
4. Test with different browser history lengths

## Future Enhancements

Potential improvements to consider:

- Route validation and error handling
- Nested route support for complex hierarchies
- Query parameter serialization for complex objects
- Route-based permissions and access control
- Deep linking support for specific form fields
