import jQuery from 'jquery';
import saveAs from 'file-saver';
import nacl from 'tweetnacl';
import Mustache from 'mustache';

import common from './common';
import send from './send';
import state from './state';
import data from './data';
import api from './api';
import start from "./start";

let caretakers = [];
let editor;
let secret;

function submitPending() {
    return state.caretaker().unlockPublicKey &&
        common.encodeBin(state.caretaker().unlockPublicKey) !== common.encodeBin(state.caretaker().publicKey) &&
        !state.caretaker().hasUnlockData;
}

function unlockingCaretaker() {
    return state.caretaker().unlockPublicKey &&
        common.encodeBin(state.caretaker().unlockPublicKey) === common.encodeBin(state.caretaker().publicKey);
}

function sendRequests(type, destinations, callback) {
    send.showDialog(state.caretaker().title, type, destinations, function () {
    }, function () {
        if (callback != null)
            callback();
        updateButtons();
    });
}

function loadModules() {
    return import(/* webpackChunkName: "edit" */ 'quill').then(Quill => {
        return Quill.default;
    });
}

function updateButtons() {
    window.onbeforeunload = function (e)
    {
        if ((state.caretaker().changed || state.unvalidatedKey() )&& state.caretaker().publicKey) {
            return 'You have unsaved changes. Are you sure you want to navigate off the page?';
        }
        return null;
    }

    const button = jQuery("#caretakerNext");
    if (!state.caretaker().publicKey) {
        button
            .text("Accept Responsibility")
            .removeAttr("disabled");
    } else if (state.caretaker().changed) {
        button
            .text("Update")
            .removeAttr("disabled");
    } else {
        const data = state.caretaker().data;
        if (data && !state.caretaker().hasUnlockData) {
            if (!unlockingCaretaker()) {
                if (submitPending()) {
                    button
                        .text("Submit Key")
                        .removeAttr("disabled");
                    return;
                } else if (data.keys) {
                    button
                        .text("Unlock")
                        .removeAttr("disabled");
                    return;
                }
            }
        }
        
        if (caretakers.filter(t => t.pendingShare).length > 0) {
            button
                .text("Share Access")
                .removeAttr("disabled");
            return;
        }
        
        button
            .text("Update")
            .attr("disabled", true);
    }
}

function caretakerIndex(caretakerId) {
    for (let i = 0; i < caretakers.length; i++) {
        if (caretakers[i].caretakerId === caretakerId) {
            return i;
        }
    }
    return -1;
}

function renderCaretakers(animate) {
    if (caretakers.length > 0) {
        caretakers.forEach(t => {
           t.allowShare = secret != null && unlockingCaretaker()
        });
        if (secret) {
            jQuery("#caretakerListHeaderShare").show();
            jQuery("#caretakerListHeader").hide();
        } else {
            jQuery("#caretakerListHeaderShare").hide();
            jQuery("#caretakerListHeader").show();
        }
        
        let caretakerHtml = "";
        for (let i = 0; i < caretakers.length; i++) {
            caretakerHtml += Mustache.render(jQuery('#caretakerTemplate').html(), caretakers[i]);
        }
        
        jQuery("#caretakerList").html(caretakerHtml);
        if (animate) {
            jQuery("#caretakerListContainer").slideDown();
        } else {
            jQuery("#caretakerListContainer").show();
        }

        jQuery(".caretakerResend").off().on("click", function () {
            const form = jQuery(this).closest("form");
            const index = caretakerIndex(form.attr("data-itemid"));
            if (index >= 0) {
                if (caretakers[index].hasDataKey) {
                    sendRequests('SHARE', [ caretakers[index] ], () => {
                        caretakers.forEach(t => t.pendingShare = false)
                    });
                } else {
                    sendRequests('UNLOCK', [ caretakers[index] ] );
                }
            }
        });
        
        jQuery(".caretakerShare").off().on("click", function() {
            const form = jQuery(this).closest("form");
            const index = caretakerIndex(form.attr("data-itemid"));
            if (index >= 0) {
                caretakers[index].pendingShare = jQuery(this).is(":checked");
                updateButtons();
            }
        });
    } else {
        if (animate) {
            jQuery("#caretakerListContainer").slideUp();
        } else {
            jQuery("#caretakerListContainer").hide();
        }
    }
}

