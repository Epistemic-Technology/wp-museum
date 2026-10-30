/**
 * Collection main navigation: toggles a collection's excerpt open and closed.
 *
 * The block is rendered in PHP (see render.php); this only wires up the info
 * buttons. One delegated listener covers every block on the page and any
 * markup added later. Without this script the links still work, only the
 * excerpt toggle is inert.
 */

const BUTTON_CLASS = 'wpm-collection-main-navigation-collection-box-info-button';

const toggleExcerpt = ( button: HTMLButtonElement ) => {
	const excerptId = button.getAttribute( 'aria-controls' );
	const excerpt = excerptId ? document.getElementById( excerptId ) : null;
	if ( ! excerpt ) {
		return;
	}

	const open = button.getAttribute( 'aria-expanded' ) !== 'true';
	button.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
	excerpt.classList.toggle( 'open', open );
	excerpt.classList.toggle( 'closed', ! open );
	excerpt.setAttribute( 'aria-hidden', open ? 'false' : 'true' );

	const label = open ? button.dataset.hideLabel : button.dataset.showLabel;
	if ( label ) {
		button.setAttribute( 'aria-label', label );
	}
};

document.addEventListener( 'click', ( event ) => {
	const target = event.target as Element | null;
	const button = target?.closest< HTMLButtonElement >( `.${ BUTTON_CLASS }` );
	if ( button ) {
		event.preventDefault();
		toggleExcerpt( button );
	}
} );

export {};
