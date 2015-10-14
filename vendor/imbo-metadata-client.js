'use strict';

var Imbo = require('imboclient');
var metadata = require('imboclient-metadata');

Imbo.Client.prototype.searchMetadata = metadata.searchMetadata;
Imbo.Client.prototype.searchGlobalMetadata = metadata.searchGlobalMetadata;

module.exports = Imbo;
