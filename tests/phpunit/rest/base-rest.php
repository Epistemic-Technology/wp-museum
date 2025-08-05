<?php
/**
 * Base class for REST API tests.
 *
 * @package MikeThicke\WPMuseum
 */

namespace MikeThicke\WPMuseum\Tests\REST;

use MikeThicke\WPMuseum\WP_Museum_Test_Case;
use WP_REST_Request;
use WP_REST_Server;
use const MikeThicke\WPMuseum\REST_NAMESPACE;

// Add leading slash to REST_NAMESPACE for use in tests
const TEST_REST_NAMESPACE = "/" . REST_NAMESPACE;

/**
 * Base class for REST API tests.
 */
abstract class BaseRESTTest extends WP_Museum_Test_Case
{
    /**
     * The REST server.
     *
     * @var WP_REST_Server
     */
    protected $server;

    /**
     * Admin user ID.
     *
     * @var int
     */
    protected $admin_id;

    /**
     * Editor user ID.
     *
     * @var int
     */
    protected $editor_id;

    /**
     * Regular user ID.
     *
     * @var int
     */
    protected $user_id;

    /**
     * Set up tests.
     */
    public function setUp(): void
    {
        parent::setUp();

        // Initialize REST server.
        global $wp_rest_server;
        $this->server = $wp_rest_server = new WP_REST_Server();
        do_action("rest_api_init");

        // Create test users.
        $this->admin_id = $this->factory->user->create([
            "role" => "administrator",
        ]);

        $this->editor_id = $this->factory->user->create([
            "role" => "editor",
        ]);

        $this->user_id = $this->factory->user->create([
            "role" => "subscriber",
        ]);
    }

    /**
     * Tears down after tests.
     */
    public function tearDown(): void
    {
        parent::tearDown();
        global $wp_rest_server;
        $wp_rest_server = null;
    }

    /**
     * Creates a WP_REST_Request object for the specified route.
     *
     * @param string $route  The route to create a request for.
     * @param string $method The HTTP method to use for the request.
     * @param array  $params The parameters to send with the request.
     * @return WP_REST_Request The request object.
     */
    protected function create_request($route, $method = "GET", $params = [])
    {
        $request = new WP_REST_Request($method, $route);

        if ("GET" === $method) {
            $request->set_query_params($params);
        } else {
            $request->set_body_params($params);
        }

        return $request;
    }

    /**
     * Sets the current user.
     *
     * @param int $user_id The ID of the user to set as current.
     */
    protected function set_current_user($user_id)
    {
        wp_set_current_user($user_id);
    }

    /**
     * Tests if a route is accessible.
     *
     * @param string $route  The route to test.
     * @param string $method The HTTP method to use for the request.
     * @param int    $user_id The ID of the user to use for the request.
     */
    protected function assertRouteIsAccessible(
        $route,
        $method = "GET",
        $user_id = 0
    ) {
        $this->set_current_user($user_id);

        $request = $this->create_request($route, $method);
        $response = $this->server->dispatch($request);

        $this->assertNotEquals(
            404,
            $response->get_status(),
            "Route '{$route}' not found."
        );
        $this->assertNotEquals(
            403,
            $response->get_status(),
            "Route '{$route}' returned forbidden error."
        );
        $this->assertNotEquals(
            401,
            $response->get_status(),
            "Route '{$route}' requires authentication."
        );
    }

    /**
     * Asserts that a route returns the expected status code.
     *
     * @param string $route        The route to test.
     * @param int    $status_code  The expected status code.
     * @param string $method       The HTTP method to use for the request.
     * @param int    $user_id      The ID of the user to use for the request.
     * @param array  $params       The parameters to send with the request.
     */
    protected function assertRouteStatusEquals(
        $route,
        $status_code,
        $method = "GET",
        $user_id = 0,
        $params = []
    ) {
        $this->set_current_user($user_id);

        $request = $this->create_request($route, $method, $params);
        $response = $this->server->dispatch($request);

        $this->assertEquals(
            $status_code,
            $response->get_status(),
            "Route '{$route}' did not return status code {$status_code}."
        );
    }
}
