define([
    'underscore',
    'jquery',
    'drp-app-api',
    'drp-article-communicator',
    'drp-ah5-communicator',
    'jcrop'
], function(_, $, appApi, articleCommunicator, drpEditor) {

    var ImageEditor = function() {
        this.initialize();
    };

    _.extend(ImageEditor.prototype, {
        MAX_IMAGE_WIDTH:  924,
        MAX_IMAGE_HEIGHT: 693,
        CROP_FORMATS: {
            '4:3': 4 / 3,
            '3:2': 3 / 2,
            '16:9': 16 / 9,
            '1.85:1': 1.85,
            '2.39:1': 2.39,
            '3:4': 3 / 4,
            '2:3': 2 / 3
        },

        initialize: function() {
            _.bindAll(this);

            this.editorPane   = $('.image-editor');
            this.controls     = this.editorPane.find('.controls');
            this.cropRatios   = this.editorPane.find('.crop-presets');
            this.imageView    = this.editorPane.find('.image-container');
            this.imagePreview = $('#image-preview');
            this.imageSize    = { width: 0, height: 0 };

            this.events = $({});
            this.initTransformations();
            this.initRatioPickers();
            this.bindEvents();
        },

        initTransformations: function() {
            this.transformationDefaults = {
                modulate: {
                    brightness: 100,
                    saturation: 100,
                    hue: 100
                },
                contrast: {
                    sharpen: 0
                },
                rotate: {
                    angle: 0
                }
            }

            this.transformations = _.cloneDeep(this.transformationDefaults);
        },

        bindEvents: function() {
            this.editorPane
                .find('.cancel')
                .on('click', this.hide);

            this.editorPane
                .find('.reset')
                .on('click', this.reset);

            this.editorPane
                .find('.insert')
                .on('click', this.insertToArticle);

            this.controls
                .find('input[type=range]')
                .on('change', _.debounce(this.onAdjustSlider, 300));

            this.controls
                .find('.rotate')
                .on('click', this.rotateImage);

            this.cropRatios
                .on('click', '.ratio', this.onLockRatio);

            this.imagePreview
                .on('load', this.onImageLoaded);
        },

        initRatioPickers: function() {
            var size = 40, format, value;
            for (format in this.CROP_FORMATS) {
                value = this.CROP_FORMATS[format];
                $('<button class="ratio">').attr({
                    'data-ratio': value,
                }).text(format).css({
                    width: size * value,
                    height: size
                }).prependTo(this.cropRatios);
            }

            this.cropRatios.find('.unlock').css('height', size);
        },

        setTranslator: function(translator) {
            this.translator = translator;
        },

        setImboClient: function(imboClient) {
            this.imbo = imboClient;
        },

        buildCropper: function() {
            if (this.cropper) { return; }

            this.cropper = $.Jcrop(this.imagePreview, _.extend({
                onChange: this.onCropChange
            }, this.originalImageSize ? {
                trueSize: [
                    this.originalImageSize.width,
                    this.originalImageSize.height
                ]
            } : {}));
        },

        show: function() {
            // Maximize app window (if in app context)
            articleCommunicator.maximizeAppWindow(
                this.translator.translate('IMAGE_EDITOR_TITLE'),
                this.hide
            );

            // Show the editor pane and trigger a show-event
            this.editorPane.removeClass('hidden');
            this.trigger('show');

            return this;
        },

        hide: function() {
            this.imageIdentifier = null;
            this.reset();

            this.editorPane.addClass('hidden');
            this.trigger('hide');

            articleCommunicator.restoreAppWindow();

            appApi.hideLoader();
        },

        resetState: function() {
            this.imagePreview.attr('src', 'img/blank.gif');
        },

        loadImage: function(imageId, size) {
            this.resetState();

            // Ensure app knows which image to change metadata on
            this.imageIdentifier = imageId;

            // Set original image size
            this.originalImageSize = size;

            // Set original size to cropper
            if (this.cropper) {
                this.cropper.setOptions({
                    trueSize: [size.width, size.height]
                });
            }

            // Start loading image
            this.url = this.imbo.getImageUrl(imageId).maxSize({
                width: this.MAX_IMAGE_WIDTH,
                height: this.MAX_IMAGE_HEIGHT
            }).jpg();

            this.updateImageView();
        },

        buildImageUrl: function(preview) {
            // Reset URL
            this.url.reset().jpg();

            if (preview) {
                this.url.maxSize({
                    width: this.MAX_IMAGE_WIDTH,
                    height: this.MAX_IMAGE_HEIGHT
                });
            }

            // Find transformations with values that differ from the defaults
            var transformation, option, currentValue, defaultValue, diff = {};
            for (transformation in this.transformations) {
                for (option in this.transformations[transformation]) {
                    currentValue = this.transformations[transformation][option];
                    defaultValue = this.transformationDefaults[transformation][option];

                    if (currentValue !== defaultValue) {
                        diff[transformation] = diff[transformation] || {};
                        diff[transformation][option] = currentValue;
                    }
                }
            }

            // Apply transformations
            for (transformation in diff) {
                this.url[transformation](diff[transformation]);
                console.log('=== Applying transformation: ' + transformation, diff[transformation]);
            }

            return this.url;
        },

        updateImageView: function() {
            // Build new image URL based on transformation states
            this.buildImageUrl(true);

            // Show a loading indicator while loading image
            appApi.showLoader(
                this.translator.translate('IMAGE_EDITOR_LOADING_IMAGE')
            );

            var imageUrl = this.url.toString();
            this.imagePreview.attr('src', imageUrl);

            if (this.cropper) {
                this.cropper.setImage(imageUrl);
            }
        },

        onAdjustSlider: function(e) {
            var el    = $(e.target),
                name  = el.attr('name'),
                value = e.target.valueAsNumber || e.target.value;

            if (_.contains(['brightness', 'saturation', 'hue'], name)) {
                this.transformations.modulate[name] = value;
            }

            this.updateImageView();
        },

        onImageLoaded: function() {
            // Initialize cropper
            this.buildCropper();

            // Hide loading indication
            appApi.hideLoader();

            // Get new image dimensions
            var img = this.imagePreview.get(0),
                w   = img.naturalWidth,
                h   = img.naturalHeight,
                c   = this.cropParams;

            var rotated = (this.imageSize.width !== w);
            if (this.cropParams && !rotated) {
                this.cropper.setSelect([
                    this.cropParams.x,
                    this.cropParams.y,
                    this.cropParams.x2,
                    this.cropParams.y2
                ]);
            }

            this.imageSize.width  = w;
            this.imageSize.height = h;
        },

        onLockRatio: function(e) {
            var el = $(e.currentTarget);

            el.addClass('active').siblings().removeClass('active');

            // If there is no active crop, add a preview crop
            if (!this.cropParams) {
                this.cropper.setSelect([0, 0, 300, 300]);
            }

            // Now set the ratio to the given aspect ratio
            this.cropper.setOptions({ aspectRatio: el.data('ratio') });
        },

        onCropChange: function(coords) {
            this.cropParams = coords;
        },

        rotateImage: function(e) {
            var amount    = parseInt($(e.currentTarget).data('amount'), 10),
                current   = this.transformations.rotate.angle,
                newAmount = (current + amount) % 360,
                trueSize  = [
                    this.originalImageSize.width,
                    this.originalImageSize.height
                ];

            if (newAmount < 0) {
                newAmount = 360 + newAmount;
            }

            if (newAmount === 90 || newAmount === 270) {
                trueSize = trueSize.reverse();
            }

            this.cropper.setOptions({
                'trueSize': trueSize
            });

            this.transformations.rotate.angle = newAmount;

            this.updateImageView();
        },

        reset: function() {
            // Remove transformations
            this.transformations = _.cloneDeep(this.transformationDefaults);

            // Reset sliders
            this.editorPane.find('.sliders').get(0).reset();

            // Update image view
            this.updateImageView();
        },

        insertToArticle: function() {
            var url  = this.buildImageUrl(false),
                crop = this.cropParams,
                img  = $('<img />');

            // @todo Find a better way to handle unintentional crops
            if (crop && crop.w > 25 && crop.h > 25) {
                url.crop({ x: crop.x, y: crop.y, width: crop.w, height: crop.h });
            }

            img.attr('src', url.maxSize({ width: 500 }).jpg().toString());

            drpEditor.insertElement($('<div />').append(img));

            this.hide();
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

    return ImageEditor;

});