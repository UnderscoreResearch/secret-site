import jQuery from "jquery";
import nacl from 'tweetnacl';

import state from './state';
import data from './data';
import secretEdit from './secretedit';
import secretPayment from './secretpayment';
import key from './key';
import caretakerEdit from './caretakeredit';
import common from './common';
import api from './api';

let scanner;
let cameras;
let cameraIndex;

function stopScanner() {
    if (scanner) {
        scanner.stop();
        jQuery("#camera-overlay").html('<i class="fas fa-camera"></i>');
        cameraIndex = -1;
    }
}

function displayTab(tab, noanimation) {
    common.hideError();
    jQuery('html, body').scrollTop(0);

    jQuery("#errorClose").off().click(common.hideError);

    switch (tab) {
        case "secret-edit":
            secretEdit.showTab();
            break;
        case "secret-payment":
            secretPayment();
            break;
        case "key":
            key();
            break;
        case "caretaker-edit":
            caretakerEdit.showTab();
            break;
    }

    if (tab === "secret-start") {
        if (noanimation) {
            jQuery("#secret-start-tab").show();
            jQuery(".hiddentab").hide();
        } else {
            jQuery("#secret-start-tab").slideDown();
            jQuery(".hiddentab").slideUp();
        }
    } else {
        stopScanner();
        if (noanimation) {
            jQuery("#secret-start-tab").hide();
            jQuery(".hiddentab:not(#" + tab + "-tab)").hide();
            jQuery("#" + tab + "-tab").show();
        } else {
            jQuery("#secret-start-tab").slideUp();
            jQuery(".hiddentab:not(#" + tab + "-tab)").slideUp();
            jQuery("#" + tab + "-tab").slideDown();
        }
    }
}

function displayStateTab(noanimation) {
    if (state.secretId()) {
        if (state.caretakerId()) {
            const caretaker = new data.Caretaker(state.caretakerId(), state.secretPublicKey());
            if (state.privateKey()) {
                common.showProcessing();
                api.getCaretaker(state.secretId(), state.caretakerId())
                    .then((apiCaretaker) => {
                        return caretaker.load(state.caretakerId(), apiCaretaker);
                    })
                    .then(() => {
                        state.caretaker(caretaker);

                        if (caretaker.unlockPublicKey && common.encodeBin(caretaker.unlockPublicKey) == common.encodeBin(caretaker.publicKey)) {
                            return api.getCaretakers(state.secretId())
                                .then((caretakers) => {
                                    state.caretakers(caretakers);
                                });
                        }
                    })
                    .then(() => {
                        displayTab("caretaker-edit", noanimation);
                    })
                    .catch((err) => common.showError(err))
                    .then(() => common.hideProcessing());
            } else {
                common.showProcessing();
                api.checkCaretaker(state.secretId(), state.caretakerId(), state.secretPublicKey())
                    .then((status) => {
                        if (status == 200) {
                            state.privateKey(nacl.sign.keyPair().secretKey);
                            caretaker.address = state.address();
                            caretaker.title = state.title();

                            state.caretaker(caretaker);
                            displayTab("caretaker-edit", noanimation);
                        } else if (status == 202) {
                            common.showError("Caretaker invitation has already been accepted");
                        }
                    })
                    .catch((err) => common.showError(err))
                    .then(() => common.hideProcessing());
            }
            return;
        } else if (state.privateKey()) {
            if (!state.secret()) {
                common.showProcessing();
                Promise.all([
                    api.getSecret(state.secretId())
                        .then((secret) => {
                            const secretObj = new data.Secret();
                            return secretObj.load(secret)
                                .then(() => secretObj);
                        })
                        .then((secretObj) => {
                            state.secret(secretObj);
                        }),
                    api.getCaretakers(state.secretId())
                        .then((caretakers) => {
                            return state.caretakers(caretakers);
                        })
                    ])
                    .then(() => {
                        displayTab("secret-edit", noanimation)
                    })
                    .catch((err) => common.showError(err))
                    .then(() => common.hideProcessing());
            } else {
                displayTab("secret-edit", noanimation);
            }
            return;
        }
    } else if (state.privateKey()) {
        displayTab("secret-edit", noanimation);
        return;
    }

    displayTab("secret-start", noanimation);
}

function showPage() {
    "use strict"; // Start of use strict

    jQuery("#camera-overlay").off().click(function() {
        import(/* webpackChunkName: "scan" */ 'instascan').then(instascan => {
            if (scanner) {
                if (cameras) {
                    cameraIndex++;
                    if (cameraIndex >= cameras.length) {
                        jQuery("#camera-overlay").html('<i class="fas fa-camera"></i>');
                        cameraIndex = -1;
                        scanner.stop();
                    } else {
                        if (cameraIndex + 1 >= cameras.length) {
                            jQuery("#camera-overlay").html('<i class="fas fa-ban"></i>');
                        } else {
                            jQuery("#camera-overlay").html('<i class= "fas fa-sync-alt"/><i class="fas fa-camera"></i>');
                        }
                        scanner.start(cameras[cameraIndex]);
                    }
                }
            } else {
                scanner = new instascan.Scanner({ video: document.getElementById('qrscan') });
                scanner.addListener('scan',
                    function (content) {
                        console.log("Parsed link " + content);
                        if (state.parseLink(content)) {
                            displayStateTab();
                        }
                    });
                instascan.Camera.getCameras().then(function(c) {
                    if (c.length > 0) {
                        if (c.length > 1) {
                            jQuery("#camera-overlay").html('<i class= "fas fa-sync-alt"/><i class="fas fa-camera"></i>');
                        } else {
                            jQuery("#camera-overlay").html('<i class="fas fa-ban"></i>');
                        }
                        cameras = c;
                        cameraIndex = 0;
                        scanner.start(cameras[cameraIndex]);
                    } else {
                        console.error('No cameras found.');
                    }
                }).catch(function(e) {
                    console.error(e);
                });
            }
        }).catch(() => common.showError('An error occurred while loading the component'));
    });

    jQuery("#showKeyButton").off().click(function() {
        if (state.parseLink(jQuery("#privateKey").val())) {
            displayStateTab();
        } else {
            common.showError("Invalid key format");
        }
        return false;
    });

    jQuery("#newSecretButton").off().click(function() {
        state.privateKey(nacl.sign.keyPair().secretKey);
        state.dataKey(nacl.randomBytes(32));
        state.secret(new data.Secret());

        displayStateTab();
        return false;
    });

    jQuery(".showKey").off().click(function() {
        displayTab("key", false);
    });

    displayStateTab(true);
}

export default {
    stopScanner: stopScanner,
    displayTab: displayTab,
    showPage: showPage
}