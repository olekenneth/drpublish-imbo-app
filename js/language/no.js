define(['underscore', 'language/en'], function(_, english) {
    return _.defaults({
        // Add/import image functionality
        'ADD_NEW_IMAGES': 'Legg til nye bilder',
        'UPLOAD_IMAGE': 'Last opp bilde',
        'UPLOAD_LOCAL_IMAGE': 'Last opp bilde',

        // Image toolbar tooltips
        'USE_IMAGE': 'Bruk bilde',
        'SHOW_IMAGE_INFO': 'Vis informasjon',
        'DOWNLOAD_IMAGE': 'Last ned',
        'DELETE_IMAGE': 'Slett bilde',

        // Image results (Showing X out of Y total hits)
        'IMAGE_RESULT_SHOWING': 'Viser',
        'IMAGE_RESULT_OUT_OF': 'av',
        'IMAGE_RESULT_TOTAL_HITS': 'totale treff'
    }, english);
});