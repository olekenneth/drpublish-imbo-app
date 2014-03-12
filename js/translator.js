define(['underscore'], function(_) {

    // Defined languages
    var languages = ['en', 'no'];

    // Translator class
    var Translator = function(language) {
        this.translations = {};

        this.language = _.contains(languages, language) ? language : 'en';
    };

    _.extend(Translator.prototype, {
        initialize: function() {
            _.bindAll(this);

            this.loadTranslationFile(this.language);
        },

        getLanguage: function() {
            return this.language;
        },

        loadTranslationFile: function(language) {
            require(['language/' + language], this.onTranslationLoaded);
        },

        onTranslationLoaded: function(strings) {
            this.loaded = true;
            this.translations = strings;

            if (this.onLoadedCallback) {
                this.onLoadedCallback();
            }
        },

        on: function(evt, callback) {
            if (evt === 'loaded') {
                this.onLoadedCallback = callback;
            }
        },

        translate: function(id) {
            if (!this.loaded) {
                console.warn('Translation strings are not loaded - call initialize() on translator');
            }

            return this.translations[id] || id;
        }
    });

    return Translator;

});