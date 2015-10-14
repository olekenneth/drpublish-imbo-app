define([
    'underscore',
    'jquery',
    'exif',
    'drp-plugin-api'
], function (_, $, Exif, PluginApi) {
    'use strict';

    var MetaEditor = function (imboApp) {
        this.initialize(imboApp);
    };

    _.extend(MetaEditor.prototype, {
        MAX_IMAGE_WIDTH: 1464,
        MAX_IMAGE_HEIGHT: 1104,


        initialize: function (imboApp) {
            _.bindAll(this);
            this.editorPane = $('.meta-editor');
            this.tabCtrl = $('.tab-controller');
            this.exifPane = $('.exif-pane');
            this.inputPane = $('.input-pane');
            this.imageBox = this.editorPane.find('.image-container');
            this.imageView = this.imageBox.find('.source');
            this.events = $({});
            this.bindEvents();
            this.imboApp = imboApp;
        },

        bindEvents: function () {
            $(window)
                .on('resize', _.debounce(this.resizePanes, 150))
                .trigger('resize');

            this.editorPane
                .find('.close')
                .on('click', this.hide);

            this.editorPane
                .find('.save')
                .on('click', this.saveMetadata);

            this.tabCtrl
                .find('button')
                .on('click', this.switchTab);
        },

        setTranslator: function (translator) {
            this.translator = translator;
        },

        setImboClient: function (imboClient) {
            this.imbo = imboClient;
        },

        resizePanes: function () {
            this.imageBox.css('height', $(window).height() - 50);
        },

        switchTab: function (e) {
            var el = $(e.currentTarget),
                tab = el.data('tab'),
                tabEl = this.editorPane.find('.tab[data-tab="' + tab + '"]');

            tabEl.removeClass('hidden')
                .siblings('.tab')
                .addClass('hidden');

            el
                .closest('.tab-controller')
                .find('button[data-tab]')
                .removeClass('active');

            el.addClass('active');
        },

        imboApp: null,

        show: function () {
            // Maximize app window (if in app context)
            //PluginApi.Article.maximizeAppWindow(
            //    this.translator.translate('META_EDITOR_TITLE'),
            //    this.hide
            //);

            // Focus the first tab
            this.tabCtrl
                .find('button[data-tab]:first')
                .trigger('click');

            // Show the editor pane and trigger a show-event
            this.editorPane.removeClass('hidden');
            this.trigger('show');
        },

        hide: function () {
            this.imboApp.imageEditor.hide();
        },

        resetState: function () {
            this.inputPane.find('input, textarea').val('');
            this.imageView.css('background-image', '');
            this.tabCtrl.find('button[data-tab]').removeClass('hidden');
        },

        loadDataForImage: function (imageId) {
            // Reset state so we're not showing old data
            this.resetState();
            // Ensure app knows which image to change metadata on
            this.imageIdentifier = imageId;
            this.imbo.getMetadata(imageId, this.onImageDataLoaded);
        },

        setImageViewUrl: function (url) {
            this.imageView.css(
                'background-image',
                'url(' + url.toString() + ')'
            );
        },

        onImageDataLoaded: function (err, data) {
            if (!data) {
                return;
            }
            this.inputPane.find('input, textarea').each(function (i, el) {
                var name = el.getAttribute('name');
                if (data[name]) {
                    el.value = data[name];
                } else if (name === 'title' && data['filename']) {
                    el.value = data['filename'];
                } else if (name === 'photographer' && data['exif:Artist']) {
                    el.value = data['exif:Artist'];
                }
            });
            this.populateExifData(data);
        },

        populateExifData: function (data) {
            this.exifPane.empty();

            var dl = $('<dl />'), table, value, parts, tags = 0;
            for (var exifTag in Exif.TagMap) {
                if (!data[exifTag]) {
                    continue;
                }

                table = Exif.TagTable[exifTag];
                value = data[exifTag];

                // GPS location?
                if (exifTag === 'gps:location') {
                    value = ($('<a />')
                        .attr('target', '_blank')
                        .attr('href', 'http://maps.google.com/?q=' + value.reverse().join(','))
                        .text(value.reverse().map(function (i) {
                            return i.toFixed(5);
                        }).join(', ')));
                } else {
                    value = (value + '').replace(/^\s+|\s+$/g, '');
                }

                // Should we cast to integer?
                if (!isNaN(value)) {
                    value = parseInt(data[exifTag], 10);
                }

                // Do we have a lookup table with our value in it?
                if (table && table[value]) {
                    value = this.translator.translate(table[value]);
                }

                // Is the value dividable, to get a decimal variant?
                if (typeof value === 'string' && value.match(/^\d+\/\d+$/)) {
                    parts = value.split('/');
                    value = (parts[0] / parts[1]) + ' (' + value + ')';
                }

                // GPS altitude? Add suffix (unit)
                if (exifTag === 'gps:altitude') {
                    value += 'm';
                }

                $('<dt />')
                    .text(this.translator.translate(Exif.TagMap[exifTag]))
                    .appendTo(dl);

                $('<dd />')
                    .html(value)
                    .appendTo(dl);

                tags++;
            }

            if (tags > 0) {
                this.exifPane.append(dl);
            } else {
                this.tabCtrl
                    .find('[data-tab="exif"]')
                    .addClass('hidden');
            }
        },

        getMetadataFromInputs: function () {
            return _.reduce(
                this.inputPane.find('input, textarea'),
                function (data, el) {
                    data[el.getAttribute('name')] = el.value;
                    return data;
                }, {}
            );
        },

        saveMetadata: function () {
            if (!this.imageIdentifier) {
                return console.error('Tried to save metadata, no image active');
            }

            PluginApi.showLoader(
                this.translator.translate('META_EDITOR_SAVING_METADATA')
            );

            var callback = function () {
                PluginAPI.hideLoader();
            }

            this.imbo.editMetadata(
                this.imageIdentifier,
                this.getMetadataFromInputs(),
                callback
            );
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
        }
    });

    return MetaEditor;

});
