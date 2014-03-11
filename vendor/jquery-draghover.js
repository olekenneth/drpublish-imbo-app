define(['jquery'], function($) {
    $.fn.draghover = function(options) {
        return this.each(function() {

            var collection = $(),
                self = $(this);

            self.on('dragenter', function(e) {
                if (collection.length === 0) {
                    self.trigger('draghoverstart');
                }
                collection = collection.add(e.target);
            });

            self.on('dragleave drop', function(e) {
                collection = collection.not(e.target);
                if (collection.length === 0) {
                    self.trigger('draghoverend');
                }
            });
        });
    };

    return $;
});