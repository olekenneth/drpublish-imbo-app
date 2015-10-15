<?php
    $publicationId = isset($_GET['publicationId']) ? $_GET['publicationId'] : null;

    // Get the getConfig function
    $getConfig = require 'config/config.php';

    // Get the config by calling the getConfig with the publication id
    $config = $getConfig($publicationId);

    $DrPublishURL = $config['DrPublishURL'];
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Images (Imbo)</title>
    <link rel="stylesheet" href="<?php echo $DrPublishURL ?>/css/jquery-ui/drpublish/jquery-ui-1.8.6.custom.css">
    <link rel="stylesheet" href="<?php echo $DrPublishURL ?>/css/main/all.reset.css">
    <link rel="stylesheet" href="<?php echo $DrPublishURL ?>/css/main/all.elements.css?t=1392728310">
    <link rel="stylesheet" href="<?php echo $DrPublishURL ?>/css/main/plugin.layout.css?t=1392728310">
    <link rel="stylesheet" href="<?php echo $DrPublishURL ?>/css/main/plugin.colors.light.css">
    <link rel="stylesheet" href="vendor/jcrop/jquery.Jcrop.min.css">
    <link rel="stylesheet" href="css/font-awesome.min.css">
    <link rel="stylesheet" href="css/imbo-loader.css">
    <link rel="stylesheet" href="css/imbo-plugin.css?<?php echo time(); ?>">
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <script>
        var Drp = window.Drp || {};
        Drp.ImboConfig = <?php echo json_encode($config); ?>;
    </script>
    <script src="vendor/require-2.1.11.min.js" data-main="js/main"></script>
