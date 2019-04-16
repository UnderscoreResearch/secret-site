import jQuery from 'jquery';
import saveAs from 'file-saver';
import nacl from 'tweetnacl';
import Mustache from 'mustache';

import common from './common';
import send from './send';
import start from './start';
import state from './state';
import data from './data';
import api from './api';

const MAX_CARETAKERS = 15;
const MINIMUM_CARETAKERS = 3;

let caretakers;
let notificationCaretaker;
let editor;
let lastZippedDocument;

function loadModules() {
    return import(/* webpackChunkName: "edit" */ 'quill').then(Quill => {
        return Quill.default;
    });
}

function caretakerIndex(caretakerId) {
    for (let i = 0; i < caretakers.length; i++) {
        if (caretakers[i].caretakerId === caretakerId) {
            return i;
        }
    }
    return -1;
}

function anyChange() {
    if (state.secret().changed) {
        return true;
    }

    if (notificationCaretaker.changed) {
        return true;
    }

    for (let i = 0; i < caretakers.length; i++) {
        if (caretakers[i].changed || caretakers[i].deleted) {
            return true;
        }
    }

    return false;
}

function getToolbarOptions() {
    return [
        [
            { 'header': [1, 2, 3, 4, 5, 6, false] },
            { 'font': [] },
            { 'size': ['small', false, 'large', 'huge'] }
        ],

        [
            'bold',
            'italic',
            'underline',
            'strike',
            { 'script': 'sub' },
            { 'script': 'super' }
        ],

        [
            { 'align': '' },
            { 'align': 'center' },
            { 'align': 'right' },
            { 'align': 'justify' }
        ],

        [{ 'list': 'ordered' }, { 'list': 'bullet' }],

        ['link', 'image'],

        [{ 'color': [] }, { 'background': [] }],

        ['blockquote', 'code-block'],

        [{ 'direction': 'rtl' }],                         // text direction

        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent

        ['clean']                                         // remove formatting button
    ];
}

function getUnsent() {
    return caretakers.filter(t => !t.created && t.status === 'Unsent' && !t.deleted);
}

function getAccepted() {
    return caretakers.filter(t => t.publicKey && !t.deleted)
}

function canPublish() {
    return getAccepted().length > MINIMUM_CARETAKERS && caretakers.filter((t) => t.unlock && !t.deleted).length > 0;
}

function sendInvites(sendCaretakers) {
    send.showDialog(jQuery("#secretTitle").val(), "INVITE", sendCaretakers,
        function (updatedCaretaker) {
            const caretaker = caretakers.filter(t => t.caretakerId === updatedCaretaker.caretakerId)[0];
            caretaker.status = "Invited";
            return api.updateCaretaker(
                    state.secretId(),
                    caretaker.caretakerId,
                    caretaker.apiCaretaker)
                .then(() => {
                    caretaker.changed = false;
                });
        }, function completelyDone() {
            updateCaretakers();
        });
}

function animateProgress() {
    jQuery("#fileProgress").addClass("progress-bar-striped progress-bar-animated");
}

function readOnlySecret() {
    return !state.dataKey() && state.secret().encryptedWithDataKey;
}

function everythingValid() {
    if (caretakers.filter(t => !t.valid && !t.deleted).length > 0)
        return false;
    return notificationCaretaker.valid;
}

function updateButtons() {
    const size = state.secret().dataSize;
    let percent = 100 * size / data.MAX_SIZE;
    let progress = jQuery("#fileProgress");
    if (state.secret().processing) {
        animateProgress();
    } else {
        if (size > data.MAX_SIZE) {
            progress.addClass("bg-danger");
            percent = 100;
        } else {
            progress.removeClass("bg-danger");
        }

        progress.removeClass("progress-bar-striped progress-bar-animated");
        let sizeText = Math.round(size / 1024);

        progress.css("width", percent + "%");
        jQuery("#fileProgressText").text(sizeText + "KB of 1MB");
    }

    const button = jQuery("#secretEditNext");

    let nextEnabled = true;
    if (state.secretId()) {
        if (state.secret().unlockPublicKey) {
            button.text("Cancel Unlock");
        } else if ((!anyChange() && canPublish()) && !readOnlySecret()) {
            button.text("Publish");
        } else {
            button.text("Update");

            if (!anyChange()) {
                nextEnabled = false;
            }
        }
    } else {
        button.text("Continue");
    }

    if (state.secret().processing || state.secret().dataSize > data.MAX_SIZE) {
        nextEnabled = false;
    } else {
        common.hideProcessing();
    }

    const valid = everythingValid();

    if (nextEnabled && valid)
        button.removeAttr("disabled");
    else {
        button.attr("disabled", true);

        if (valid) {
            const unsentCaretakers = getUnsent();
            if (unsentCaretakers.length > 0) {
                sendInvites(unsentCaretakers);
            }
        }
    }
}

