define([
    'underscore',
    'jquery',
    'drp-app-auth',
    'drp-app-api',
    'drp-ah5-communicator',
    'translator',
    'imboclient',
    'uploader',
    'meta-editor',
    'image-editor'
], function(_, $, appAuth, appApi, editor, Translator, Imbo, Uploader, MetaEditor, ImageEditor) {
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
            this.language = this.config.language;

            // Initialize a simple event-emitter based on jQuery
            this.events   = $({});

            // Reveal the UI of the application once the translations have loaded
            this.initTranslator();

            // Remove 'standalone'-state if we're iframed
            if (window.self !== window.top) {
                document.body.classList.remove('standalone');
            }
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

            // Since we're loading async, uploader might
            // have been initialized before auth
            if (this.uploader) {
                this.uploader.setUserInfo(user);
            }
        },

        initTranslator: function() {
            this.translator = new Translator(this.language);
            this.translate  = this.translator.translate.bind(this.translator);
            this.translator.on('loaded', this.loadGui);
            this.translator.initialize();
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
            this.uploader.setUserInfo(this.user || {});

            // Initialize meta editor
            this.metaEditor = new MetaEditor();
            this.metaEditor.setTranslator(this.translator);
            this.metaEditor.setImboClient(this.imbo);

            // Initialize image editor
            this.imageEditor = new ImageEditor();
            this.imageEditor.setTranslator(this.translator);
            this.imageEditor.setImboClient(this.imbo);

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

            this.metaEditor
                .on('show', this.hideGui)
                .on('hide', this.showGui);

            this.imageEditor
                .on('show', this.hideGui)
                .on('hide', this.showGui);
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
                case 'show-image-info':
                    return this.showImageMetadata(imageId);
                case 'use-image':
                    return this.useImageInArticle(e);
            }
        },

        useImageInArticle: function(e) {
            e.preventDefault();

            var item    = $(e.currentTarget).closest('li'),
                name    = item.find('.full-image').data('filename'),
                imageId = item.data('image-identifier');

            this.imageEditor
                .show()
                .loadImage(imageId, {
                    width: item.data('width'),
                    height: item.data('height')
                });

            //var img = $('<img />').attr('src', url.maxSize(924).jpg().toString());
            //editor.insertElement($('<div />').append(img));
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

        showImageMetadata: function(imageId) {
            this.metaEditor.loadDataForImage(imageId);
            this.metaEditor.show();
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
                thumb = url.maxSize({ width: 158, height: 158 }).jpg().toString(),
                name  = image.metadata['drp:filename'] || image.imageIdentifier,
                el    = '';

            el += '<li data-image-identifier="' + image.imageIdentifier + '" data-width="' + image.width + '" data-height="' + image.height + '">';
            el += '<a href="' + full + '" class="full-image" data-filename="' + name + '" target="_blank">';
            el += ' <img src="' + thumb + '" alt="">';
            el += '</a>';
            el += this.getImageToolbarForImage(image, full, name);
            el += '</li>';

            html += el;
            return html;
        },

        hideGui: function() {
            this.content.addClass('hidden');
        },

        showGui: function() {
            this.content.removeClass('hidden');
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