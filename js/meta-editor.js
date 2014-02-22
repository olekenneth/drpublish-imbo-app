define([
    'underscore',
    'jquery',
    'drp-app-api',
    'drp-article-communicator'
], function(_, $, appApi, articleCommunicator) {

    var MetaEditor = function() {
        this.initialize();
    };

    _.extend(MetaEditor.prototype, {
        MAX_IMAGE_WIDTH:  924,
        MAX_IMAGE_HEIGHT: 693,

        initialize: function() {
            _.bindAll(this);

            this.editorPane = $('.meta-editor');
            this.inputPane  = $('.input-pane');
            this.imageView  = this.editorPane.find('.image-container');

            this.events = $({});
            this.bindEvents();
        },

        bindEvents: function() {
            $(window)
                .on('resize', _.debounce(this.resizePanes, 150))
                .trigger('resize');

            this.editorPane
                .find('.close')
                .on('click', this.hide);

            this.editorPane
                .find('.save')
                .on('click', this.saveMetadata);
        },

        setTranslator: function(translator) {
            this.translator = translator;
        },

        setImboClient: function(imboClient) {
            this.imbo = imboClient;
        },

        resizePanes: function() {
            this.imageView.css('height', $(window).height() - 50);
        },

        show: function() {
            // Maximize app window (if in app context)
            articleCommunicator.maximizeAppWindow(
                this.translator.translate('META_EDITOR_TITLE'),
                this.hide
            );

            // Show the editor pane and trigger a show-event
            this.editorPane.removeClass('hidden');
            this.trigger('show');
        },

        hide: function() {
            this.imageIdentifier = null;

            this.editorPane.addClass('hidden');
            this.trigger('hide');

            articleCommunicator.restoreAppWindow();

            appApi.hideLoader();
        },

        resetState: function() {
            this.inputPane.find('input, textarea').val('');
            this.imageView.css('background-image', '');
        },

        loadDataForImage: function(imageId) {
            // Reset state so we're not showing old data
            this.resetState();

            // Ensure app knows which image to change metadata on
            this.imageIdentifier = imageId;

            // Start loading image
            this.setImageViewUrl(
                this.imbo.getImageUrl(imageId).maxSize({
                    width: this.MAX_IMAGE_WIDTH,
                    height: this.MAX_IMAGE_HEIGHT
                }).jpg()
            );

            // Show a loading indicator while loading metadata
            appApi.showLoader(
                this.translator.translate('META_EDITOR_LOADING_METADATA')
            );

            // Fetch metadata for image
            this.imbo.getMetadata(imageId, this.onImageDataLoaded);
        },

        setImageViewUrl: function(url) {
            this.imageView.css(
                'background-image',
                'url(' + url.toString() + ')'
            );
        },

        onImageDataLoaded: function(err, data) {
            this.inputPane.find('input, textarea').each(function(i, el) {
                var name = el.getAttribute('name');
                if (data[name]) {
                    el.value = data[name];
                } else if (name === 'drp:title' && data['drp:filename']) {
                    el.value = data['drp:filename'];
                }
            });

            appApi.hideLoader();
        },

        getMetadataFromInputs: function() {
            return _.reduce(
                this.inputPane.find('input, textarea'),
                function(data, el) {
                    data[el.getAttribute('name')] = el.value;
                    return data;
                }, {}
            );
        },

        saveMetadata: function() {
            if (!this.imageIdentifier) {
                return console.error('Tried to save metadata, no image active');
            }

            appApi.showLoader(
                this.translator.translate('META_EDITOR_SAVING_METADATA')
            );

            this.imbo.editMetadata(
                this.imageIdentifier,
                this.getMetadataFromInputs(),
                this.hide
            );
        },

        on: function(e, handler) {
            this.events.on(e, handler);
            return this;
        },

        off: function(e, handler) {
            this.events.off(e, handler);
            return this;
        },

        trigger: function(e, handler) {
            this.events.trigger(e, handler);
            return this;
        }
    });

    return MetaEditor;

});