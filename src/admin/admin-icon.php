<?php
/**
 * SVG Icons for admin.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum;

defined( 'ABSPATH' ) || exit;

/**
 * Generic museum front based on Chicago Field Museum
 */
function museum_icon() {
	$icon_svg =
	'<svg xmlns="http://www.w3.org/2000/svg" 
		viewBox="0 0 150 150" >
		<rect fill="black" x="24.5" height="46.5" y="64.5" id="rect7" width="15.75" ></rect>
		<rect fill="black" x="49.5" height="46" y="65" id="rect2" width="5" ></rect>
		<rect fill="black" height="19.25" x="24.5" id="rect3" width="101.5" y="46" ></rect>
		<rect fill="black" x="64.75" height="46" y="65" width="5" id="rect4" ></rect>
		<rect fill="black" x="80.25" height="46" y="65.25" width="5" id="rect5" ></rect>
		<rect fill="black" x="95.5" height="46" y="65.25" width="5" id="rect6" ></rect>
		<rect fill="black" x="110" height="46.5" y="64.25" width="16" id="rect8" ></rect>
		<polygon fill="black"  points="24.5,110 10,120 0,120 0,130 150,130 150,120 140,120 125.5,110"></polygon>
		<polygon fill="black"  points="21,46 21,40 75,26 129,40 129,46"></polygon>
	</svg>';
	// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	return 'data:image/svg+xml;base64,' . base64_encode( $icon_svg );
}
