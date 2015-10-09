define(['underscore'], function(_) {
    'use strict';

    return {
        /**
         * @{inheritdoc}
         */
        imageHasRestrictions: function imageHasRestrictions(image) {
            var credit = _.get(image, 'metadata.credit');

            return (
                _.get(image, 'metadata.scanpix.restrictions') ||
                (credit && credit.toLowerCase() == 'vg')
            );
        }
    };
});