function connectCaretakerActions() {
    if (caretakers.filter(function (i) { return !i.deleted }).length === MAX_CARETAKERS) {
        jQuery("#addCaretaker").attr("disabled", "true");
    } else {
        jQuery("#addCaretaker").removeAttr("disabled");
    }

    jQuery(".caretakerDelete").off().on("click", function () {
        const form = jQuery(this).closest("form");
        const index = caretakerIndex(form.attr("data-itemid"));
        if (index >= 0) {
            caretakers[index].deleted = true;
        }
        form.slideUp(400, () => form.remove());
        updateButtons();
        connectCaretakerActions();
    });

    jQuery(".caretakerResend").off().on("click", function () {
        const form = jQuery(this).closest("form");
        const index = caretakerIndex(form.attr("data-itemid"));
        if (index >= 0) {
            sendInvites([ caretakers[index] ] );
        }
    });

    jQuery(".caretakerAddressType").off().on("change", function () {
        const form = jQuery(this).closest("form");
        const index = caretakerIndex(form.attr("data-itemid"));
        if (index >= 0) {
            caretakers[index].addressType = jQuery(this).val();
            let textarea = form.find("textarea");
            let address = form.find(".caretakerAddress");
            let row = form.find(".form-row");
            if (caretakers[index].addressType == 'MAIL') {
                caretakers[index].address = textarea.val();
                address.fadeOut().promise().then(() => {
                    row.removeClass("align-items-center", 400);
                    textarea.fadeIn();
                })
            } else {
                caretakers[index].address = address.val();
                textarea.fadeOut().promise().then(() => {
                    row.addClass("align-items-center", 400);
                    address.fadeIn();
                })
            }
            form.find(".caretakerResend").fadeOut();
            updateButtons();
        }
    });

    jQuery(".caretakerAddress, .caretakerAddressMail").off().on("change paste keyup", function () {
        const form = jQuery(this).closest("form");
        const index = caretakerIndex(form.attr("data-itemid"));
        if (index >= 0) {
            caretakers[index].address = jQuery(this).val();
            form.find(".caretakerResend").fadeOut();
            if (caretakers[index].valid) {
                jQuery(this).removeClass("invalidInput");
            } else {
                jQuery(this).addClass("invalidInput");
            }
            updateButtons();
        }
    });

    jQuery(".caretakerUnlock").off().on("change", function () {
        const form = jQuery(this).closest("form");
        const index = caretakerIndex(form.attr("data-itemid"));
        if (index >= 0) {
            caretakers[index].unlock = jQuery(this).is(":checked");
            updateButtons();
        }
    });
}

function updateCaretakers() {
    let caretakerHtml = '';

    if (!readOnlySecret())
        while (caretakers.length < 5)
            caretakers.push(new data.Caretaker());

    if (notificationCaretaker == null) {
        notificationCaretaker = new data.Caretaker();
        notificationCaretaker.notification = true;
        notificationCaretaker.encrypted = false;
        notificationCaretaker.changed = false;
    }

    for (let i = 0; i < caretakers.length; i++) {
        if (!caretakers[i].deleted) {
            caretakerHtml += Mustache.render(jQuery('#editCaretakerTemplate').html(), caretakers[i]);
        }
    }

    jQuery("#editCaretakerList").html(caretakerHtml);

    jQuery("#editCaretakerList form").css({
        display: "block"
    });

    jQuery("#secretNotification").val(notificationCaretaker.address);
    if (notificationCaretaker.encrypted) {
        jQuery("#notificationEncrypted").attr("checked", true);
        jQuery("#notificationUnencrypted").removeAttr("checked");
    } else {
        jQuery("#notificationEncrypted").removeAttr("checked");
        jQuery("#notificationUnencrypted").attr("checked", true);
    }

    connectCaretakerActions();
}

