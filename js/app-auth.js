define(['drp-plugin-api', 'deparam'], function(PluginAPI, deparam) {
    'use strict';

    var PluginAuth = function(params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = null;
        }

console.debug('stef: auth params', params);
        params = params || deparam((window.location.search || '').substr(1));
console.debug('stef: auth params', params);
console.debug('stef: auth arguments', arguments);

        if (callback) {
            PluginAPI.eventListeners.add('appAuthenticated', callback);
        }
        PluginAPI.setAppName(params.appName);
        PluginAPI.doStandardAuthentication(
            (params.authUrl || 'auth/') + '?' + $.param({
                'auth': params.auth,
                'iv'  : params.iv
            })
        );
    };

    return PluginAuth;
});