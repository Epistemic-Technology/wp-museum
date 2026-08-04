/**
 * Extra globals for the jsdom test environment.
 *
 * jsdom does not implement TextEncoder/TextDecoder, which react-dom/server
 * requires at import time. Node provides both.
 */
const { TextEncoder, TextDecoder } = require( 'util' );

if ( typeof global.TextEncoder === 'undefined' ) {
	global.TextEncoder = TextEncoder;
}

if ( typeof global.TextDecoder === 'undefined' ) {
	global.TextDecoder = TextDecoder;
}

// React 18 only treats act() as supported when this flag is set, and warns on
// every render otherwise. @wordpress/jest-console turns those warnings into
// test failures, so tests that drive a component with act() need it.
global.IS_REACT_ACT_ENVIRONMENT = true;
