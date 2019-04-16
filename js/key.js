import jQuery from 'jquery';
import qrcode from 'qrcode';

import common from './common';
import state from './state';
import start from './start';

function showTab() {
    const key = state.createKey();

    const siteUrl = state.siteLink();

    jQuery("#keySiteLink").text(siteUrl).attr("href", siteUrl);

    jQuery("#keyDump").html(key.replace(/(\/.=)/g, "<br/>$1"));

    qrcode.toCanvas(document.getElementById('keyQrcode'),
        key,
        function (error) {
            if (error) {
                common.showError(error);
            }
        });

    const keyType = jQuery("#keyType");
    if (state.dataKey()) {
        keyType.html(
            "You are the owner of this secret and you are retaining the data key which gives you access to read and update your own information.");

        jQuery("#removeDataAccess").show();
        jQuery("#removeDataAccessConfirm").off().click(function () {
            jQuery("#removeDataModal").modal('hide');
            state.dataKey(null);
            showTab();
        });
    } else {
        jQuery("#removeDataAccess").hide();

        if (state.caretakerId()) {
            keyType.text("You are a caretaker of this secret.");
        } else {
            keyType.text("You are the owner of this secret but do not have access to read or edit your own information.")
        }
    }

    jQuery("#secretKeyBack").off().click(function() {
        if (state.caretakerId()) {
            start.displayTab("caretaker-edit");
        } else {
            start.displayTab("secret-edit");
        }
    });
}

export default showTab