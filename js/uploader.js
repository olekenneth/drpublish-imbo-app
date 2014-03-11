define(['underscore', 'jquery', 'async', 'draghover'], function(_, $, async) {

    var Uploader = function(imboClient) {
        this.imbo = imboClient;

        this.initialize();
    };

    _.extend(Uploader.prototype, {
        initialize: function() {
            _.bindAll(this);

            // Find GUI elements
            this.content   = $('.add-new-images');
            this.fileInput = this.content.find('.file-upload').get(0);
            this.progress  = this.content.find('.progress');

            // Bind DOM events
            this.bindEvents();

            // Initialize a simple event-emitter based on jQuery
            this.events = $({});

            // Set up an uploader queue
            this.queue = async.queue(this.uploadImage, 1);
            this.queue.drain = this.onImagesUploaded;
            this.completedImages = [];
        },

        setUserInfo: function(userInfo) {
            this.user = userInfo;
            this.userMeta = {
                'drp:uploader': {
                    'fullname': userInfo.fullname,
                    'username': userInfo.username
                }
            };
        },

        bindEvents: function() {
            $(this.fileInput).on('change', this.onImagesSelected);
            
            $(window).draghover().on({
                'draghoverstart': this.onDragOver,
                'draghoverend':   this.onDragEnd,
            });
            
            $(window)
                .on('drop', this.onDragDrop)
                .on('dragover', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
        },

        addProgressBar: function(file, batchSize) {
            var bar = $('<div class="bar" />')
                .css('width', 0)
                .text(file.name || '');

            $('<div class="file" />')
                .css('width', ((file.size / batchSize) * 100) + '%')
                .append(bar)
                .appendTo(this.progress);

            return bar;
        },

        onDragOver: function(e) {
            $(document.body).addClass('droppable');
        },

        onDragEnd: function(e) {
            $(document.body).removeClass('droppable');
        },

        onDragDrop: function(e) {
            e.stopPropagation();
            e.preventDefault();

            this.onDragEnd();

            this.onImagesSelected(e, e.originalEvent.dataTransfer.files);
        },

        onImagesSelected: function(e, files) {
            files = files || this.fileInput.files;
            if (!files.length) {
                return;
            }

            // Disable the input while uploading
            this.fileInput.disabled = true;

            // Find total size of files
            var totalSize = _.reduce(files, function(sum, file) {
                sum += file.size;
                return sum;
            }, 0);

            // Reset progress bar
            this.progress.empty().removeClass('hidden');

            // Reset completed images batch reference
            this.completedImages = [];

            // Loop and create tasks
            var tasks = [];
            for (var i = 0; i < files.length; i++) {
                tasks.push({
                    'progressBar': this.addProgressBar(files[i], totalSize),
                    'file': files[i]
                });
            }

            this.queue.push(tasks);
        },

        uploadImage: function(task, callback) {
            var imbo = this.imbo;
            imbo.addImage(task.file, {
                onComplete: _.partialRight(
                    this.onFileUploaded,
                    task.file.name,
                    callback
                ),

                onProgress: function(e) {
                    if (!e.lengthComputable) { return; }
                    task.progressBar.css('width', ((e.loaded / e.total) * 100) + '%');
                }
            });
        },

        onFileUploaded: function(err, imageIdentifier, res, filename, callback) {
            if (err) { return callback(err); }

            // Edit metadata for image
            var metadata = _.merge({}, this.userMeta, {
                'drp:filename': filename || imageIdentifier,
            });

            // Add additional metadata to the image
            this.imbo.editMetadata(imageIdentifier, metadata, function(err, body) {
                if (err) {
                    return callback('Failed to set metadata (' + err + ')');
                }

                var image = {
                    'imageIdentifier': imageIdentifier,
                    'metadata': body
                };

                this.completedImages.push(image);
                this.trigger('image-uploaded', image);
                callback();
            }.bind(this));
        },

        onImagesUploaded: function() {
            this.trigger('image-batch-completed', [this.completedImages]);

            // Re-enable the file input
            this.fileInput.disabled = false;
            this.progress.addClass('hidden');
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

    return Uploader;

});