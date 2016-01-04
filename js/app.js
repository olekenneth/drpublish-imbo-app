define([
    'underscore',
    'jquery',
    'drp-plugin-api',
    'translator',
    'imboclient',
    'uploader',
    'meta-editor',
    'image-editor',
    'deparam',
    'helpers'
], function (_, $, PluginAPI, Translator, Imbo, Uploader, MetaEditor, ImageEditor, deparam, defaultHelpers) {
    'use strict';

    var ImboApp = function (config, helpers) {
        this.setConfig(config);
        this.setHelpers(helpers);
    };


    ImboApp.MAX_ITEMS_PER_PAGE = 45;
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

        initialize: function () {


            _.bindAll(this);

            // Set base config for the app
            var loc = window.location;
            this.baseUrl = loc.href.replace(loc.search, '').replace(/\/$/, '');
            var pluginParameters = deparam((window.location.search || '').substr(1));
            PluginAPI.getCurrentUser(this.onUserInfoReceived);
            PluginAPI.setAppName(pluginParameters.appName);

            // Instantiate a new Imbo client
            this.imbo = new Imbo.Client({
                hosts: this.config.imbo.host,
                user: this.config.imbo.user,
                publicKey: this.config.imbo.publicKey,
                privateKey: this.config.imbo.privateKey
            });

            // Define language to use based on configuration
            this.language = this.config.language;

            // Initialize a simple event-emitter based on jQuery
            this.events = $({});

            // Search query
            this.searchQuery = {};

            // Reveal the UI of the application once the translations have loaded
            this.initTranslator(function () {
                // Init DrPublish editor
                this.initializeEditor();

                // Load UI
                this.loadGui();
            }.bind(this));

            // Check if app is running standalone or in iframe
            this.standalone = window.self === window.top;

            // Remove 'standalone'-state if we're iframed
            if (!this.standalone) {
                document.body.classList.remove('standalone');
            }
        },

        initializeEditor: function () {
            PluginAPI.Editor.initMenu(['simplePluginMenu', 'editContext', 'deleteButton']);

            PluginAPI.Editor.registerMenuAction({
                label: this.translate('SELECTED_IMAGE_EDIT_IMAGE'),
                icon: 'gfx/icons/iconic/vector/svggen.php?file=pen&amp;fill=%231d4e6f',
                callback: this.editImageInArticle
            });

            PluginAPI.Editor.registerMenuActionGroup({
                label: 'size',
                icon: this.baseUrl + '/img/compress.svg',
                actions: this.getImageResizeActions()
            });
        },

        setConfig: function (config) {
            this.config = config || {};
            this.config.imageSizes = this.config.imbo.imageSizes;

            if (!this.config.imageSizes || !this.config.imageSizes.length) {
                this.config.imageSizes = ImboApp.DEFAULT_IMAGE_SIZES;
            }
        },

        setHelpers: function (helpers) {
            this.helpers = _.merge({}, defaultHelpers, helpers);
        },

        getImageResizeActions: function () {
            var actions = [], sizes = this.config.imageSizes;
            for (var i = 0; i < sizes.length; i++) {
                actions.push({
                    label: sizes[i].name,
                    callback: _.partial(this.resizeSelectedImage, sizes[i])
                });
            }

            return actions;
        },

        resizeSelectedImage: function (options, id, clickedElementId) {
            var floats = ['dp-float-left', 'dp-float-right', 'dp-float-none'];
            var sizes = ImboApp.DEFAULT_IMAGE_SIZES.map(function(size) { return 'dp-image-size-' + size.name; });

            PluginAPI.Editor.getHTMLById(id, function (html) {
                var el = $(html),
                    img = el.find('img');

                // Remove all existing floats
                el.removeClass(floats.join(' '));

                // Add float for chosen size (if any)
                if (options.float) {
                    el.addClass('dp-float-' + options.float);
                }

                // Remove all existing sizes
                el.removeClass(sizes.join(' '));

                // Add size as class
                el.addClass('dp-image-size-' + options.name);

                // Get the transformations applied to the image
                var imgUrl = this.imbo.parseImageUrl(img.attr('src')),
                    transformations = imgUrl.getTransformations();

                // Reset to contain no transformations
                imgUrl.reset();

                // Re-apply all transformations except any maxSize
                transformations.filter(function (t) {
                    return t.indexOf('maxSize') !== 0;
                }).map(imgUrl.append, imgUrl);

                // Apply new image size
                imgUrl.maxSize({width: options.width});

                // Replace the image source
                img
                    .attr('src', imgUrl.toString())
                    .attr('width', options.width)
                    .attr(
                    'data-transformations',
                    JSON.stringify(imgUrl.getTransformations())
                );

                // Set container max-width to new resized size
                el.find('.dp-article-image-container').css({'max-width': options.width + 'px'});

                PluginAPI.Editor.replaceElementById(
                    id,
                    el.get(0).outerHTML,
                    function () {
                        PluginAPI.Editor.markAsActive(id);
                    }
                );
            }.bind(this));
        },

        insertionEnabled: false,

        // When authentication has completed...
        onAuthed: function () {
            this.authed = true;
            this.user = {};
            PluginAPI.getCurrentUser(this.onUserInfoReceived);
        },

        // When user info has been received, cache info
        onUserInfoReceived: function (user) {
            this.user = user;

            // Since we're loading async, uploader might
            // have been initialized before auth
            if (this.uploader) {
                this.uploader.setUserInfo(user);
            }
        },

        initTranslator: function (callback) {
            this.translator = new Translator(this.language);
            this.translate = this.translator.translate.bind(this.translator);
            this.translator.on('loaded', callback);
            this.translator.initialize();

            document.body.classList.add('lang-' + this.translator.getLanguage());
        },

        translateElement: function (i, el) {
            el = $(el);

            var text = el.data('translate'),
                title = el.data('translate-title');

            if (text) {
                el.text(this.translate(text));
            }

            if (title) {
                el.attr('title', this.translate(title));
            }
        },

        translateGui: function () {
            $('[data-translate], [data-translate-title]').each(this.translateElement);
        },

        loadGui: function () {

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
            this.selectedImage.find('img').load(function () {
                $('.selected-image .loading .imbo-spinner').hide();
            });

            // Cache the scanpix loading indicator
            this.scanpixLoader = $('.scanpix-loading');

            // Initialize the uploader
            this.uploader = new Uploader(this.imbo);
            this.uploader.setUserInfo(this.user || {});

            // Initialize meta editor
            this.metaEditor = new MetaEditor(this);
            this.metaEditor.setTranslator(this.translator);
            this.metaEditor.setImboClient(this.imbo);

            // Initialize image editor
            this.imageEditor = new ImageEditor(this);
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

            // Check if a field is active or not and set the state accordingly
            PluginAPI.Editor.getEditorType(_.bind(function(activeField) {
                if (activeField) {
                    this.enableImageInsertion();
                } else {
                    this.disableImageInsertion();
                }
            }, this));

            // Bind any DOM-events
            this.bindEvents();

            // Load initial set of images from Imbo
            this.loadImages();
        },

        bindEvents: function () {
            this.window
                .on('scroll', _.throttle(this.checkScrollPagination.bind(this), 75));

            this.content
                .find('.image-list')
                .on('click', 'button', this.onToolbarClick)
                .on('click', '.full-image', this.useImageInArticle);

            this.uploader
                .on('image-uploaded', this.onImageAdded)
                .on('image-batch-completed', this.showImageBatchMetadataDialog)
                .on('image-batch-completed', this.refreshImages)
                .on('image-batch-completed', this.hideScanpixLoader)
                .on('scanpix-init-upload', this.initScanpixUpload);

            this.metaEditor
                .on('show', this.hideGui)
                .on('hide', this.showGui);

            this.imageEditor
                .on('show', this.hideGui)
                .on('hide', this.showGui)
                .on('editor-image-selected', this.onEditorImageSelected)
                .on('editor-image-deselected', this.onEditorImageDeselected);

            this.selectedImage
                .find('.edit-image')
                .on('click', this.editImageInArticle);

            this.searchForm
                .on('submit', this.onImageSearch);

            this.refreshButton
                .on('click', this.refreshImages);

            PluginAPI.on('receivedFocus', _.bind(function (e) {
                if (e.data.previousPluginName !== 'scanpix') {
                    return;
                }
                this.uploadScanpixImages(e.data.items);
            }, this));


            PluginAPI.on('assetFocus', _.bind(function (e) {
                this.selectedPackageAsset = e.data;
                this.enableImageInsertion();
                if (e.data && e.data.assetSource && e.data.assetSource === PluginAPI.appName) {
                    this.previewImage(e.data.options);
                }
            }, this));

            PluginAPI.on('assetBlur', _.bind(function (e) {
                this.selectedPackageAsset = null;
                this.onEditorImageDeselected();
                this.disableImageInsertion();
            }, this));

            PluginAPI.on('editorFocus', _.bind(function (e) {
                this.enableImageInsertion();
            }, this));

            PluginAPI.on('editorsLostFocus', _.bind(function (e) {
                this.disableImageInsertion();
            }, this));

            PluginAPI.on('elementRemoved', this.onEditorImageDeselected);
        },

        uploadScanpixImages: function (scanpixImages) {
            this.uploader.addScanpixImages(scanpixImages);
            this.scanpixLoader.removeClass('hidden');
        },

        hideScanpixLoader: function () {
            this.scanpixLoader.addClass('hidden');
        },

        onToolbarClick: function (e) {
            var el = $(e.currentTarget),
                item = el.closest('li'),
                action = el.data('action'),
                imageId = item.data('image-identifier');

            if (!action) {
                return;
            }

            switch (action) {
                case 'delete-image':
                    return this.deleteImage(imageId, item);
                case 'show-image-info':
                    return this.showImageInformation(imageId);
                case 'use-image':
                    return this.useImageInArticle(e);
            }
        },

        useImageInArticle: function (e) {
            e.preventDefault();

            if (this.standalone) {
                return;
            }
            var item = $(e.currentTarget).closest('li'), imageId = item.data('image-identifier');

            this.imageEditor
                .setUser(item.data('image-user'))
                .show()
                .loadImage(imageId, {
                    width: item.data('width'),
                    height: item.data('height'),
                    user: item.data('image-user')
                });


        },

        previewImage: function (options) {
            var url = this.imbo.user(options.user).getImageUrl(options.imageIdentifier);
            var maxDimension = 225;

            for (var key in options.transformations) {
                url.append(options.transformations[key]);
            }

            this.selectedImageOptions = options;
            this.selectedImage
                .find('.image-preview')
                .attr('src', url.maxSize({width: maxDimension, height: maxDimension}).toString());

            $('.selected-image .loading .imbo-spinner').show();
            this.selectedImage.animate({height: maxDimension + 20});

            $("html, body").animate(
                {scrollTop: 0},
                "slow",
                function () {
                    this.selectedImage.find('img, legend, .edit-image').show();
                }.bind(this)
            );
        },

        unpreviewImage: function () {
            this.selectedImage.find('img, legend, .edit-image').hide();
            this.selectedImage.animate({height: 0});
        },

        editImageInArticle: function (e) {
            var id = this.selectedImageOptions.imageIdentifier;
            this.imbo.getImages(new Imbo.Query().ids([id]), function (err, info) {
                if (err) {
                    return console.error(err);
                }
                this.imageEditor
                    .show()
                    .setUser(info[0].user)
                    .loadImage(this.selectedImageOptions.imageIdentifier, {
                        width: info[0].width,
                        height: info[0].height,
                        user: info[0].user,
                        crop: this.selectedImageOptions.cropParams,
                        cropAspectRatio: this.selectedImageOptions.cropRatio,
                        transformations: this.selectedImageOptions.transformations
                    });
            }.bind(this));
        },

        deleteImage: function (imageId, listItem) {
            if (!confirm(this.translate('CONFIRM_DELETE_IMAGE'))) {
                return false;
            }

            if (!confirm(this.translate('CONFIRM_DELETE_IMAGE_SURE'))) {
                return false;
            }

            this.imbo.deleteImage(imageId, function (err) {
                if (err) {
                    return alert(this.translate('FAILED_TO_DELETE_IMAGE'));
                }

                if (listItem) {
                    listItem.remove();
                    this.incImageDisplayCount(-1, true);
                }
            }.bind(this));
        },

        refreshImages: function () {
            if (!this.searchQuery || Object.keys(this.searchQuery).length === 0) {
                this.loadImages({clear: true});
            } else {
                this.queryImages(this.searchQuery, {clear: true});
            }
        },

        loadImages: function (options) {
            options = options || {};

            var query = ((options.query || this.imageQuery || new Imbo.Query())
                .metadata(true)
                .limit(options.limit || ImboApp.MAX_ITEMS_PER_PAGE)
                .page(options.page || 1));

            var onComplete = options.clear ? function () {
                this.getImageList().empty();
                this.onImagesLoaded.apply(this, arguments);
                this.getImageList().get(0).scrollTop = 0;
            }.bind(this) : this.onImagesLoaded;

            if (options.metadataQuery) {
                this.imbo.searchGlobalMetadata(options.metadataQuery, {
                    users: this.config.imbo.searchUsers,
                    metadata: true,
                    limit: query.limit(),
                    page: query.page()
                }, onComplete);
            } else {
                this.imbo.user(this.config.imbo.user).getImages(query, onComplete);
            }

            this.isLoadingImages = true;
        },

        queryImages: function (query, options) {
            this.loadImages(_.merge({
                metadataQuery: query
            }, options || {}));

            this.searchQuery = query;
        },

        getImageList: function () {
            this.currentImages = this.currentImages || $('.current-images');
            this.imageList = this.imageList || this.currentImages.find('.image-list');

            return this.imageList;
        },

        onImagesLoaded: function (err, images, search) {
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

        setImageDisplayCount: function (display, total) {
            this.displayCount = (this.displayCount || this.currentImages.find('.display-count'));
            this.totalHitCount = (this.totalHitCount || this.currentImages.find('.total-hit-count'));

            this.displayCount.text(display);

            if (isNaN(total)) {
                return;
            }
            this.totalHitCount.text(total);
        },

        incImageDisplayCount: function (count, incTotalAmount) {
            this.displayCount = (this.displayCount || this.currentImages.find('.display-count'));
            this.totalHitCount = (this.totalHitCount || this.currentImages.find('.total-hit-count'));

            var display = parseInt(this.displayCount.text(), 10),
                total = parseInt(this.totalHitCount.text(), 10);

            this.displayCount.text(display + (count || 1));
            if (incTotalAmount) {
                this.totalHitCount.text(total + (count || 1));
            }
        },

        initScanpixUpload: function () {
            PluginAPI.giveFocus('scanpix');
        },

        onImageAdded: function (e, image) {
            // Set user om image object
            image.user = this.config.imbo.user;

            // Prepend image to image list to show progress while uploading multiple images
            this.imageList.prepend(this.buildImageListItem('', image));
            this.incImageDisplayCount(1, true);
        },

        checkScrollPagination: function () {
            var max  = getDocumentHeight(),
                curr = (window.scrollY || window.scrollTop) + window.innerHeight,
                prct = (curr / max) * 100;

            if (prct > 95 && !this.isLoadingImages) {
                this.loadNextPage();
            }
        },

        loadNextPage: _.throttle(function () {
            var nodes = this.getImageList().get(0).childNodes.length,
                page = Math.floor(nodes / ImboApp.MAX_ITEMS_PER_PAGE) + 1;

            if (nodes < ImboApp.MAX_ITEMS_PER_PAGE || nodes >= this.totalImageCount) {
                return;
            }

            this.loadImages({page: page});
        }, 2500, {trailing: false}),

        showImageBatchMetadataDialog: function (e, batch) {
        },

        showImageMetadata: function (imageId) {
            this.metaEditor.loadDataForImage(imageId);
            this.metaEditor.show();
        },

        showImageInformation: function showImageInformation(imageId) {
            var imageContainer = $('li[data-image-identifier="' + imageId + '"]');
            var metaInfo = imageContainer.find('.meta-info');

            var openingMeta = !imageContainer.hasClass('meta-open');

            $('.meta-info').addClass('hidden', openingMeta);
            metaInfo.toggleClass('hidden', !openingMeta);

            $('.image-list li').removeClass('meta-open');
            imageContainer.toggleClass('meta-open', openingMeta);
        },

        getImageToolbarForImage: function (image, imageUrl, fileName) {
            var toolbar = (this.imageToolbar
                .replace(/\#download\-link/, imageUrl)
                .replace(/\#file\-name/g, fileName)
            );

            var className = [];

            if (_.get(image, 'metadata.scanpix.restrictions')) {
                className.push('restrictions');
                toolbar = toolbar.replace(/\#restriction-text/, image.metadata.scanpix.restrictions);
            }

            if (_.get(image, 'metadata.description')) {
                className.push('caption');
                toolbar = toolbar.replace(/\#caption-text/, image.metadata.description);
            }

            if (_.get(image, 'metadata.date')) {
                className.push('date');
                toolbar = toolbar.replace(/\#date/, image.metadata.date);
            }

            if (_.get(image, 'metadata.byline')) {
                className.push('photographer');
                toolbar = toolbar.replace(/\#photographer/, image.metadata.byline);
            }

            if (_.get(image, 'metadata.credit')) {
                if (image.metadata.credit.toLowerCase() === 'vg') {
                    className.push('credit-vg');
                } else {
                    className.push('credit');
                }

                toolbar = toolbar.replace(/\#credit/, image.metadata.credit);
            } else {
                className.push('credit-none');
                toolbar = toolbar.replace(/\#credit/, 'No credit set');
            }

            if (_.get(image, 'metadata.scanpix.imageId')) {
                className.push('scanpix-id');
                toolbar = toolbar.replace(/\#scanpix-id/, image.metadata.scanpix.imageId);
            }

            toolbar = toolbar.replace(/\#meta-class-name/, className.join(' '));

            return toolbar;
        },

        buildImageListItem: function (html, image) {
            // Get file name
            var fileName = image.metadata['filename'] || [image.imageIdentifier, image.extension].join('.');

            // Build query string
            var queryString = [
                'name=' + fileName,
                'mimetype=' + image.mime
            ].join('&');

            // Get ImageUrl
            var url = this.imbo.user(image.user).getImageUrl(image.imageIdentifier);

            // Set queryString on ImageUrl
            url = url.setQueryString(queryString);

            var full = url.toString(),
                thumb = url.maxSize({width: 158, height: 158}).jpg().toString(),
                name = image.metadata['filename'] || image.imageIdentifier,
                el = '';

            var containerClass = (
                this.helpers.imageHasRestrictions(image) ?
                'restricted' :
                ''
            );

            el += '<li class="' + containerClass + '" data-image-user="' + image.user + '" data-image-identifier="' + image.imageIdentifier + '" data-width="' + image.width + '" data-height="' + image.height + '">';
            el += '<a href="' + full + '" class="full-image" data-filename="' + name + '" target="_blank">';
            el += ' <img src="' + thumb + '" alt="">';
            el += '</a>';
            el += this.getImageToolbarForImage(image, full, name);
            el += '</li>';

            html += el;
            return html;
        },

        onEditorImageSelected: function (e, options) {
            this.previewImage(options);
        },

        onEditorImageDeselected: function (e) {
            this.unpreviewImage();
        },

        onImageSearch: function (e) {
            e.preventDefault();

            // Empty the current list of items
            this.getImageList().empty();

            // Get query from input field
            var q = e.target.query.value;

            // If the query field is empty, show all images
            if (!q.length) {
                this.imageQuery = null;
                this.searchQuery = null;
                return this.loadImages();
            }

            // Set up queries for the default fields
            var query = {'$or': []}, sub;
            ['description', 'location.country', 'location.city'].reduce(function(orClause, field) {
                sub = {};
                sub[field] = q;
                orClause.push(sub);
                return orClause;
            }, query.$or);

            // Run the query
            this.queryImages(query);
        },

        hideGui: function () {
            this.content.addClass('hidden');
        },

        showGui: function () {
            this.content.removeClass('hidden');
        },

        on: function (e, handler) {
            this.events.on(e, handler);
            return this;
        },

        off: function (e, handler) {
            this.events.off(e, handler);
            return this;
        },

        trigger: function (e, handler) {
            this.events.trigger(e, handler);
            return this;
        },

        selectedPackageAsset: null,

        exportEmbeddedAsset: function (markup, options, callback) {
            var data = {
                // internal id not yet available at this point. Will be added by the PluginAPI
                embeddedTypeId: options.embeddedTypeId,
                externalId: options.externalId,
                assetType: 'picture',
                assetClass: options.assetClass,
                assetSource: PluginAPI.appName,
                resourceUri: options.resourceUri,
                previewUri: options.previewUri,
                renditions: options.renditions,
                options: options.imboOptions
            };
            PluginAPI.Editor.insertEmbeddedAsset(markup, data, callback);
        },

        exportAssetImage: function (options, callback) {
            var data = {
                internalId: this.selectedPackageAsset.dpArticleId,
                externalId: options.imageIdentifier,
                assetElementId: this.selectedPackageAsset.assetElementId,
                assetType: 'picture',
                assetSource: PluginAPI.appName,
                resourceUri: options.resourceUri,
                previewUri: options.previewUri,
                renditions: options.renditions,
                options: options.imboOptions
            };
            PluginAPI.Editor.updateAssetData(data, callback);
        },

        enableImageInsertion: function () {
            this.insertionEnabled = true;
            this.content.find('.image-list').addClass('insertion-enabled');
            this.imageEditor.enableImageInsertion();
        },

        disableImageInsertion: function () {
            this.insertionEnabled = false;
            this.content.find('.image-list').removeClass('insertion-enabled');
            this.imageEditor.disableImageInsertion();
        }

    });

    function getDocumentHeight() {
        var d = document,
            b = d.body,
            el = d.documentElement;

        return Math.max(
            b.scrollHeight, el.scrollHeight,
            b.offsetHeight, el.offsetHeight,
            b.clientHeight, el.clientHeight
        );
    }

    return ImboApp;
});
