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
	testPathIgnorePatterns: [
		'/node_modules/',
		'<rootDir>/vendor/',
		'<rootDir>/build/',
		'<rootDir>/wordpress/',
		'<rootDir>/tests/playwright/',
	],
};
