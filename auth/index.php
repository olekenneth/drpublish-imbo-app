<?php
require 'auth.php';
$config = require '../config/config.php';
$defaults = array('app' => '', 'iv' => '', 'auth' => '');
$params   = array_merge($defaults, $_GET);

// Make sure we catch terminated HTTPS connections
$xProto = 'HTTP_X_FORWARDED_PROTO';
$https  = empty($_SERVER['HTTPS']) || (isset($_SERVER[$xProto]) && $_SERVER[$xProto] == 'https');
$port   = (int) $_SERVER['SERVER_PORT'];
$url    = 'http' . ($https ? 's' : '') . '://' . $_SERVER['SERVER_NAME'];
$url   .= (($port == 80 || $port == 443) ? '' : (':' . $port)) . $_SERVER['REQUEST_URI'];

// Registers the app using the name passed along in the iframe parameter.
// Second parameter is the shared secret key. Use DrPublish if a secret key
// is not specified in DrPublish for this App
$app   = new AptomaApp($params['app'], 'DrPublish', $url);
$valid = $app->validate($params['auth'], $params['iv']);

// Validates the two variables that were passed along in the iframe paramter
if ($valid || $config['bypassAuth'] === true) {
    $token = $app->getAuthenticationToken();
    echo json_encode($token);
} else {
    header('HTTP/1.0 403 Forbidden');
}