</head>
<body class="loading standalone">
    <?php include 'imbo-loader.html'; ?>
    <section class="content">
        <fieldset class="add-new-images">
            <legend data-translate="ADD_NEW_IMAGES"></legend>

            <input type="file" name="files[]" accept="image/*" class="file-upload"  multiple>
            <button class="upload-local-file"><i class="fa fa-upload"></i> <span data-translate="UPLOAD_LOCAL_IMAGE"></span></button>
            <button class="upload-scanpix-image"><i class="fa fa-upload"></i> <span data-translate="LOAD_FROM_SCANPIX"></span></button>

            <div class="progress clear hidden"></div>
            <p class="scanpix-loading hidden">Laster opp bilder fra Scanpix...</p>
        </fieldset>

        <fieldset class="selected-image">
            <legend data-translate="SELECTED_IMAGE_TITLE"></legend>
            <img src="img/clearpix.png" class="image-preview" alt="" />
            <div class="loading">
                <? include 'imbo-loader.html' ?>
            </div>
            <div class="action-buttons">
                <button class="edit-image"><i class="fa fa-edit"></i> <span data-translate="SELECTED_IMAGE_EDIT_IMAGE"></span></button>
            </div>
        </fieldset>

        <fieldset class="current-images">
            <legend data-translate="IMAGE_SEARCH_FIND_IMAGES" ></legend>
            <form action="#" class="search">
                <input type="search" id="image-search" class="image-search" name="query">
                <button type="submit"><i class="fa fa-search"></i> <span data-translate="IMAGE_SEARCH_BUTTON"></span></button>
                <button type="button" class="refresh"><i class="fa fa-refresh"></i> <span data-translate="IMAGE_SEARCH_REFRESH_BUTTON"></span></button>
            </form>
            <p class="search-stats">
                <span data-translate="IMAGE_RESULT_SHOWING"></span>
                <span class="display-count">0</span>
                <span data-translate="IMAGE_RESULT_OUT_OF"></span>
                <span class="total-hit-count">0</span>
                <span data-translate="IMAGE_RESULT_TOTAL_HITS"></span>:
            </p>

            <ul class="image-list clear"></ul>
        </fieldset>
    </section>


    <section class="image-editor hidden">

        <div class="settings-pane">
            <div class="settings-header">
                <button data-ref="image" >
                    <span data-translate="IMAGE_EDITOR_TITLE"></span>
                </button>
                <button data-ref="meta" class="active">
                    <span data-translate="META_EDITOR_TITLE"></span>
                </button>
            </div>

            <div class="settings-tab image hidden">
                <div><img src="" id="reference-image" style="width: 0; height: 0" /></div>
                <fieldset>
                    <legend><i class="fa fa-crop"></i><span data-translate="IMAGE_EDITOR_CROP_SETTINGS"></span></legend>

                    <div class="crop-presets">
                        <button class="ratio unlock active" data-ratio="0"><i class="fa fa-unlock-alt"></i> <span data-translate="IMAGE_EDITOR_CROP_RATIO_UNLOCK"></span></button>
                    </div>
                </fieldset>

                <fieldset class="rotates">
                    <legend>
                        <i class="fa fa-rotate-right"></i><span data-translate="IMAGE_EDITOR_ROTATION"></span>
                    </legend>
                    <div class="rotation">
                        <button class="rotate" data-amount="-90"><i class="material-icons">rotate_left</i></button>
                        <button class="rotate" data-amount="90"><i class="material-icons">rotate_right</i></button>
                    </div>
                </fieldset>

                <fieldset class="controls">
                    <legend><i class="fa fa-adjust"></i><span data-translate="IMAGE_EDITOR_ADJUSTMENTS"></span></legend>

                    <form action="" class="sliders">
                        <label for="slider-saturation" data-translate="IMAGE_EDITOR_SATURATION"></label>
                        <input type="range" min="0" max="200" step="1" value="100" name="saturation" id="slider-saturation">

                        <label for="slider-brightness" data-translate="IMAGE_EDITOR_BRIGHTNESS"></label>
                        <input type="range" min="0" max="200" step="1" value="100" name="brightness" id="slider-brightness">

                        <label for="slider-hue" data-translate="IMAGE_EDITOR_HUE"></label>
                        <input type="range" min="0" max="200" step="1" value="100" name="hue" id="slider-hue">

                        <label for="slider-sharpen" data-translate="IMAGE_EDITOR_SHARPNESS"></label>
                        <input type="range" min="0" max="4" step="1" value="0" name="sharpen" id="slider-sharpen">
                    </form>
                </fieldset>

                <div class="buttons">
                    <button class="reset"><i class="fa fa-thumbs-o-down"></i> <span data-translate="IMAGE_EDITOR_RESET_BUTTON"></span></button>
                    <button class="cancel"><i class="fa fa-times"></i> <span data-translate="IMAGE_EDITOR_CANCEL_BUTTON"></span></button>
                    <button class="insert"><i class="fa fa-save"></i> <span data-translate="IMAGE_EDITOR_INSERT_IMAGE"></span></button>
                    <button class="update hidden"><i class="fa fa-save"></i> <span data-translate="IMAGE_EDITOR_UPDATE_IMAGE"></span></button>
                </div>
            </div>

            <div class="settings-tab meta">
                <div class="meta-editor">
                    <div class="tabs">
                        <ul class="tab-controller">
                            <li><button class="core active" data-tab="core"><i class="fa fa-info"></i> <span data-translate="META_EDITOR_CORE_TAB"></span></button></li>
                            <li><button class="exif" data-tab="exif"><i class="fa fa-picture-o"></i> <span data-translate="META_EDITOR_EXIF_TAB"></span></button></li>
                        </ul>

                        <section class="input-pane tab" data-tab="core">
                            <fieldset>
                                <h3 data-translate="META_EDITOR_IMAGE_TITLE"></h3>
                                <input type="text" name="title">

                                <h3 data-translate="META_EDITOR_IMAGE_DESCRIPTION"></h3>
                                <textarea name="description"></textarea>

                                <h3 data-translate="META_EDITOR_IMAGE_PHOTOGRAPHER"></h3>
                                <input type="text" name="photographer">

                                <h3 data-translate="META_EDITOR_IMAGE_AGENCY"></h3>
                                <input type="text" name="agency">
                            </fieldset>
                        </section>

                        <section class="exif-pane tab hidden" data-tab="exif">
                            &nbsp;
                        </section>

                                <div class="buttons">
                                    <button class="close"><i class="fa fa-times"></i> <span data-translate="IMAGE_EDITOR_CANCEL_BUTTON"></span></button>
                                    <button class="save"><i class="fa fa-save"></i> <span data-translate="META_EDITOR_SAVE_META_DATA"></span></button>
                                </div>
                            </div>
                        </div>
            </div>

        </div>

        <section class="image-container">
            <img src="img/blank.gif" id="image-preview" alt="">
        </section>

    </section>



    <aside class="image-toolbar hidden">

        <button class="image-use" data-translate-title="USE_EDIT_IMAGE" data-action="use-image">
            <i class="material-icons">add_circle_outline</i>
        </button>
        <button class="image-info" data-translate-title="SHOW_IMAGE_INFO" data-action="show-image-info"><i class="material-icons">info_outline</i></button>
        <a href="#download-link" class="download-image" download="#file-name"><button data-translate-title="DOWNLOAD_IMAGE" data-action="download-image"><i class="material-icons">file_download</i></button></a>
        <button class="image-delete" data-translate-title="DELETE_IMAGE" data-action="delete-image"><i class="material-icons">delete</i></button>

        <div class="meta-info hidden #meta-class-name"> <!-- if image has restrictions, add class "restrictions" + if credit = VG, add class "vg", if other than VG, add "agency" - if no credit is given, add class "nocredit". I think. -->
            <p>#file-name</p>

            <dl>
                <dt class="meta-restrictions">Restrictions</dt>
                <dd class="meta-restrictions">#restriction-text</dd>

                <dt class="meta-caption">Caption</dt>
                <dd class="meta-caption">#caption-text</dd>

                <dt class="meta-date">Date:</dt>
                <dd class="meta-date">#date</dd>

                <dt class="meta-scanpix-id">Scanpix-ID</dt>
                <dd class="meta-scanpix-id">#scanpix-id</dd>
            </dl>
        </div>

    </aside>
</body>
</html>