function fetchSecret() {
    if (secret == null) {
        api.getSecret(state.secretId(), state.dataKey(), state.caretakerId())
            .then((apiSecret) => {
                secret = new data.Secret();
                secret.load(apiSecret)
                    .then(() => loadModules())
                    .then((Quill) => {
                        const target = jQuery("#caretakerContents");
                        if (target) {
                            target.slideDown();
                            jQuery('html, body').animate({
                                    scrollTop: (target.offset().top - 70)
                                },
                                1000,
                                "easeInOutExpo");
                        }
                        if (!editor) {
                            editor = new Quill('#caretakerEditor',
                                {
                                    modules: {
                                        toolbar: []
                                    },
                                    theme: 'bubble',
                                    readOnly: true
                                });
                        }
                        let doc = secret.documentDelta;
                        if (doc) {
                            editor.setContents(JSON.parse(doc));
                        }
    
                        const uploadedFiles = secret.uploadedFiles;
    
                        let items = "";
    
                        if (uploadedFiles) {
                            for (let file in uploadedFiles) {
                                if (uploadedFiles.hasOwnProperty(file)) {
                                    const fileId = encodeURIComponent(file);
    
                                    items += '<li class="list-group-item text-left">' +
                                        '<a href="#" data-itemid="' +
                                        fileId +
                                        '">' +
                                        common.escapeHtml(file) +
                                        '</a></li>';
                                }
                            }

                            if (items) {
                                jQuery("#caretakerFileContainer").show();
                                jQuery("#caretakerFileList").html(items);
                            } else {
                                jQuery("#caretakerFileContainer").hide();
                            }
    
                            jQuery("#caretakerFileList a").on('click',
                                function () {
                                    const file = decodeURIComponent(jQuery(this).attr("data-itemid"));
                                    const fileData = secret.uploadedFiles[file];
                                    const blob = new Blob([fileData]);
                                    saveAs["saveAs"](blob, file);
                                    return false;
                                });
                        }
                        
                        renderCaretakers(true);
                        updateButtons();
                    });
            })
            .catch((err) => {
                if (err !== "Too early") {
                    common.showError(err);
                }
            });
    }
}

function updateCaretakers(animate) {
    if (state.caretakers()) {
        return data.caretakerListFromMap(state.caretakers())
            .then((list) => {
                caretakers = list.filter((caretaker) => caretaker.caretakerId !== state.caretakerId() &&
                    caretaker.hasData);
                const myShare = state.caretaker().data;
                const required = myShare.required;
                let shares = caretakers.filter(caretaker => caretaker.hasUnlockData).map(caretaker => caretaker.unlockData);
                if (shares.length + 1 >= required) {
                    jQuery("#caretakerSendAll").hide();

                    shares.push(myShare);
                    state.dataKey(data.combineShares(shares));
                    fetchSecret();
                }

                renderCaretakers(animate);
            });
    } else {
        caretakers = [];

        renderCaretakers(animate);
        
        if (state.caretaker().hasDataKey) {
            state.dataKey(state.caretaker().dataKey);
            fetchSecret();
        }

        return new Promise((resolve) => resolve());
    }
}

function requestUnlock(data) {
    common.showProcessing();
    let keyDigests = {};

    for (let caretakerId in data.keys) {
        if (data.keys.hasOwnProperty(caretakerId)) {
            keyDigests[caretakerId] = common.encodeBin(nacl.hash(common.decodeBin(data.keys[caretakerId])));
        }
    }

    api.unlockSecret(state.secretId(), state.caretakerId(), keyDigests)
        .then(() => {
            state.caretaker().unlockPublicKey = state.caretaker().publicKey;
            return api.getCaretakers(state.secretId());
        })
        .then((caretakerMap) => {
            state.caretakers(caretakerMap);

            return updateCaretakers(true);
        })
        .then(() => {
            sendRequests('UNLOCK', caretakers);
        })
        .catch((err) => {
            common.showError(err);
        })
        .then(() => {
            common.hideProcessing();
        });
}

