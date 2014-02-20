define([
    'underscore',
    'jquery',
    'drp-app-auth',
    'drp-app-api',
    'drp-article-communicator',
    'drp-ah5-communicator',
    'imboclient',
    'uploader'
], function(_, $, appAuth, appApi, articleCommunicator, editor, Imbo, Uploader) {
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

            // Init DrPublish editor
            this.initializeEditor();

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

        initializeEditor: function() {
            editor.initMenu(['simplePluginMenu']);
        },

        setConfig: function(config) {
            this.config = config || {};
        },

        // When authentication has completed...
        onAuthed: function() {
            this.authed = true;
            this.user   = {};
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

            // Initialize the uploader
            this.uploader = new Uploader(this.imbo);

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
                .find('.image-list')
                .on('click', 'button', this.onToolbarClick)
                .on('click', '.full-image', this.useImageInArticle);

            this.uploader
                .on('image-uploaded', this.onImageAdded)
                .on('image-batch-completed', this.showImageBatchMetadataDialog);
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
                case 'use-image':
                    return this.useImageInArticle(e);
            }
        },

        useImageInArticle: function(e) {
            if (!this.authed) {
                return;
            }

            e.preventDefault();

            var item    = $(e.currentTarget).closest('li'),
                name    = item.find('.full-image').data('filename'),
                imageId = item.data('image-identifier'),
                url     = this.imbo.getImageUrl(imageId);

            var img = $('<img />').attr('src', url.maxSize(590).jpg().toString());


            editor.insertElement($('<div />').append(img));

            /*
            articleCommunicator.maximizeAppWindow(name, function() {
                console.log('CLOSED');
            });
            */
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
                    this.incImageDisplayCount(-1, true);
                }
            }.bind(this));
        },

        loadImages: function(limit, page) {
            var query = query || new Imbo.Query();
            query.metadata(true);
            query.limit(limit || 50).page(page || 1);

            this.imbo.getImages(query, this.onImagesLoaded);
        },

        queryImages: function(query) {
            this.imbo.getImages(query, this.onImagesLoaded);
        },

        onImagesLoaded: function(err, images, search) {
            if (err) {
                console.log('=== ERROR LOADING IMAGES ===');
                console.log(err);
                return;
            }

            this.currentImages = this.currentImages || $('.current-images');
            this.imageList = this.imageList || this.currentImages.find('.image-list');

            var images = _.reduce(images, this.buildImageListItem, '');
            this.imageList.append(images);

            this.setImageDisplayCount(
                this.imageList.get(0).childNodes.length,
                search.count
            );
        },

        setImageDisplayCount: function(display, total) {
            this.displayCount  = (this.displayCount  || this.currentImages.find('.display-count'));
            this.totalHitCount = (this.totalHitCount || this.currentImages.find('.total-hit-count'));

            this.displayCount.text(display);

            if (isNaN(total)) { return; }
            this.totalHitCount.text(total);
        },

        incImageDisplayCount: function(count, incTotalAmount) {
            this.displayCount  = (this.displayCount  || this.currentImages.find('.display-count'));
            this.totalHitCount = (this.totalHitCount || this.currentImages.find('.total-hit-count'));

            var display = parseInt(this.displayCount.text(), 10),
                total   = parseInt(this.totalHitCount.text(), 10);

            this.displayCount.text(display + (count || 1));
            if (incTotalAmount) {
                this.totalHitCount.text(total + (count || 1));
            }
        },

        onImageAdded: function(e, image) {
            this.imageList.append(this.buildImageListItem('', image));
            this.incImageDisplayCount(1, true);
        },

        showImageBatchMetadataDialog: function(e, batch) {
            console.log('batch', batch);
        },

        getImageToolbarForImage: function(image, imageUrl, fileName) {
            return (this.imageToolbar
                .replace(/\#download\-link/, imageUrl)
                .replace(/\#file\-name/, fileName)
            );
        },

        buildImageListItem: function(html, image) {
            var url   = this.imbo.getImageUrl(image.imageIdentifier),
                full  = url.toString(),
                thumb = url.maxSize(158, 158).jpg().toString(),
                name  = image.metadata['drp:filename'] || image.imageIdentifier,
                el    = '';

            el += '<li data-image-identifier="' + image.imageIdentifier + '">';
            el += '<a href="' + full + '" class="full-image" data-filename="' + name + '" target="_blank">';
            el += ' <img src="' + thumb + '" alt="">';
            el += '</a>';
            el += this.getImageToolbarForImage(image, full, name);
            el += '</li>';

            html += el;
            return html;
        },

        translate: function(id) {
            return this.translations[id] || id;
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

    return ImboApp;
});