function deleteSecret() {
    jQuery("#deleteSecretModal").modal("show");
    jQuery("#deleteSecretConfirm").off().click(() => {
        jQuery("#deleteSecretConfirm").modal("hide");
        common.showProcessing();
        api.deleteSecret(state.secretId()).then(() => {
            document.location.reload();
        }).catch(() => {
            common.hideProcessing();
        })
    });
}

function showTab() {
    window.onbeforeunload = function (e)
    {
        if (anyChange()) {
            return 'You have unsaved changes. Are you sure you want to navigate off the page?';
        }
        return null;
    }

    if (!state.secretId()) {
        jQuery("#secretMenu").hide();
    } else {
        jQuery("#secretMenu").show();
    }

    if (readOnlySecret()) {
        jQuery("#secretContents").hide();
    } else {
        jQuery("#secretContents").show();
    }

    jQuery("#secretEditExit").off().click(function () {
        document.location.reload();
    });

    loadModules().then((Quill) => {
        applyCaretakers().then(() => {
            function updateFileList() {
                let items = '';

                const uploadedFiles = state.secret().uploadedFiles;
                for (let file in uploadedFiles) {
                    if (uploadedFiles.hasOwnProperty(file)) {
                        const fileId = encodeURIComponent(file);

                        let deleteStr;
                        if (readOnlySecret()) {
                            deleteStr = '';
                        } else {
                            deleteStr =
                                '<input type="button" class="listelement" value="X" data-itemid="' + fileId + '"/> ';
                        }

                        items += '<li class="list-group-item text-left">' +
                            deleteStr +
                            '<a href="#" data-itemid="' +
                            fileId +
                            '">' +
                            common.escapeHtml(file) +
                            '</a></li>';
                    }
                }

                if (lastZippedDocument == null) {
                    lastZippedDocument = state.secret().documentDelta;
                    if (lastZippedDocument) {
                        editor.setContents(JSON.parse(lastZippedDocument));
                    }
                }

                jQuery("#fileList").html(items);

                jQuery("#fileList input").off().on('click',
                    function () {
                        const file = decodeURIComponent(jQuery(this).attr("data-itemid"));
                        state.secret().removeFile(file);
                        updateZip();
                    });

                jQuery("#fileList a").on('click',
                    function () {
                        const file = decodeURIComponent(jQuery(this).attr("data-itemid"));
                        const fileData = state.secret().uploadedFiles[file];
                        const blob = new Blob([fileData]);
                        saveAs["saveAs"](blob, file);
                        return false;
                    });
            }

            function updateZip(successful) {
                if (!readOnlySecret()) {
                    lastZippedDocument = JSON.stringify(editor.getContents());
                    state.secret().documentDelta = lastZippedDocument;

                    updateFileList();

                    state.secret().rebuildZip()
                        .then(() => {
                            if (state.secret().dataSize > data.MAX_SIZE) {
                                common.hideProcessing();
                                updateButtons();
                            } else {
                                updateButtons();

                                if (successful) {
                                    successful();
                                }
                            }
                        })
                        .catch((err) => {
                            common.showError(err);
                            common.hideProcessing();
                            updateButtons();
                        });
                }
            }

            function handleFilesSelect(files) {
                if (!readOnlySecret()) {
                    animateProgress();

                    const promises = [];

                    for (let i = 0; i < files.length; i++) {
                        let file = files[i];
                        promises.push(state.secret().addFile(decodeURIComponent(file.name), file));
                    }

                    Promise.all(promises).then(() => updateZip()).catch((err) => {
                        common.showError(err);
                        common.hideProcessing();
                    })
                }
            }

            function handleFilesDrop(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                handleFilesSelect(evt.dataTransfer.files);
            }

            function handleDragOver(evt) {
                if (!readOnlySecret()) {
                    evt.stopPropagation();
                    evt.preventDefault();
                    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
                }
            }

            function publishChanges(missingKey) {
                updateStateCaretakers();
                let promises = [];
                if (state.secret().changed || state.secret().unlockPublicKey) {
                    promises.push(api.updateSecret(state.secretId(), state.secret().apiSecret)
                        .then(function() {
                            state.secret().unlockPublicKey = null;
                            caretakers.forEach((t) => {
                                t.unlockPublicKey = null;
                            });
                            state.secret().changed = false;
                        }));
                }
                promises.push(api.saveCaretakers(state.secretId(), state.caretakers())
                    .then((newCaretakers) => {
                        state.caretakers(newCaretakers);
                        return applyCaretakers();
                    })
                    .then(() => updateCaretakers()));

                Promise.all(promises)
                    .then(() => {
                        jQuery("#publishRequiredDialog").modal("hide");
                        if (missingKey) {
                            jQuery("#missingKeyModal").modal("show");
                            jQuery("#missingKeyDone").off().click(() => {
                                missingKey = false;
                                start.displayTab("key");
                                jQuery("#missingKeyModal").modal("hide");
                            });
                            jQuery("#missingKeyModal").on('hidden.bs.modal', function () {
                                if (missingKey) {
                                    state.dataKey(null);
                                    jQuery("#secretContents").slideUp();
                                }
                            })
                        }
                    })
                    .catch((err) => {
                        common.showError(err);
                    })
                    .then((err) => {
                        common.hideProcessing();
                        updateButtons();
                    });
            }

            function updateRequiredValueLabel() {
                const count = jQuery("#publishRequiredCount")
                jQuery("#publishRequiredValue")
                    .html("<b>" + count.val() + "</b> / <b>" + count.attr("max") + "</b>");
            }

            function nextExecute() {
                if (state.secretId()) {
                    if (!state.secret().unlockPublicKey && (!anyChange() && canPublish()) || state.secret().dataKeyDigest) {
                        if (state.secret().missingData)
                            throw new Error("Missing data key for publishing data");

                        const acceptedCaretakers = getAccepted();

                        jQuery("#publishRequiredCount")
                            .attr('min', 2)
                            .attr('max', acceptedCaretakers.length)
                            .attr('value', Math.ceil(acceptedCaretakers.length * 2 / 3))
                            .off()
                            .on("change", updateRequiredValueLabel);

                        jQuery("#publishRequiredMax")
                            .text(acceptedCaretakers.length);

                        jQuery("#publishRequireDone").off().click(() => {
                            common.showProcessing();

                            let missingDataKey;
                            if (!state.dataKey()) {
                                const dataKey = Buffer.from(nacl.randomBytes(32));
                                state.dataKey(dataKey);
                                missingDataKey = true;
                            }
                            const required = jQuery("#publishRequiredCount").val();

                            const shares = data.createShares(state.dataKey(), acceptedCaretakers.length, parseInt(required));

                            acceptedCaretakers.push(notificationCaretaker);
                            const dataKeys = data.createDataKeyMap(acceptedCaretakers);
                            acceptedCaretakers.pop();

                            for (let i = 0; i < acceptedCaretakers.length; i++) {
                                const caretaker = acceptedCaretakers[i];
                                const share = shares[i];
                                if (caretaker.unlock) {
                                    const keys = Object.assign({}, dataKeys);
                                    delete keys[caretaker.caretakerId];
                                    share.keys = keys;
                                }
                                caretaker.data = share;
                            }
                            notificationCaretaker.data = {};

                            state.secret().encryptWithDataKey();

                            publishChanges(missingDataKey);
                        });

                        updateRequiredValueLabel();

                        common.hideProcessing();
                        jQuery("#publishRequiredDialog").modal("show");
                    } else {
                        common.showProcessing();
                        publishChanges();
                    }
                } else {
                    updateStateCaretakers();
                    start.displayTab('secret-payment');
                    common.hideProcessing();
                }
            }

            jQuery("#secretEditNext").attr("disabled", true).off().click(function () {
                setTimeout(function () {
                        common.showProcessing();
                        if (!state.secret().missingData && lastZippedDocument !== JSON.stringify(editor.getContents())) {
                            updateZip(function () {
                                nextExecute();
                            });
                        } else {
                            nextExecute();
                        }
                    },
                    10);
            });

            if (!editor) {
                editor = new Quill('#editorContainer',
                    {
                        modules: {
                            toolbar: getToolbarOptions()
                        },
                        placeholder: 'Write document here...',
                        theme: 'snow'
                    });

                editor.on('selection-change',
                    function () {
                        if (!editor.getSelection()) {
                            updateZip();
                        }
                    });

                let dropZone = document.getElementById('dropZone');
                dropZone.addEventListener('dragover', handleDragOver, false);
                dropZone.addEventListener('drop', handleFilesDrop, false);

                let fileUpload = document.getElementById('fileUpload');
                fileUpload.addEventListener('change',
                    function (evt) {
                        handleFilesSelect(evt.target["files"]);
                    },
                    false);
            }

            jQuery("#secretTitle").off().on("change paste keyup", function () {
                state.secret().title = jQuery("#secretTitle").val();
                updateButtons();
            });

            if (readOnlySecret()) {
                jQuery("#addCaretaker").hide().off();
            } else {
                jQuery("#addCaretaker").show().off().click(() => {
                    if (caretakers.filter(i => !i.deleted).length < MAX_CARETAKERS) {
                        const caretaker = new data.Caretaker();
                        caretakers.push(caretaker);

                        jQuery("#editCaretakerList").append(Mustache.render(jQuery('#editCaretakerTemplate').html(), caretaker));

                        jQuery("#editCaretakerList form").slideDown();

                        connectCaretakerActions();
                    }
                });
            }

            jQuery("#secretNotification").off().on("change paste keyup", function () {
                notificationCaretaker.address = jQuery(this).val();
                if (notificationCaretaker.valid) {
                    jQuery(this).removeClass("invalidInput");
                } else {
                    jQuery(this).addClass("invalidInput");
                }
                updateButtons();
            });

            jQuery("#notificationEncrypted").off().on("change", function () {
                notificationCaretaker.encrypted = true;
                updateButtons();
            });

            jQuery("#notificationUnencrypted").off().on("change", function () {
                notificationCaretaker.encrypted = false;
                updateButtons();
            });

            jQuery("#secretTitle").val(state.secret().title);

            if (readOnlySecret()) {
                jQuery("#secretSendAll").off().hide();
            } else {
                jQuery("#secretSendAll").off().click(() => {
                    sendInvites(caretakers.filter(t => t.canInvite));
                });
            }

            jQuery("#extraPayment").off().click(() => {
                start.displayTab('secret-payment');
            });

            if (state.secret().payDate > 0) {
                const date = new Date(state.secret().payDate);
                jQuery("#extraPayment span").text("(Paid until " + date.toLocaleDateString() + ")")
            }

            jQuery("#deleteSecret").off().click(() => {
                deleteSecret();
            });

            updateFileList();
            updateCaretakers();
            updateButtons();
        })
    });
}

function applyCaretakers() {
    const caretakerMap = state.caretakers();
    if (caretakerMap == null) {
        caretakers = [];
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
    return data.caretakerListFromMap(caretakerMap).then((newCaretakers) => {
        notificationCaretaker = null;
        caretakers = newCaretakers.filter((t) => {
            if (t.notification) {
                notificationCaretaker = t;
                return false;
            }
            if (readOnlySecret()) {
                let ret = t.hasData;
                return ret;
            }
            return true;
        });
    });
}

function updateStateCaretakers() {
    const stateCaretakers = {};

    caretakers.forEach(function (caretaker) {
        let apiCaretaker = caretaker.apiCaretaker;
        if (apiCaretaker) {
            stateCaretakers[caretaker.caretakerId] = apiCaretaker;
        }
    });

    if (notificationCaretaker.address) {
        stateCaretakers[notificationCaretaker.caretakerId] = notificationCaretaker.apiCaretaker;
    }

    state.caretakers(stateCaretakers);
}

export default {
    showTab: showTab
}