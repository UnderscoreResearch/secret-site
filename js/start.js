import jQuery from "jquery";
import nacl from 'tweetnacl';

import state from './state';
import data from './data';
import camera from './camera';
import secretEdit from './secretedit';
import secretPayment from './secretpayment';
import key from './key';
import caretakerEdit from './caretakeredit';
import common from './common';
import api from './api';

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
        camera.stopScanner();
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

    camera.connectCamera("#camera-overlay", "#qrscan",function (content) {
        if (state.parseLink(content)) {
            displayStateTab();
        }
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
    displayTab: displayTab,
    showPage: showPage
}