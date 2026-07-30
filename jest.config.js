/**
 * Jest configuration for JavaScript/TypeScript unit tests.
 *
 * Builds on @wordpress/jest-preset-default (jsdom environment, style mocks,
 * babel-jest with the WordPress babel preset, which includes
 * @babel/preset-typescript). Unit tests live in tests/unit/, alongside the
 * phpunit and playwright suites.
 *
 * Run with `npm run test:unit`.
 */
const defaultPreset = require( '@wordpress/jest-preset-default/jest-preset' );

module.exports = {
	...defaultPreset,
	rootDir: __dirname,
	// Babel options are given inline rather than in a root babel.config.js so
	// that babel-loader in the webpack build is left entirely untouched.
	transform: {
		'\\.[jt]sx?$': [
			require.resolve( 'babel-jest' ),
			{
				presets: [ require.resolve( '@wordpress/babel-preset-default' ) ],
				babelrc: false,
				configFile: false,
			},
		],
	},
	testMatch: [ '<rootDir>/tests/unit/**/*.test.[jt]s?(x)' ],
	setupFiles: [
		...defaultPreset.setupFiles,
		'<rootDir>/tests/unit/support/jest-setup.js',
	],
	// @wordpress/element bundles its own copy of react/react-dom, so a
	// component that takes its hooks from @wordpress/element gets a different
	// React instance than react-dom/server does, and every hook call fails
	// with "Invalid hook call". Pin all of them to one copy — which is what
	// production does anyway, since webpack externalizes React to the single
	// instance WordPress provides on window.
	moduleNameMapper: {
		...defaultPreset.moduleNameMapper,
		'^react$': require.resolve( 'react' ),
		'^react-dom$': require.resolve( 'react-dom' ),
		'^react-dom/server$': require.resolve( 'react-dom/server' ),
		'^react/jsx-runtime$': require.resolve( 'react/jsx-runtime' ),
	},
	testPathIgnorePatterns: [
		'/node_modules/',
		'<rootDir>/vendor/',
		'<rootDir>/build/',
		'<rootDir>/wordpress/',
		'<rootDir>/tests/playwright/',
	],
};
