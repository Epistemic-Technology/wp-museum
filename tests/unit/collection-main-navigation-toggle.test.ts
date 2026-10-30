/**
 * The collection-main-navigation view script toggles a collection's excerpt
 * from the info button rendered by render.php.
 */

const BOX = ( id: string, extra = '' ) => `
	<div class="wpm-collection-main-navigation-collection-box">
		<button
			type="button"
			class="wpm-collection-main-navigation-collection-box-info-button"
			aria-label="Show information about Tools collection"
			aria-expanded="false"
			aria-controls="${ id }"
			data-show-label="Show information about Tools collection"
			data-hide-label="Hide information about Tools collection"
			${ extra }
		><svg><path d="M0 0" /></svg></button>
		<div id="${ id }" class="wpm-collection-main-navigation-collection-box-excerpt closed" aria-hidden="true">About tools</div>
	</div>`;

// The script registers one delegated click listener on `document` when it
// loads, so import it once; loading it per test would stack listeners and
// each click would toggle more than once.
import '../../src/blocks/collection-main-navigation/front';

const click = ( element: Element ) => {
	element.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
};

describe( 'collection-main-navigation view script', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'opens and closes the excerpt, updating ARIA state and the label', () => {
		document.body.innerHTML = BOX( 'excerpt-1' );

		const button = document.querySelector( 'button' ) as HTMLButtonElement;
		const excerpt = document.getElementById( 'excerpt-1' ) as HTMLElement;

		click( button );
		expect( button.getAttribute( 'aria-expanded' ) ).toBe( 'true' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Hide information about Tools collection' );
		expect( excerpt.classList.contains( 'open' ) ).toBe( true );
		expect( excerpt.classList.contains( 'closed' ) ).toBe( false );
		expect( excerpt.getAttribute( 'aria-hidden' ) ).toBe( 'false' );

		click( button );
		expect( button.getAttribute( 'aria-expanded' ) ).toBe( 'false' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Show information about Tools collection' );
		expect( excerpt.classList.contains( 'closed' ) ).toBe( true );
		expect( excerpt.getAttribute( 'aria-hidden' ) ).toBe( 'true' );
	} );

	it( 'handles a click on the icon inside the button', () => {
		document.body.innerHTML = BOX( 'excerpt-2' );

		click( document.querySelector( 'button svg path' ) as Element );
		expect( document.querySelector( 'button' )?.getAttribute( 'aria-expanded' ) ).toBe( 'true' );
	} );

	it( 'only toggles the box that was clicked', () => {
		document.body.innerHTML = BOX( 'excerpt-a' ) + BOX( 'excerpt-b' );

		const buttons = document.querySelectorAll( 'button' );
		click( buttons[ 1 ] );

		expect( document.getElementById( 'excerpt-a' )?.classList.contains( 'open' ) ).toBe( false );
		expect( document.getElementById( 'excerpt-b' )?.classList.contains( 'open' ) ).toBe( true );
	} );

	it( 'leaves a button whose excerpt is missing alone', () => {
		document.body.innerHTML = BOX( 'excerpt-c' ).replace( 'id="excerpt-c"', 'id="elsewhere"' );

		const button = document.querySelector( 'button' ) as HTMLButtonElement;
		expect( () => click( button ) ).not.toThrow();
		expect( button.getAttribute( 'aria-expanded' ) ).toBe( 'false' );
	} );
} );
