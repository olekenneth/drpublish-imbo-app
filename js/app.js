define(['underscore', 'jquery', 'drp-app-auth', 'drp-app-api', 'imboclient'], function(_, $, appAuth, appApi, Imbo) {
    'use strict';

    var ImboApp = function(config) {
        this.setConfig(config);
    };

    _.extend(ImboApp.prototype, {

        AppName: 'imbo-images',

        initialize: function() {
            _.bindAll(this);

            // Authenticate application
            appAuth(this.onAuthed);

            // Instantiate a new Imbo client
            this.imbo = new Imbo.Client(
                this.config.imbo.host,
                this.config.imbo.publicKey,
                this.config.imbo.privateKey
            );

            // Define language to use based on configuration
            this.language = (_.contains(['en', 'no'], this.config.language) ?
                            this.config.language : 'en');

            // Initialize a simple event-emitter based on jQuery
            this.events   = $({});

            // Reveal the UI of the application once the translations have loaded
            this.on('translation-loaded', this.loadGui);
            this.loadTranslations();
        },

        setConfig: function(config) {
            this.config = config || {};
        },

        // When authentication has completed...
        onAuthed: function() {
            this.user = {};
            appApi.getCurrentUser(this.onUserInfoReceived);
        },

        // When user info has been received, cache info
        onUserInfoReceived: function(user) {
            this.user = user;
        },

        loadTranslations: function() {
            this.translations = {};
            require(['language/' + this.language], function(strings) {
                this.translations = strings;
                this.trigger('translation-loaded');
            }.bind(this));
        },

        translateElement: function(i, el) {
            el = $(el);

            var text  = el.data('translate'),
                title = el.data('translate-title');

            if (text) {
                el.text(this.translate(text));
            }

            if (title) {
                el.attr('title', this.translate(title));
            }
        },

        translateGui: function() {
            $('[data-translate], [data-translate-title]').each(this.translateElement);
        },

        loadGui: function() {
            // Translate all GUI-elements to the correct language
            this.translateGui();

            // Cache an image-toolbar template for later use
            this.imageToolbar = $('<div />').append(
                $('.image-toolbar').clone().removeClass('hidden')
            ).html();

            // Find the content element, apply skin and make it appear
            this.content = $(document.body)
                .addClass('dp-theme-' + (this.config.skin || 'light'))
                .removeClass('loading')
                .find('.content');

            // Bind any DOM-events
            this.bindEvents();

            // Load initial set of images from Imbo
            this.loadImages();
        },

        bindEvents: function() {
            this.content
                .find('.file-upload')
                .on('change', this.onImageSelected);

            this.content
                .find('.image-list')
                .on('click', 'button', this.onToolbarClick);
        },

        onToolbarClick: function(e) {
            var el      = $(e.currentTarget),
                item    = el.closest('li'),
                action  = el.data('action'),
                imageId = item.data('image-identifier');

            if (!action) { return; }

            switch (action) {
                case 'delete-image':
                    return this.deleteImage(imageId, item);
            }
        },

        deleteImage: function(imageId, listItem) {
            if (!confirm(this.translate('CONFIRM_DELETE_IMAGE'))) {
                return false;
            }

            this.imbo.deleteImage(imageId, function(err) {
                if (err) {
                    return alert(this.translate('FAILED_TO_DELETE_IMAGE'));
                }

                if (listItem) {
                    listItem.remove();
                }
            }.bind(this));
        },

        onImageSelected: function(e) {
            var files = e.target.files;
            for (var i = 0; i < files.length; i++) {
                this.imbo.addImage(
                    files[i],
                    _.partialRight(this.onImageAdded, files[i].name)
                );
            }
        },

        onImageAdded: function(err, imageId, response, filename) {
            if (err) {
                console.error(err);
                return alert(this.translate('FAILED_TO_UPLOAD_IMAGE'));
            }

            this.imbo.editMetadata(imageId, {
                'drp:filename': filename,
                'drp:uploader': {
                    'fullname': this.user.fullname,
                    'username': this.user.username
                }
            }, function() {});
        },

        loadImages: function(limit, page) {
            var query = new Imbo.Query();
            query.metadata(true);
            query.limit(limit || 50).page(page || 1);

            this.imbo.getImages(query, this.onImagesLoaded);
        },

        onImagesLoaded: function(err, images, search) {
            if (err) {
                console.log('=== ERROR LOADING IMAGES ===');
                console.log(err);
                return;
            }

            var images = _.reduce(images, this.buildImageListItem, '');
            $('.image-list').append(images);
        },

        getImageToolbarForImage: function(image, imageUrl) {
            console.log(image);
            var filename = image.metadata['drp:filename'] || image.imageIdentifier;
            return (this.imageToolbar
                .replace(/\#download\-link/, imageUrl)
                .replace(/\#file\-name/, filename)
            );
        },

        buildImageListItem: function(html, image) {
            var url   = this.imbo.getImageUrl(image.imageIdentifier),
                full  = url.toString(),
                thumb = url.maxSize(154, 154).jpg().toString(),
                el    = '';

            el += '<li data-image-identifier="' + image.imageIdentifier + '">';
            el += '<img src="' + thumb + '" alt="">';
            el += this.getImageToolbarForImage(image, full);
            el += '</li>';

            html += el;
            return html;
        },

        translate: function(id) {
            return this.translations[id] || id;
        },

        on: function(e, handler) {
            this.events.on(e, handler);
        },

        off: function(e, handler) {
            this.events.off(e, handler);
        },

        trigger: function(e, handler) {
            this.events.trigger(e, handler);
        }
    });

    return ImboApp;
});