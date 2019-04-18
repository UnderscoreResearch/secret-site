import jQuery from 'jquery';

import common from './common';
import state from './state';
import api from './api';
import Mustache from 'mustache';
import qrcode from 'qrcode';

function formatText(txt) {
    return common.escapeHtml(txt).replace(/\r?\n/g,"<br/>");
}

function firstLine(txt) {
    let ind = txt.indexOf('\n');
    if (ind >= 0)
        return txt.substring(0, ind);
    return txt;
}

function baseUrl() {
    let url = window.location.href;
    let ind = url.indexOf('#');
    if (ind >= 0)
        url = url.substring(0, ind);
    if (!url.endsWith("/"))
        url += "/";
    return url;
}

function displayUrl(url) {
    return url.replace(/\//g, "/<br/>");
}

function showDialog(title, type, caretakers, sendCallback, doneCallback) {
    jQuery("#sendMessageModal").modal("show");

    const initialMessage = window.localStorage.getItem(state.secretId());

    if (initialMessage) {
        jQuery("#sendMessageTextarea").val(initialMessage);
    } else {
        jQuery("#sendMessageTextarea").val("");
    }

    if (typeof initialMessage === "string" && initialMessage.length === 0) {
        jQuery("#sendMessageSave").removeAttr("checked");
    } else {
        jQuery("#sendMessageSave").attr("checked", true);
    }


    let recipients = "";
    let anyMail;

    caretakers.forEach((caretaker) => {
        recipients += "<li>" + common.escapeHtml(firstLine(caretaker.address)) + "</li>";
        anyMail |= caretaker.isMail;
    });

    if (anyMail)
        jQuery("#sendMailIndicator").show();
    else
        jQuery("#sendMailIndicator").hide();

    jQuery("#sendMessageRecipients").html(recipients);

    jQuery("#sendMessageBtn").off().click(function() {
        const message = jQuery("#sendMessageTextarea").val();
        if (jQuery("#sendMessageSave").is(":checked")) {
            window.localStorage.setItem(state.secretId(), message);
        } else {
            window.localStorage.setItem(state.secretId(), "");
        }

        common.showProcessing();

        let publicKey;
        if (state.secret()) {
            publicKey = common.encodeBin(state.secret().publicKey);
        } else {
            publicKey = common.encodeBin(state.caretaker().secretPublicKey);
        }

        let promises = [];

        let email;

        caretakers.forEach(caretaker => {
            if (caretaker.addressType == 'MAIL') {
                if (!email) {
                    email = "<html><body style=\"font-family: Verdana, Geneva, sans-serif;\">";
                }

                let emailTemplate;
                let parameters;
                let url;

                const htmlTitle = common.escapeHtml(title);
                const htmlMessage = formatText(message);

                let qrPromise;

                if (type === "INVITE") {
                    url = "#s=" + state.secretId() +
                        "/c=" + caretaker.caretakerId +
                        "/a=" + common.encodeBin(caretaker.address) +
                        "/u=" + publicKey;
                    if (title)
                        url += "/t=" + common.encodeBin(title)

                    qrPromise = qrcode.toDataURL(baseUrl() + url);

                    emailTemplate = jQuery('#inviteMailTemplate').html();
                    parameters = {
                        title: htmlTitle,
                        message: htmlMessage,
                        address: formatText(caretaker.address),
                        url: baseUrl() + url,
                        displayUrl: baseUrl() + displayUrl(url),
                        baseurl: baseUrl()
                    };
                } else {
                    url = baseUrl() + "#s";

                    qrPromise = qrcode.toDataURL(url);

                    if (type == 'UNLOCK')
                        emailTemplate = jQuery('#unlockMailTemplate').html();
                    else
                        emailTemplate = jQuery('#shareMailTemplate').html();
                    
                    parameters = {
                        title: htmlTitle,
                        message: htmlMessage,
                        address: formatText(caretaker.address),
                        baseurl: baseUrl(),
                        url: url
                    };
                }

                promises.push(qrPromise.then((data) => {
                    parameters.qrcode = data;
                    email += Mustache.render(emailTemplate, parameters);
                    return sendCallback(caretaker);
                }));
            } else {
                promises.push(api.send(
                    state.secretId(),
                    caretaker.caretakerId,
                    {
                        address: caretaker.address,
                        sendType: type,
                        title: title,
                        message: message
                    }
                ).then(() => {
                    return sendCallback(caretaker);
                }));
            }
        });

        Promise.all(promises)
            .then(() => {
                return doneCallback()
            })
            .then(() => {
                common.hideProcessing();
                jQuery("#sendMessageModal").modal("hide");
            })
            .then(() => {
                if (email) {
                    email += "</body></html>";

                    let newWindow = window.open("");
                    newWindow.document.write(email);
                    setTimeout(() => newWindow.print(), 50);
                }
            })
            .catch((err) => {
                common.showError(err);
                common.hideProcessing();
            });
    });
}

export default {
    showDialog: showDialog
}