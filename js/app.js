define([
    'underscore',
    'jquery',
    'drp-app-auth',
    'drp-app-api',
    'translator',
    'imboclient',
    'uploader',
    'meta-editor',
    'image-editor'
], function(_, $, appAuth, appApi, Translator, Imbo, Uploader, MetaEditor, ImageEditor) {
    'use strict';

    var ImboApp = function(config) {
        this.setConfig(config);
    };

    ImboApp.MAX_ITEMS_PER_PAGE  = 45;
    ImboApp.DEFAULT_IMAGE_SIZES = [
        {
            'name': 'default',
            'width': 590
        }, {
            'name': 'max',
            'width': 590
        }, {
            'name': 'small',
            'width': 270,
            'float': 'right'
        }, {
            'name': 'panorama',
            'width': 590,
            'height': 295,
            'type': 'autocrop'
        }, {
            'name': 'x-small',
            'width': 100,
            'float': 'right'
        }
    ];

    _.extend(ImboApp.prototype, {

        AppName: 'imbo-images',

        initialize: function() {
            _.bindAll(this);

            // Set base URL for the app
            var loc = window.location;
            this.baseUrl = loc.href.replace(loc.search, '').replace(/\/$/, '');

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

            // Check if app is running standalone or in iframe
            this.standalone = window.self === window.top;

            // Remove 'standalone'-state if we're iframed
            if (!this.standalone) {
                document.body.classList.remove('standalone');
            }
        },

        initializeEditor: function() {
            appApi.Editor.initMenu(['simplePluginMenu', 'editContext', 'deleteButton']);

            appApi.Editor.registerMenuActionGroup({
                label: 'size',
                icon: this.baseUrl + '/img/compress.svg',
                actions: this.getImageResizeActions()
            });
        },

        setConfig: function(config) {
            this.config = config || {};
            this.imageSizes = ImboApp.DEFAULT_IMAGE_SIZES || [];
        },

        getImageResizeActions: function() {
            var actions = [], sizes = this.imageSizes;
            for (var i = 0; i < sizes.length; i++) {
                actions.push({
                    label: sizes[i].name,
                    callback: _.partial(this.resizeSelectedImage, sizes[i])
                });
            }

            return actions;
        },

        resizeSelectedImage: function(options, id, clickedElementId) {
            var floats = ['dp-float-left', 'dp-float-right', 'dp-float-none'];

            appApi.Editor.getHTMLById(id, function(html) {
                var el  = $(html),
                    img = el.find('img[data-transformations]');

                // Remove all existing floats
                el.removeClass(floats.join(' '));

                // Add float for chosen size (if any)
                if (options.float) {
                    el.addClass('dp-float-' + options.float);
                }

                // Get the transformations applied to the image
                var imgUrl = this.imbo.parseImageUrl(img.attr('src')),
                    transformations = imgUrl.getTransformations();

                // Reset to contain no transformations
                imgUrl.reset();

                // Re-apply all transformations except any maxSize
                transformations.filter(function(t) {
                    return t.indexOf('maxSize') !== 0;
                }).map(imgUrl.append, imgUrl);

                // Apply new image size
                imgUrl.maxSize({ width: options.width });

                // Replace the image source
                img
                    .attr('src', imgUrl.toString())
                    .attr('width', options.width)
                    .attr('data-transformations', imgUrl.getTransformations());

                appApi.Editor.replaceElementById(
                    id,
                    el.get(0).outerHTML,
                    function() { appApi.Editor.markAsActive(id); }
                );
            }.bind(this));
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

            document.body.classList.add('lang-' + this.translator.getLanguage());
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

            // Cache jQuery window object
            this.window = $(window);

            // Cache an image-toolbar template for later use
            this.imageToolbar = $('<div />').append(
                $('.image-toolbar').clone().removeClass('hidden')
            ).html();

            // Find DOM-element for "selected image"-GUI
            this.selectedImage = $('fieldset.selected-image');

            // Initialize the uploader
            this.uploader = new Uploader(this.imbo);
            this.uploader.setUserInfo(this.user || {});

            // Initialize meta editor
            this.metaEditor = new MetaEditor();
            this.metaEditor.setTranslator(this.translator);
            this.metaEditor.setImboClient(this.imbo);

            // Initialize image editor
            this.imageEditor = new ImageEditor(this.standalone);
            this.imageEditor.setTranslator(this.translator);
            this.imageEditor.setImboClient(this.imbo);

            // Initialize search GUI
            this.searchForm = $('form.search');
            this.refreshButton = this.searchForm.find('.refresh');

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
            this.window
                .on('resize', _.debounce(this.onWindowResize, 100))
                .trigger('resize');

            this.content
                .find('.image-list')
                .on('click', 'button', this.onToolbarClick)
                .on('click', '.full-image', this.useImageInArticle);

            this.uploader
                .on('image-uploaded', this.onImageAdded)
                .on('image-batch-completed', this.showImageBatchMetadataDialog)
                .on('image-batch-completed', this.refreshImages)
                .on('scanpix-init-upload', this.initScanpixUpload);

            this.metaEditor
                .on('show', this.hideGui)
                .on('hide', this.showGui);

            this.imageEditor
                .on('show', this.hideGui)
                .on('hide', this.showGui)
                .on('editor-image-selected',   this.onEditorImageSelected)
                .on('editor-image-deselected', this.onEditorImageDeselected);

            this.selectedImage
                .find('.edit-image')
                .on('click', this.editImageInArticle);

            this.searchForm
                .on('submit', this.onImageSearch);

            this.refreshButton
                .on('click', this.refreshImages);

            this.getImageList()
                .on('scroll', this.onImageListScroll);

            appApi.on('receivedFocus', _.bind(function(e) {
                if (e.data.previousPluginName !== 'scanpix') {
                    return;
                }

                this.uploadScanpixImages(e.data.items);
            }, this));
        },

        uploadScanpixImages: function(scanpixImages) {
            this.uploader.addScanpixImages(scanpixImages);
        },

        onWindowResize: function() {
            this.getImageList()
                .css('max-height', this.window.height() - 180);
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
        },

        editImageInArticle: function(e) {
            var id = this.selectedImageOptions.imageIdentifier;
            this.imbo.getImages(new Imbo.Query().ids([id]), function(err, info) {
                if (err) {
                    return console.error(err);
                }

                this.imageEditor
                    .show()
                    .loadImage(this.selectedImageOptions.imageIdentifier, {
                        width:  info[0].width,
                        height: info[0].height,
                        crop:   this.selectedImageOptions.cropParams,
                        cropAspectRatio: this.selectedImageOptions.cropAspectRatio,
                        transformations: this.selectedImageOptions.transformations
                    });
            }.bind(this));
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

        refreshImages: function() {
            this.loadImages({ clear: true });
        },

        loadImages: function(options) {
            options = options || {};
            var query = ((options.query || this.imageQuery || new Imbo.Query())
                .metadata(true)
                .limit(options.limit || ImboApp.MAX_ITEMS_PER_PAGE)
                .page(options.page   || 1));

            this.imbo.getImages(query, options.clear ? function() {
                this.getImageList().empty();
                this.onImagesLoaded.apply(this, arguments);
                this.getImageList().get(0).scrollTop = 0;
            }.bind(this) : this.onImagesLoaded);

            this.isLoadingImages = true;
        },

        queryImages: function(query) {
            this.imageQuery = new Imbo.Query().metadataQuery(query);
            this.loadImages({
                query: this.imageQuery
            });
        },

        getImageList: function() {
            this.currentImages = this.currentImages || $('.current-images');
            this.imageList = this.imageList || this.currentImages.find('.image-list');

            return this.imageList;
        },

        onImagesLoaded: function(err, images, search) {
            this.isLoadingImages = false;
            if (err) {
                console.log('=== ERROR LOADING IMAGES ===');
                console.log(err);
                return;
            }

            images = _.reduce(images, this.buildImageListItem, '');

            var list = this.getImageList().append(images);

            this.totalImageCount = search.hits;
            this.setImageDisplayCount(
                list.get(0).childNodes.length,
                search.hits
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

        initScanpixUpload: function() {
            appApi.giveFocus('scanpix');
        },

        onImageAdded: function(e, image) {
            this.imageList.prepend(this.buildImageListItem('', image));
            this.incImageDisplayCount(1, true);
        },

        onImageListScroll: function() {
            var el   = this.imageList[0],
                max  = parseInt(el.style.maxHeight, 10),
                curr = el.scrollTop + max,
                prct = (curr / el.scrollHeight) * 100;

            if (prct > 95 && !this.isLoadingImages) {
                this.loadNextPage();
            }
        },

        loadNextPage: _.throttle(function() {
            var nodes = this.getImageList().get(0).childNodes.length,
                page  = Math.floor(nodes / ImboApp.MAX_ITEMS_PER_PAGE) + 1;

            if (nodes < ImboApp.MAX_ITEMS_PER_PAGE || nodes >= this.totalImageCount) {
                return;
            }

            this.loadImages({ page: page });
        }, 2500, { trailing: false }),

        showImageBatchMetadataDialog: function(e, batch) {},

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
            // Get file name
            var fileName = image.metadata['drp:filename'] || [image.imageIdentifier, image.extension].join('.');

            // Build query string
            var queryString = [
                'name=' + encodeURIComponent(fileName),
                'mimetype=' + encodeURIComponent(image.mime)
            ].join('&');

            // Get ImageUrl
            var url = this.imbo.getImageUrl(image.imageIdentifier);

            // Set queryString on ImageUrl
            url = url.setQueryString(queryString);

            var full  = url.toString(),
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

        onEditorImageSelected: function(e, options) {
            var url = this.imbo.getImageUrl(options.imageIdentifier);
            for (var key in options.transformations) {
                url.append(options.transformations[key]);
            }

            this.selectedImageOptions = options;
            this.selectedImage
                .find('.image-preview')
                .attr('src', url.maxSize({ width: 225, height: 225 }).toString());

            this.selectedImage.removeClass('hidden');
        },

        onEditorImageDeselected: function(e) {
            this.selectedImage.addClass('hidden');
        },

        onImageSearch: function(e) {
            e.preventDefault();

            // Empty the current list of items
            this.getImageList().empty();

            // Get query from input field
            var q = e.target.query.value;

            // If the query field is empty, show all images
            if (!q.length) {
                this.imageQuery = null;
                return this.loadImages();
            }

            // Set up queries for the default fields
            var query = { '$or': [] }, sub;
            ['drp:title', 'drp:filename', 'drp:description'].forEach(function(item) {
                sub = {};
                sub[item] = { '$wildcard': '*' + q.replace(/^\*|\*$/g, '') + '*' };
                query.$or.push(sub);
            });

            // Run the query
            this.queryImages(query);
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
