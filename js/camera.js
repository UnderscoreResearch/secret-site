import jQuery from "jquery";
import common from "./common";

let scanner;
let cameras;
let cameraIndex;
let scannerOverlayId;

export default {
    stopScanner: function () {
        if (scanner) {
            scanner.stop();
            jQuery(scannerOverlayId).html('<i class="fas fa-camera"></i>');
            cameraIndex = -1;
            scanner = null;
        }
    },

    connectCamera: function (overlayId, cameraId, callback) {
        jQuery(overlayId).off().click(function () {
            import(/* webpackChunkName: "scan" */ 'instascan').then(instascan => {
                if (scanner) {
                    if (cameras) {
                        cameraIndex++;
                        if (cameraIndex >= cameras.length) {
                            jQuery(overlayId).html('<i class="fas fa-camera"></i>');
                            cameraIndex = -1;
                            scanner.stop();
                        } else {
                            jQuery(overlayId).html('<i class="fas fa-ban"></i>');
                            scanner.start(cameras[cameraIndex]);
                        }
                    }
                } else {
                    scanner = new instascan.Scanner({video: jQuery(cameraId).get(0)});
                    scannerOverlayId = overlayId;
                    scanner.addListener('scan', callback);
                    instascan.Camera.getCameras().then(function (c) {
                        if (c.length > 0) {
                            c = [c[0]];

                            if (c.length > 1) {
                                jQuery(overlayId).html('<i class="fas fa-ban"></i>');
                            }
                            cameras = c;
                            cameraIndex = 0;
                            scanner.start(cameras[cameraIndex]);
                        } else {
                            common.showError('No cameras found.');
                        }
                    }).catch(function (e) {
                        common.showError(e);
                    });
                }
            }).catch(() => common.showError('An error occurred while loading the component'));
        });
    }
}
