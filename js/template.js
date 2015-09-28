define(['underscore'], function (_) {
    'use strict';

    var defaultTemplate = _.template([
        '<div class="dp-article-image-container" >',
        '   <img src="<%= previewUri %>" width="<%= previewWidth %>" alt="<%- imboOptions.title %>" >',
        '   <div class="dp-article-image-title" data-dp-editable-type="textfield" data-dp-editable-name="Title"><%- imboOptions.title %></div>',
        '   <div class="dp-article-image-description" data-dp-editable-type="html" data-dp-editable-name="Description"><%- imboOptions.description %></div>',
        '   <div class="dp-article-image-byline">',
        '     <span class="dp-article-image-author" data-dp-editable-type="textfield" data-dp-editable-name="Author"><%- imboOptions.author %></span>',
        '     <span class="dp-article-image-source" data-dp-editable-type="textfield" data-dp-editable-name="Source"><%- imboOptions.source %></span>',
        '    </div>',
        '</div>',
    ].join('\n'));

    return function (data, template) {
        return (template ?
            _.template(template, data) :
            defaultTemplate(data)
        );
    };
});
