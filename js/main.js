require.config({
    paths: {
        'underscore': '../vendor/lodash-3.10.1.min',
        'jquery': '../vendor/jquery-2.1.0.min',
        'postmessage': '../no.aptoma.plugin-api/js/vendors/jquery.postmessage',
        'deparam': '../vendor/jquery-deparam.min',
        'draghover': '../vendor/jquery-draghover',
        'jcrop': '../vendor/jcrop/jquery.Jcrop.min',
        'drp-ah5-communicator': '../no.aptoma.plugin-api/js/AH5Communicator',
        'drp-plugin-api': '../no.aptoma.plugin-api/js/PluginAPI',
        'drp-article-communicator': '../no.aptoma.plugin-api/js/ArticleCommunicator',
        'drp-listeners': '../no.aptoma.plugin-api/js/Listeners',
        'imboclient': '../vendor/imboclient-3.1.1',
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
        'drp-plugin-api': {
            deps: ['jquery', 'postmessage', 'drp-listeners'],
            exports: 'PluginAPI'
        },
        'drp-ah5-communicator': {
            deps: ['jquery', 'postmessage', 'drp-plugin-api'],
            exports: 'PluginAPI.Editor'
        },
        'drp-article-communicator': {
            deps: ['jquery', 'postmessage', 'drp-plugin-api'],
            exports: 'PluginAPI.Article'
        }
    },
    urlArgs: 'cachebreaker=' + (new Date()).getTime()
});

require([
    'app',
    'publicationHelpers/getHelpers',
    'deparam',
    'drp-plugin-api',
    'drp-ah5-communicator',
    'drp-article-communicator'
], function(App, getHelpers, deparam) {
    'use strict';

    if (!window.Drp || !Drp.ImboConfig) {
        return alert('ImboConfig not defined. See config folder.');
    }

    // Load parameters from query string
    var config = deparam((window.location.search || '').substr(1));

    // Merge in Imbo-config
    config.imbo = Drp.ImboConfig;

    // Get helpers for the current publication
    var helpers = getHelpers(config.publicationId);

    // Initialize application
    new App(config, helpers).initialize();
});
