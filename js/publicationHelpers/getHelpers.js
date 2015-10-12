define(['./vg'], function (vg) {
    'use strict';

    return function getHelpers(publicationId) {
        if (publicationId == 9) {
            return vg;
        }

        return {};
    };
});