function nextClick() {
    let showKey = false;
    if (!state.caretaker().publicKey) {
        state.caretaker().publicKey = state.publicKey();
        showKey = true;
    }

    if (state.caretaker().changed) {
        common.showProcessing();

        api.updateCaretaker(state.secretId(), state.caretakerId(), state.caretaker().apiCaretaker)
            .then(() => {
                state.caretaker().changed = false;
                updateButtons();
                if (showKey) {
                    state.unvalidatedKey(true);
                    start.displayTab("key");
                }
            })
            .catch((err) => {
                common.showError(err);
            })
            .then(() => {
                common.hideProcessing();
            });
    } else {
        const data = state.caretaker().data;
        if (data && !state.caretaker().hasUnlockData) {
            if (submitPending()) {
                common.showProcessing();
                state.caretaker().unlockData = state.caretaker().data;
                api.updateCaretaker(state.secretId(), state.caretakerId(), state.caretaker().apiCaretaker)
                    .then(() => {
                        state.caretaker().changed = false;
                    })
                    .catch((err) => {
                        common.showError(err);
                    })
                    .then(() => {
                        common.hideProcessing();
                        updateButtons();
                    });
            } else if (data.keys && !state.caretaker().unlockPublicKey) {
                requestUnlock(data);
            } else {
                const pendingShare = caretakers.filter(t => t.pendingShare);
                if (pendingShare.length > 0) {
                    send.showDialog(state.caretaker().title, 'SHARE', pendingShare, function (updatedCaretaker) {
                    }, function () {
                        const shares = {};

                        pendingShare.forEach((t) => {
                            shares[t.caretakerId] = common.encodeEncryptedAsymmetric(state.dataKey(), state.privateKey(), t.publicKey);
                        });

                        return api.shareSecret(state.secretId(), state.caretakerId(), shares)
                            .then(() => {
                                pendingShare.forEach(t => {
                                    t.dataKey = state.dataKey();
                                    t.changed = false;
                                });
                                renderCaretakers();
                                updateButtons();
                            });
                    });
                }
            }
        }
    }
}

function showTab() {
    jQuery("#caretakerExit").off().click(function () {
        document.location.reload();
    });

    jQuery("#caretakerTitle").text(state.caretaker().title);
    if (state.caretaker().isMail) {
        jQuery("#caretakerEmail").removeAttr("checked");
        jQuery("#caretakerMail").attr("checked", true);
        jQuery("#caretakerNotificationMail").show().val(state.caretaker().address);
        jQuery("#caretakerNotification").hide();
    } else {
        jQuery("#caretakerEmail").attr("checked", true);
        jQuery("#caretakerMail").removeAttr("checked");
        jQuery("#caretakerNotification").show().val(state.caretaker().address);
        jQuery("#caretakerNotificationMail").hide();
    }

    if (state.caretaker().fingerprint) {
        jQuery("#caretakerFingerprintContainer").show();
        jQuery("#caretakerFingerprint").text(state.caretaker().fingerprint);
    } else {
        jQuery("#caretakerFingerprintContainer").hide();
    }

    jQuery("#caretakerNotification,#caretakerNotificationMail").off().on("change paste keyup", function () {
        state.caretaker().address = jQuery(this).val();
        updateButtons();
    });

    jQuery("#caretakerEmail").off().on("change", function () {
        state.caretaker().addressType = "EMAIL";
        state.caretaker().address = jQuery("#caretakerNotification").slideDown().val();
        jQuery("#caretakerNotificationMail").slideUp();
        updateButtons();
    });

    jQuery("#caretakerMail").off().on("change", function () {
        state.caretaker().addressType = "MAIL";
        state.caretaker().address = jQuery("#caretakerNotificationMail").slideDown().val();
        jQuery("#caretakerNotification").slideUp();
        updateButtons();
    });

    jQuery("#caretakerNext").off().on("click", function() {
        nextClick();
    });

    if (state.caretaker().publicKey) {
        jQuery("#caretakerMenu").show();
    } else {
        jQuery("#caretakerMenu").hide();
    }
    if (state.caretaker().unlockPublicKey &&
        common.encodeBin(state.caretaker().unlockPublicKey) !== common.encodeBin(state.caretaker().publicKey) &&
        state.caretaker().data.keys) {
        jQuery("#caretakerOverride").show().off().on("click", function() {
            requestUnlock(state.caretaker().data);
        });
    } else {
        jQuery("#caretakerOverride").hide();
    }

    if (unlockingCaretaker()) {
        jQuery("#caretakerSendAll").show().off().on("click", function() {
            sendRequests('UNLOCK', caretakers.filter(t => !t.hasUnlockData));
        });
    } else {
        jQuery("#caretakerSendAll").hide();
    }

    updateCaretakers(false);

    updateButtons();
}

export default {
    showTab: showTab
}