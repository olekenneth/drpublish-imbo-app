<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Images (Imbo)</title>
    <link rel="stylesheet" href="//publish-stage.vgnett.no/aptomadev/drpublish/css/jquery-ui/drpublish/jquery-ui-1.8.6.custom.css">
    <link rel="stylesheet" href="//publish-stage.vgnett.no/aptomadev/drpublish/css/main/all.reset.css">
    <link rel="stylesheet" href="//publish-stage.vgnett.no/aptomadev/drpublish/css/main/all.elements.css?t=1392728310">
    <link rel="stylesheet" href="//publish-stage.vgnett.no/aptomadev/drpublish/css/main/plugin.layout.css?t=1392728310">
    <link rel="stylesheet" href="//publish-stage.vgnett.no/aptomadev/drpublish/css/main/plugin.colors.light.css">
    <link rel="stylesheet" href="css/font-awesome.min.css">
    <link rel="stylesheet" href="css/imbo-loader.css">
    <link rel="stylesheet" href="css/imbo-plugin.css">
</head>
<body class="loading standalone">

    <?php include 'imbo-loader.html'; ?>

    <div class="content">
        <fieldset class="add-new-images">
            <legend data-translate="ADD_NEW_IMAGES"></legend>

            <input type="file" name="files[]" accept="image/*" class="file-upload"  multiple>
            <button class="upload-local-file"><i class="fa fa-upload"></i> <span data-translate="UPLOAD_LOCAL_IMAGE"></span></button>
            <span class="spacer">&nbsp;</span>

            <div class="progress clear hidden"></div>
        </fieldset>

        <fieldset class="current-images">
            <legend>
                <span data-translate="IMAGE_RESULT_SHOWING"></span>
                <span class="display-count">0</span>
                <span data-translate="IMAGE_RESULT_OUT_OF"></span>
                <span class="total-hit-count">0</span>
                <span data-translate="IMAGE_RESULT_TOTAL_HITS"></span>
            </legend>

            <ul class="image-list clear"></ul>
        </fieldset>
    </div>

    <div class="meta-editor hidden">
        <div class="input-pane">
            <fieldset>
                <legend data-translate="META_EDITOR_IMAGE_TITLE"></legend>
                <input type="text" name="drp:title">
            </fieldset>

            <fieldset>
                <legend data-translate="META_EDITOR_IMAGE_DESCRIPTION"></legend>
                <textarea name="drp:description"></textarea>
            </fieldset>

            <fieldset>
                <legend data-translate="META_EDITOR_IMAGE_PHOTOGRAPHER"></legend>
                <input type="text" name="drp:photographer">
            </fieldset>

            <fieldset>
                <legend data-translate="META_EDITOR_IMAGE_AGENCY"></legend>
                <input type="text" name="drp:agency">
            </fieldset>

            <div class="buttons">
                <button class="close"><i class="fa fa-times"></i> <span data-translate="META_EDITOR_CLOSE_PANE"></span></button>
                <button class="save"><i class="fa fa-save"></i> <span data-translate="META_EDITOR_SAVE_META_DATA"></span></button>
            </div>
        </div>

        <div class="image-container">
            <h2 data-translate="META_EDITOR_SOURCE_IMAGE"></h2>
        </div>
    </div>

    <div class="image-toolbar hidden">
        <button data-translate-title="USE_IMAGE" data-action="use-image"><i class="fa fa-plus-square-o"></i></button>
        <button data-translate-title="SHOW_IMAGE_INFO" data-action="show-image-info"><i class="fa fa-info"></i></button>
        <a href="#download-link" class="download-image" download="#file-name"><button data-translate-title="DOWNLOAD_IMAGE" data-action="download-image"><i class="fa fa-download"></i></button></a>
        <button data-translate-title="DELETE_IMAGE" data-action="delete-image"><i class="fa fa-trash-o"></i></button>
    </div>

    <script>
    var Drp = window.Drp || {};
    Drp.ImboConfig = <?php echo json_encode(require 'config/config.php'); ?>
    </script>
    <script src="vendor/require-2.1.11.min.js" data-main="js/main"></script>
</body>
</html>
