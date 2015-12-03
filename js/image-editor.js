define([
    'underscore',
    'jquery',
    'template',
    'drp-plugin-api',
    'jcrop'
], function (_, $, template, PluginAPI) {

    var ImageEditor = function (imboApp) {
        this.initialize(imboApp);
    };

    _.extend(ImageEditor.prototype, {
        MAX_IMAGE_WIDTH: 1500,
        MAX_IMAGE_HEIGHT: 1125,
        CROP_FORMATS: {
            '4:3': 4 / 3,
            '3:2': 3 / 2,
            '16:9': 16 / 9,
            '1.85:1': 1.85,
            '2.39:1': 2.39,
            '3:4': 3 / 4,
            '2:3': 2 / 3
        },
        SHARPEN_LEVELS: {
            0: '',
            1: 'light',
            2: 'moderate',
            3: 'strong',
            4: 'extreme'
        },

        initialize: function (imboApp) {
            this.imboApp = imboApp;

            _.bindAll(this);

            this.imageClassName = 'dp-picture';
            this.editorPane = $('.image-editor');
            this.controls = this.editorPane.find('.controls, .rotates');
            this.cropRatios = this.editorPane.find('.crop-presets');
            this.poiHandle = this.editorPane.find('.image-poi');
            this.imageUser = '';
            this.imageView = this.editorPane.find('.image-container');
            this.imagePreview = $('#image-preview');
            this.imagePreviewReference = $('#reference-image');
            this.settingsTabButtons = $('.settings-header > button');
            this.imageSize = {width: 0, height: 0};
            this.poi = {x: 0, y: 0};
            this.embeddedTypeId = null;
            this.events = $({});
            this.initEmbeddedTypeId();
            this.initTransformations();
            this.initRatioPickers();
            this.bindEvents();
        },

        imboApp: null,

        settingsTabButtons: null,

        initEmbeddedTypeId: function () {
            PluginAPI.getEmbeddedObjectTypes(function (types) {
                types.forEach(function (type) {
                    if (type.cssClass === this.imageClassName) {
                        this.embeddedTypeId = type.typeId;
                    }
                }.bind(this));
            }.bind(this));
        },

        initTransformations: function () {
            this.transformationDefaults = {
                modulate: {
                    brightness: 100,
                    saturation: 100,
                    hue: 100
                },
                contrast: {},
                rotate: {
                    angle: 0,
                    bg: "000000"
                },
                sharpen: {}
            };

            this.transformations = _.cloneDeep(this.transformationDefaults);
        },

        bindEvents: function () {
            this.editorPane
                .find('.cancel')
                .on('click', this.hide);

            this.editorPane
                .find('.reset')
                .on('click', this.reset);

            this.editorPane
                .find('.insert, .update')
                .on('click', this.insertToArticle);

            this.controls
                .find('input[type=range]')
                .on('change', _.debounce(this.onAdjustSlider, 300));

            this.controls
                .find('.rotate')
                .on('click', this.rotateImage);

            this.cropRatios
                .on('click', '.ratio', this.onLockRatio);

            this.settingsTabButtons
                .on('click', this.switchSettingsTab);

            this.poiHandle
                .on('mousedown', this.poiMoveStart);

            this.editorPane
                .on('click', '.sliders button', this.sliderButtonClick);

            this.imagePreviewReference.on('load', this.onImageLoaded);
            this.on('editor-image-selected', _.partial(this.setEditMode, true));
            this.on('editor-image-deselected', _.partial(this.setEditMode, false));

            PluginAPI.addListeners({
                embeddedAssetFocus: function (data) {
                    this.onEditorSelectImage(data.id, data.options);
                }.bind(this),
                embeddedAssetBlur: this.onEditorDeselectImage
            });
        },

        getPreviewContainerSize: function getPreviewContainerSize() {
            return [
                $(window).width() - $('.settings-pane').width(),
                $(window).height()
            ];
        },

        initRatioPickers: function () {
            var format, value;
            for (format in this.CROP_FORMATS) {
                value = this.CROP_FORMATS[format];
                $('<button class="ratio">').attr({
                    'data-ratio': value
                }).text(format).prependTo(this.cropRatios);
            }
        },

        setTranslator: function (translator) {
            this.translator = translator;
        },

        setImboClient: function (imboClient) {
            this.imbo = imboClient;
        },

        setCropper: function (cropParams) {
            var img = this.imagePreview.get(0);
            var currentAngle = parseInt(this.transformations.rotate.angle, 10);
            var rotated = (currentAngle === 90 || currentAngle === 270);

            this.imageSize.width = img.naturalWidth;
            this.imageSize.height = img.naturalHeight;

            var previewContainerSize = this.getPreviewContainerSize();

            var options = {
                onChange: this.onCropChange,
                boxWidth: previewContainerSize[0],
                boxHeight: previewContainerSize[1]
            };

            if (this.originalImageSize) {
                options.trueSize = [
                    this.originalImageSize.width,
                    this.originalImageSize.height
                ];

                if (rotated) {
                    options.trueSize = options.trueSize.reverse();
                }
            }

            if (cropParams) {
                options.setSelect = [
                    cropParams.x,
                    cropParams.y,
                    cropParams.x2,
                    cropParams.y2
                ];
            }

            if (this.cropper) {
                // Set the box width and height. Important because it's used
                // when loading the image into the cropper
                this.cropper.setOptions({
                    boxWidth: options.boxWidth,
                    boxHeight: options.boxHeight
                });

                // Set the new image
                this.cropper.setImage(this.imagePreview.attr('src'));

                // Set other options after a short delay. Not sure why it has been
                // done like this, but probably to avoid redraws caused by updated
                // options on the old picture
                window.setTimeout(function (imageEditor) {
                    imageEditor.cropper.setOptions(options);
                }, 100, this);
            } else {
                this.cropper = $.Jcrop(this.imagePreview, options);
            }
        },

        /**
         * Persist the updated POI in image metadata
         */
        saveMetadataPoi: function() {
            var poiData = this.imageMetadata.poi || [];
            poiData[0] = this.poi;

            this.imbo.editMetadata(this.imageIdentifier, {
                poi: poiData
            }, function(err, res, body) {
                if (!err) {
                    console.log(err);
                }
            });
        },

        hidePoi: function() {
            this.poiHandle.addClass('hide');
        },

        showPoi: function() {
            this.poiHandle.removeClass('hide');
        },

        resetPoi: function() {
            this.setPoi({
                cx: this.originalImageSize.width / 2,
                cy: this.originalImageSize.height / 2
            });
        },

        setPoi: function(poi) {
            if (!poi) {
                return;
            }

            this.poi = poi;

            var resizeFactor = this.originalImageSize.width / this.imagePreview.width();

            var handleWidth = this.poiHandle.width();
            var handleHeight = this.poiHandle.height();

            var top = (poi.cy / resizeFactor) - (handleWidth / 2);
            var left = (poi.cx / resizeFactor) - (handleHeight / 2);

            this.poiHandle.css({
                top: top + 'px',
                left: left + 'px'
            });
        },

        poiMoveStart: function(e) {
            e.preventDefault();
            e.stopPropagation();

            this.editorPane.addClass('no-select');

            this.imageView.on('mousemove', this.poiMove);
            this.imageView.on('mouseup', this.poiMoveEnd);
        },

        poiMoveEnd: function() {
            this.editorPane.removeClass('no-select');
            this.imageView.off('mousemove mouseup');

            // Trigger save of metadata
            this.saveMetadataPoi();

            this.poiOnTheMove = false;
        },

        poiMove: function(e) {
            e.preventDefault();

            var parentOffset = this.imagePreview.offset();
            var parentTop = parentOffset.top;
            var parentLeft = parentOffset.left;

            var resizeFactor = this.originalImageSize.width / this.imagePreview.width();

            var actualPoiHandlerWidth = this.poiHandle.width() * resizeFactor;
            var actualPoiHandlerHeight = this.poiHandle.height() * resizeFactor;

            var minX = 0 + actualPoiHandlerWidth / 2;
            var minY = 0 + actualPoiHandlerWidth / 2;
            var maxX = this.originalImageSize.width - actualPoiHandlerWidth / 2;
            var maxY = this.originalImageSize.height - actualPoiHandlerHeight / 2;

            var scrollX = e.view.scrollX;
            var scrollY = e.view.scrollY;

            var posX = Math.floor((e.clientX + scrollX - parentLeft) * resizeFactor);
            var posY = Math.floor((e.clientY + scrollY - parentTop) * resizeFactor);

            // POI has been dragged outside the image. End move operation
            if (minX > posX || maxX < posX || minY > posY || maxY < posY) {
                return this.poiMoveEnd();
            }

            this.setPoi({
                cx: Math.max(minX, Math.min(maxX, posX)),
                cy: Math.max(minY, Math.min(maxY, posY))
            });
        },

        setUser: function(user) {
            this.imageUser = user;

            return this;
        },

        getUser: function() {
            return this.imageUser;
        },

        show: function () {
            // Maximize app window (if in app context)
            PluginAPI.Article.maximizeAppWindow(
                this.translator.translate('IMAGE_EDITOR_TITLE'),
                this.hide
            );

            // Show the editor pane and trigger a show-event
            this.editorPane.removeClass('hidden');
            this.trigger('show');
            $('body').addClass('editor-view');

            // Hide POI handle until we have a correct placement
            this.hidePoi();

            return this;
        },

        setImagePreviewSrc: function (src) {
            this.imagePreview.attr('src', src);
        },

        hide: function () {
            $('body').removeClass('editor-view');
            this.imageIdentifier = null;
            this.reset();
            this.editorPane.addClass('hidden');
            this.trigger('hide');
            PluginAPI.Article.restoreAppWindow();
            PluginAPI.hideLoader();
        },

        resetState: function () {
            this.setImagePreviewSrc('img/clearpix.png');
        },

        loadImage: function (imageId, options) {
            this.resetState();
            PluginAPI.showLoader('Loading image');

            // Ensure app knows which image to change metadata on
            this.imageIdentifier = imageId;

            // Set original image size
            this.originalImageSize = {
                width: options.width,
                height: options.height
            };

            // Start loading image
            this.url = this.imbo.user(options.user).getImageUrl(imageId).maxSize({
                width: this.MAX_IMAGE_WIDTH,
                height: this.MAX_IMAGE_HEIGHT
            }).jpg();

            // Set up crop params, if we have any
            this.cropParams = options.crop && options.crop.x2 ? options.crop : null;
            this.cropAspectRatio = options.cropAspectRatio || null;

            if (this.cropParams) {
                this.cropParams.forceApply = true;
            }

            // Set a fixed crop aspect ratio, if any was selected
            if (options.cropAspectRatio) {
                $('[data-ratio="' + options.cropAspectRatio + '"]').trigger('click');
            } else {
                $('button.ratio').removeClass('active');
            }

            // Apply transformations to image and GUI
            if (options.transformations) {
                this.applyTransformations(options.transformations);
            }

            // Load metadata for image
            this.imageMetadata = {loadingMetadata: true};
            this.imbo.getMetadata(imageId, function (err, data) {
                this.imageMetadata = data;
            }.bind(this));

            this.updateImageView();
            this.imboApp.metaEditor.loadDataForImage(this.imageIdentifier);
        },

        applyTransformations: function (transformations) {
            var transformation, i;
            for (i = 0; i < transformations.length; i++) {
                transformation = this.parseTransformation(transformations[i]);

                // For now, we're applying crop at a different stage
                // Change this if multiple crops is supposed to work
                if (transformation.name === 'crop') {
                    continue;
                }

                this.applyTransformation(transformation);
            }
        },

        applyTransformation: function (t) {
            // We need to translate some param names for modulate
            if (t.name === 'modulate') {
                this.transformations.modulate = {
                    brightness: t.params.b,
                    saturation: t.params.s,
                    hue: t.params.h
                };

                for (var key in this.transformations.modulate) {
                    $('#slider-' + key).val(this.transformations.modulate[key]);
                }

                return;
            }

            this.transformations[t.name] = _.merge(
                this.transformations[t.name],
                t.params
            );
        },

        parseTransformation: function (t) {
            var parts = t.split(':'),
                name = parts.shift(),
                params = parts.join(':').split(','),
                args = {};

            for (var i = 0; i < params.length; i++) {
                parts = params[i].split('=');
                args[parts.shift()] = parts.join('=');
            }

            return {name: name, params: args};
        },

        buildImageUrl: function (preview, preventCropping) {
            var crop = preventCropping ? null : this.cropParams;

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
            }

            // @todo Find a better way to handle unintentional crops
            if (crop && crop.w > 25 && crop.h > 25) {
                this.url.crop({
                    x: crop.x,
                    y: crop.y,
                    width: crop.w,
                    height: crop.h
                });
            }

            return this.url;
        },

        updateImageView: function () {
            $('#editor-image-loading').show();

            // Build new image URL based on transformation states
            this.buildImageUrl(true, true);
            var imageUrl = this.url.toString();
            this.setImagePreviewSrc(imageUrl);

            // Show a loading indicator while loading image
            if (!this.imagePreview.get(0).complete) {
                PluginAPI.showLoader(
                    this.translator.translate('IMAGE_EDITOR_LOADING_IMAGE')
                );
            }

            $('#reference-image').attr('src', imageUrl);
        },

        onAdjustSlider: function (e) {
            var el = $(e.target),
                name = el.attr('name'),
                value = e.target.valueAsNumber || e.target.value;

            if (_.contains(['brightness', 'saturation', 'hue'], name)) {
                this.transformations.modulate[name] = value;
            }

            if (name === 'sharpen') {
                if (value === 0) {
                    delete this.transformations.sharpen.preset;
                } else {
                    this.transformations.sharpen.preset = this.SHARPEN_LEVELS[value];
                }
            }

            if (name === 'contrast') {
                if (value == 0) {
                    delete this.transformations.contrast;
                } else {
                    this.transformations.contrast = {
                        sharpen: (value < 0 ? value + 1 : value)
                    };
                }
            }

            this.updateImageView();
        },

        onImageLoaded: function () {
            this.setCropper(this.cropParams);

            var waitForIt = setInterval(_.bind(function() {
                if (this.imageMetadata.loadingMetadata) {
                    return;
                }

                clearInterval(waitForIt);

                var poi = _.get(this.imageMetadata, 'poi[0]');

                if (poi) {
                    this.setPoi(poi);
                } else {
                    this.resetPoi();
                }

                if (this.transformations.rotate.angle === 0) {
                    this.showPoi();
                } else {
                    this.hidePoi();
                }
            }, this), 25);

            PluginAPI.hideLoader();
        },

        onLockRatio: function (e) {
            var el = $(e.currentTarget);
            el.addClass('active').siblings().removeClass('active');

            // If there is no active crop, add a preview crop
            if (!this.cropParams) {
                this.setCropper([0, 0, 300, 300]);
            }

            // Now set the ratio to the given aspect ratio
            if (this.cropper) {
                this.cropper.setOptions({aspectRatio: el.data('ratio')});
            }

            // Make sure the app knows about the selected ratio
            this.cropAspectRatio = el.data('ratio');
        },

        onCropChange: function (coords) {
            this.cropParams = coords;
        },

        sliderButtonClick: function(e) {
            var button = $(e.currentTarget);
            var input = button.siblings('input[type="range"]:first');
            var step = parseFloat(input.attr('step'));

            if (button.hasClass('minus')) {
                input.val(parseFloat(input.val()) - step);
            } else {
                input.val(parseFloat(input.val()) + step);
            }

            input.trigger('change');
        },

        rotateImage: function (e) {
            var amount = parseInt($(e.currentTarget).data('amount'), 10),
                current = parseInt(this.transformations.rotate.angle, 10),
                newAmount = (current + amount) % 360,
                trueSize = [
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

            // Reset crop area
            this.cropper.release();
            this.cropParams = null;

            // Set rotation angle and update preview
            this.transformations.rotate.angle = newAmount;

            this.updateImageView();
        },

        reset: function () {
            // Remove transformations
            this.transformations = _.cloneDeep(this.transformationDefaults);

            // Reset sliders
            this.editorPane.find('.sliders').get(0).reset();

            // We're not selecting anything anymore
            this.selectedElementId = null;
            this.selectedElementMarkup = null;

            // Reset cropper
            if (this.cropper) {
                this.cropper.release();
                this.cropParams = null;
            }
            // Update image view
            this.updateImageView();
        },

        insertToArticle: function () {
            if (!this.imboApp.insertionEnabled) {
                return;
            }

            if (this.imboApp.selectedPackageAsset !== null) {
                return this.insertAssetImage();
            } else {
                return this.insertEmbeddedImage();
            }
        },

        insertEmbeddedImage: function () {
            PluginAPI.showLoader('Importing image...')

            var defaultWidth;
            var defaultImageSize = _.find(this.imboApp.config.imageSizes, function(size) { return size.name === 'default' });
            if (defaultImageSize) {
                defaultWidth = defaultImageSize.width;
            } else {
                defaultWidth = this.imboApp.config.imageSizes[0];
            }

            var options = {
                embeddedTypeId: this.embeddedTypeId,
                externalId: this.imageIdentifier,
                assetClass: this.imageClassName,
                resourceUri: this.buildImageUrl().jpg().toString(),
                previewUri: this.buildImageUrl().maxSize({width: defaultWidth}).jpg().toString(),
                previewWidth: defaultWidth,
                renditions: this.buildRenditions(),
                imboOptions: {
                    imageIdentifier: this.imageIdentifier,
                    user: this.getUser(),
                    externalId: this.imageIdentifier,
                    title: this.imageMetadata['title'] || '',
                    description: this.imageMetadata['description'] || '',
                    author: this.imageMetadata['photographer'] || '',
                    source: this.imageMetadata['agency'] || '',
                    cropParams: this.cropParams,
                    cropRatio: this.cropAspectRatio,
                    transformations: this.buildImageUrl().getTransformations()
                }
            };

            // build custom markup
            var markup = template(options);
            var onDone = function (imboOptions) {
                PluginAPI.hideLoader();
                this.hide();
                PluginAPI.Editor.markAsActive(this.selectedElementId);
                this.onEditorSelectImage(this.selectedElementId, imboOptions);
            }.bind(this);
            this.imboApp.exportEmbeddedAsset(markup, options, function () {
                onDone(options.imboOptions)
            });
        },

        insertAssetImage: function () {
            var resourceUri = this.buildImageUrl().jpg().toString();
            var previewUri = this.buildImageUrl().maxSize({width: 800, height: 800}).jpg().toString();

            var options = {
                resourceUri: resourceUri,
                previewUri: previewUri,
                renditions: this.buildRenditions(),
                user: this.imageMetadata['user'],
                imboOptions: {
                    imageIdentifier: this.imageIdentifier,
                    user: this.getUser(),
                    title: this.imageMetadata['title'] || '',
                    description: this.imageMetadata['description'] || '',
                    author: this.imageMetadata['photographer'] || '',
                    source: this.imageMetadata['agency'] || '',
                    cropParams: this.cropParams,
                    cropRatio: this.cropAspectRatio,
                    transformations: this.buildImageUrl().getTransformations()
                }
            }

            this.imboApp.exportAssetImage(options, function () {
                PluginAPI.hideLoader()
            });
            this.hide();
        },

        buildRenditions: function () {
            var renditions = {
                highRes: {
                    uri: this.buildImageUrl().reset().jpg().toString()
                }
            };
            _.each(this.imboApp.config.imageSizes, _.bind(function(size) {
                var maxSizeOptions = {};
                if (size.width) {
                    maxSizeOptions.width = size.width;
                }
                if (size.height) {
                    maxSizeOptions.height = size.height;
                }

                var uri = this.buildImageUrl().maxSize(maxSizeOptions).jpg().toString();
                renditions[size.name] = { uri: uri };
            }, this));

            return renditions;
        },

        onEditorSelectImage: function (elementId, data) {
            this.selectedElementId = elementId;

            this.trigger('editor-image-selected', [{
                imageIdentifier: data.externalId,
                transformations: data.transformations,
                cropAspectRatio: data.cropAspectRatio,
                cropParams: data.cropParams,
                user: data.user
            }]);
        },

        onEditorDeselectImage: function () {
            this.trigger('editor-image-deselected');

            // We're not selecting anything anymore
            this.selectedElementId = null;
            this.selectedElementMarkup = null;
        },

        setEditMode: function (editing) {
            this.editorPane.find('button.insert').toggleClass('hidden', editing);
            this.editorPane.find('button.update').toggleClass('hidden', !editing);
        },

        on: function (e, handler) {
            this.events.on(e, handler);
            return this;
        },

        off: function (e, handler) {
            this.events.off(e, handler);
            return this;
        },

        trigger: function (e, data) {
            this.events.trigger(e, data);
            return this;
        },

        switchSettingsTab: function (e) {
            var button = $(e.target).closest('button');
            var ref = button.attr('data-ref');

            $('.settings-tab').addClass('hidden');
            $('.settings-tab.' + ref).removeClass('hidden');
            this.settingsTabButtons.removeClass('active');
            button.addClass('active');
        },

        enableImageInsertion: function () {
            this.editorPane.addClass('insertion-enabled');
            this.editorPane.find('.settings-header button[data-ref="image"]').trigger('click');
        },

        disableImageInsertion: function () {
            this.editorPane.removeClass('insertion-enabled');
            this.editorPane.find('.settings-header button[data-ref="meta"]').trigger('click');
            $('.settings-tab.image').addClass('hidden');
            $('.settings-tab.meta').removeClass('hidden');
        }
    });

    return ImageEditor;

});
