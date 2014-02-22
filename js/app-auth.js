define(['drp-app-api', 'deparam'], function(AppAPI, deparam) {
    'use strict';

    var AppAuth = function(params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = null;
        }

        params = params || deparam((window.location.search || '').substr(1));

        if (callback) {
            AppAPI.eventListeners.add('appAuthenticated', callback);
        }

        AppAPI.setAppName(params.appName);
        AppAPI.doStandardAuthentication(
            (params.authUrl || 'auth/') + '?' + $.param({
                'auth': params.auth,
                'iv'  : params.iv
            })
        );
    };

    return AppAuth;
});