define([], function() {
    var Exif = {};

    Exif.Compression = {
        1: 'Uncompressed',
        2: 'CCITT 1D',
        3: 'T4/Group 3 Fax',
        4: 'T6/Group 4 Fax',
        5: 'LZW',
        6: 'JPEG (old-style)',
        7: 'JPEG',
        8: 'Adobe Deflate',
        9: 'JBIG B&W',
        10: 'JBIG Color',
        99: 'JPEG',
        262: 'Kodak 262',
        32766: 'Next',
        32767: 'Sony ARW Compressed',
        32769: 'Packed RAW',
        32770: 'Samsung SRW Compressed',
        32771: 'CCIRLEW',
        32773: 'PackBits',
        32809: 'Thunderscan',
        32867: 'Kodak KDC Compressed',
        32895: 'IT8CTPAD',
        32896: 'IT8LW',
        32897: 'IT8MP',
        32898: 'IT8BL',
        32908: 'PixarFilm',
        32909: 'PixarLog',
        32946: 'Deflate',
        32947: 'DCS',
        34661: 'JBIG',
        34676: 'SGILog',
        34677: 'SGILog24',
        34712: 'JPEG 2000',
        34713: 'Nikon NEF Compressed',
        34715: 'JBIG2 TIFF FX',
        34718: 'MDI Binary Level Codec',
        34719: 'MDI Progressive Transform Codec',
        34720: 'MDI Vector',
        34892: 'Lossy JPEG',
        65000: 'Kodak DCR Compressed',
        65535: 'Pentax PEF Compressed'
    };

    Exif.Flash = {
        0x0: 'No Flash',
        0x1: 'Fired',
        0x5: 'Fired, return not detected',
        0x7: 'Fired, return detected',
        0x8: 'On, did not fire',
        0x9: 'On, fired',
        0xd: 'On, return not detected',
        0xf: 'On, return detected',
        0x10: 'Off, did not fire',
        0x14: 'Off, did not fire, return not detected',
        0x18: 'Auto, did not fire',
        0x19: 'Auto, fired',
        0x1d: 'Auto, fired, return not detected',
        0x1f: 'Auto, fired, return detected',
        0x20: 'No flash function',
        0x30: 'Off, no flash function',
        0x41: 'Fired, red-eye reduction',
        0x45: 'Fired, red-eye reduction, return not detected',
        0x47: 'Fired, red-eye reduction, return detected',
        0x49: 'On, red-eye reduction',
        0x4d: 'On, red-eye reduction, return not detected',
        0x4f: 'On, red-eye reduction, return detected',
        0x50: 'Off, red-eye reduction',
        0x58: 'Auto, did not fire, red-eye reduction',
        0x59: 'Auto, fired, red-eye reduction',
        0x5d: 'Auto, fired, red-eye reduction, return not detected',
        0x5f: 'Auto, fired, red-eye reduction, return detected',
    };

    Exif.LightSource = {
        0: 'Unknown',
        1: 'Daylight',
        2: 'Fluorescent',
        3: 'Tungsten (Incandescent)',
        4: 'Flash',
        9: 'Fine Weather',
        10: 'Cloudy',
        11: 'Shade',
        12: 'Daylight Fluorescent',
        13: 'Day White Fluorescent',
        14: 'Cool White Fluorescent',
        15: 'White Fluorescent',
        16: 'Warm White Fluorescent',
        17: 'Standard Light A',
        18: 'Standard Light B',
        19: 'Standard Light C',
        20: 'D55',
        21: 'D65',
        22: 'D75',
        23: 'D50',
        24: 'ISO Studio Tungsten',
        255: 'Other'
    };

    Exif.Orientation = {
        1: 'Horizontal (normal)',
        2: 'Mirror horizontal',
        3: 'Rotate 180',
        4: 'Mirror vertical',
        5: 'Mirror horizontal and rotate 270 CW',
        6: 'Rotate 90 CW',
        7: 'Mirror horizontal and rotate 90 CW',
        8: 'Rotate 270 CW'
    };

    Exif.WhiteBalance = {
        0: 'EXIF_AUTO',
        1: 'EXIF_MANUAL'
    };

    Exif.SceneCaptureType = {
        0: 'EXIF_STANDARD',
        1: 'EXIF_SCENE_CAPTURE_LANDSCAPE',
        2: 'EXIF_SCENE_CAPTURE_PORTRAIT',
        3: 'EXIF_SCENE_CAPTURE_NIGHT'
    };

    Exif.MeteringMode = {
        0: 'EXIF_UNKNOWN',
        1: 'EXIF_AVERAGE',
        2: 'EXIF_CENTER_WEIGHTED_AVERAGE',
        3: 'EXIF_SPOT_METERING',
        4: 'EXIF_MULTI_SPOT_METERING',
        5: 'EXIF_PATTERN_METERING',
        6: 'EXIF_PARTIAL_METERING',
        255: 'EXIF_UNKNOWN'
    };

    Exif.ExposureProgram = {
        0: 'EXIF_UNKNOWN',
        1: 'EXIF_MANUAL',
        2: 'EXIF_STANDARD',
        3: 'EXIF_APERTURE_PRIORITY',
        4: 'EXIF_SHUTTER_PRIORITY',
        5: 'EXIF_CREATIVE_PROGRAM',
        6: 'EXIF_ACTION_PROGRAM',
        7: 'EXIF_PORTRAIT_MODE',
        8: 'EXIF_LANDSCAPE_MODE'
    };

    Exif.ExposureMode = {
        0: 'EXIF_AUTO',
        1: 'EXIF_MANUAL',
        2: 'EXIF_AUTO_BRACKET'
    };

    Exif.SensingMode = {
        1: 'Not defined',
        2: 'One-chip color area sensor',
        3: 'Two-chip color area sensor',
        4: 'Three-chip color area sensor',
        5: 'Color sequential area sensor',
        7: 'Trilinear sensor',
        8: 'Color sequential linear sensor'
    };

    Exif.TagTable = {
        'exif:Compression': Exif.Compression,
        'exif:Flash': Exif.Flash,
        'exif:LightSource': Exif.LightSource,
        'exif:Orientation': Exif.Orientation,
        'exif:WhiteBalance': Exif.WhiteBalance,
        'exif:SceneCaptureType': Exif.SceneCaptureType,
        'exif:MeteringMode': Exif.MeteringMode,
        'exif:ExposureProgram': Exif.ExposureProgram,
        'exif:ExposureMode': Exif.ExposureMode,
        'exif:SensingMethod': Exif.SensingMode
    };

    Exif.TagMap = {
        'exif:ApertureValue': 'EXIF_APERTURE',
        'exif:MaxApertureValue': 'EXIF_MAX_APERTURE',
        'exif:BrightnessValue': 'EXIF_BRIGHTNESS',
        'exif:Compression': 'EXIF_COMPRESSION',
        'exif:DateTime': 'EXIF_DATE',
        'exif:ExposureMode': 'EXIF_EXPOSURE_MODE',
        'exif:ExposureProgram': 'EXIF_EXPOSURE_PROGRAM',
        'exif:ExposureTime': 'EXIF_EXPOSURE_TIME',
        'exif:Flash': 'EXIF_FLASH',
        'exif:FocalLength': 'EXIF_FOCAL_LENGTH',
        'exif:ImageLength': 'EXIF_IMAGE_WIDTH',
        'exif:LightSource': 'EXIF_LIGHTSOURCE',
        'exif:Make': 'EXIF_CAMERA_MAKE',
        'exif:Model': 'EXIF_CAMERA_MODEL',
        'exif:SensingMethod': 'EXIF_SENSOR_TYPE',
        'exif:MeteringMode': 'EXIF_METERING_MODE',
        'exif:Orientation': 'EXIF_ORIENTATION',
        'exif:SceneCaptureType': 'EXIF_SCENE_CAPTURE_TYPE',
        'exif:ShutterSpeedValue': 'EXIF_SHUTTER_SPEED',
        'exif:WhiteBalance': 'EXIF_WHITE_BALANCE',
        'exif:FNumber': 'EXIF_F_NUMBER'
    };

    return Exif;
});