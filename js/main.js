require.config({
    paths: {
        'underscore': '../vendor/lodash-2.4.1.min',
        'jquery': '../vendor/jquery-2.1.0.min',
        'postmessage': '../no.aptoma.plugin-api/js/vendors/jquery.postmessage',
        'deparam': '../vendor/jquery-deparam.min',
        'draghover': '../vendor/jquery-draghover',
        'jcrop': '../vendor/jcrop/jquery.Jcrop.min',
        'drp-ah5-communicator': '../no.aptoma.plugin-api/js/AH5Communicator',
        'drp-app-api': '../no.aptoma.plugin-api/js/AppAPI',
        'drp-article-communicator': '../no.aptoma.plugin-api/js/ArticleCommunicator',
        'drp-listeners': '../no.aptoma.plugin-api/js/Listeners',
        'drp-app-auth': 'app-auth',
        'imboclient': '../vendor/imboclient-2.2.1',
        'async': '../vendor/async-0.2.10'
    },
    shim: {
        'postmessage': {
            deps: ['jquery'],
            exports: 'pm'
        },
        'jcrop': {
            deps: ['jquery']
        },
        'drp-listeners': {
            deps: ['jquery'],
            exports: 'Listeners'
        },
        'drp-app-api': {
            deps: ['jquery', 'postmessage', 'drp-listeners'],
            exports: 'AppAPI'
        },
        'drp-ah5-communicator': {
            deps: ['jquery', 'postmessage', 'drp-app-api'],
            exports: 'AH5Communicator'
        },
        'drp-article-communicator': {
            deps: ['jquery', 'postmessage', 'drp-app-api'],
            exports: 'ArticleCommunicator'
        }
    }
});

require(['app', 'deparam'], function(App, deparam) {
    'use strict';

    if (!window.Drp || !Drp.ImboConfig) {
        return alert('ImboConfig not defined. See config folder.');
    }

    // Load parameters from query string
    var config = deparam((window.location.search || '').substr(1));

    // Merge in Imbo-config
    config.imbo = Drp.ImboConfig;

    // Initialize application
    new App(config).initialize();
});
