define(['drp-app-api', 'deparam'], function(PluginAPI, deparam) {
    'use strict';

    var AppAuth = function(params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = null;
        }

        params = params || deparam((window.location.search || '').substr(1));

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

    return AppAuth;
});