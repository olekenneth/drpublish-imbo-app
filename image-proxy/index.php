<?php
function disable_ob() {
    ini_set('output_buffering', 'off');
    ini_set('zlib.output_compression', false);
    ini_set('implicit_flush', true);
    ob_implicit_flush(true);

    while (ob_get_level() > 0) {
        $level = ob_get_level();
        ob_end_clean();
        if (ob_get_level() == $level) {
            break;
        }
    }

    // Disable apache output buffering/compression
    if (function_exists('apache_setenv')) {
        apache_setenv('no-gzip', '1');
        apache_setenv('dont-vary', '1');
    }
}

$url = isset($_GET['url']) ? $_GET['url'] : false;
if (empty($url) || !preg_match('#^https?://#', $url)) {
    header('HTTP/1.0 400 Bad Url');
    header('Content-Type: application/json');
    echo json_encode(array('error' => 'URL needs to be a HTTP/HTTPS URL'));
    exit;
}

$options = array(
    'http' => array(
        'method'  => 'HEAD',
        'timeout' => 5,
    )
);

$urlParts = parse_url(urldecode($url));
$up = (
    isset($urlParts['username']) && isset($urlParts['password']) ?
    ($urlParts['username'] . ':' . $urlParts['password'] . '@') : ''
);

$url = implode('', array(
    $urlParts['scheme'] . '://',
    $up,
    $urlParts['host'],
    isset($urlParts['port']) ? ':' . $urlParts['port'] : '',
    implode('/', array_map('rawurlencode', explode('/', $urlParts['path']))),
    isset($urlParts['query']) ? ('?' . $urlParts['query']) : ''
));

$ctx = stream_context_create($options);

@file_get_contents($url, false, $ctx);

if (empty($http_response_header)) {
    header('HTTP/1.0 400 Bad Url');
    header('Content-Type: application/json');
    echo json_encode(array(
        'error' => 'Request for URL did not return an HTTP 200-response',
        'url' => $url,
    ));
    exit;
} else {
    $httpCode = (int) preg_replace('#^HTTP/\d\.\d (\d+).*#', '$1', $http_response_header[0]);
    if ($httpCode !== 200) {
        header('HTTP/1.0 400 Bad Url');
        header('Content-Type: application/json');
        echo json_encode(array(
            'error' => 'Request for URL resulted in an HTTP ' . $httpCode,
            'url' => $url,
        ));
        exit;
    }
}

$ifModifiedSince = trim(isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? $_SERVER['HTTP_IF_MODIFIED_SINCE'] : '');
$ifNoneMatch     = trim(isset($_SERVER['HTTP_IF_NONE_MATCH']) ? $_SERVER['HTTP_IF_MODIFIED_SINCE'] : '');

$lastModified    = false;
$etag            = false;
$contentLength   = false;
$contentType     = false;

foreach ($http_response_header as $header) {
    $parts  = explode(': ', $header, 2);
    $header = strtolower($parts[0]);
    $value  = isset($parts[1]) ? $parts[1] : '';

    if ($header === 'content-type' && !preg_match('#^image/#i', $value)) {
        header('HTTP/1.0 400 Bad Url');
        header('Content-Type: application/json');
        echo json_encode(array('error' => 'Requested URL was not an image'));
        exit;
    } else if ($header === 'content-type') {
        $contentType = $value;
    }

    if ($header === 'last-modified') {
        $lastModified = trim($value);
    } else if ($header === 'etag') {
        $etag = trim($value);
    } else if ($header === 'content-length') {
        $contentLength = $value;
    }
}

if ($ifModifiedSince === $lastModified || $ifNoneMatch === $etag) {
    header('HTTP/1.0 304 Not Modified');
    exit;
}

if ($contentLength) {
    header('Content-Length: ' . $contentLength);
}

if ($contentType) {
    header('Content-Type: ' . $contentType);
}

if ($lastModified) {
    header('Last-Modified: ' . $lastModified);
}

if ($etag) {
    header('ETag: ' . $etag);
}

ob_clean();
flush();

$ctx = stream_context_create(array(
    'http' => array(
        'method'  => 'GET',
        'timeout' => 120,
    )
));

$handle = fopen($url, 'rb', false, $ctx);
while (!feof($handle)) {
    echo fread($handle, 8192);
    flush();
}

fclose($handle);
