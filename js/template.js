define(['underscore'], function(_) {
    'use strict';

    /**
     * Data keys:
     *     "url"         - image URL
     *     "width"       - image width, in pixels
     *     "height"      - image height, in pixels
     *     "title"       - image title
     *     "description" - image description
     *     "author"      - image author name
     *     "source"      - image source/agency
     */

    var defaultTemplate = _.template([
        '<div class="dp-article-image-container">',
        '   <img src="<%= url %>" width="<%= width %>" alt="<%- title %>" data-transformations="<%- transformations %>" data-image-identifier="<%- imageIdentifier %>" data-crop-parameters="<%- cropParams %>" data-crop-aspect-ratio="<%- cropRatio %>">',
        '   <div class="dp-article-image-title" data-dp-editable-type="textfield" data-dp-editable-name="Title"><%- title %></div>',
        '   <div class="dp-article-image-description" data-dp-editable-type="html" data-dp-editable-name="Description"><%- description %></div>',
        '   <div class="dp-article-image-byline">',
        '       <span class="dp-article-image-author" data-dp-editable-type="textfield" data-dp-editable-name="Author"><%- author %></span>',
        '       <span class="dp-article-image-source" data-dp-editable-type="textfield" data-dp-editable-name="Source"><%- source %></span>',
        '    </div>',
        '</div>'
    ].join('\n'));

    return function(data, template) {
        return (template ?
            _.template(template, data) :
            defaultTemplate(data)
        );
    };
});