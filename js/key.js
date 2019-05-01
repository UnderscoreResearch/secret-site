import jQuery from 'jquery';
import qrcode from 'qrcode';
import common from './common';
import camera from './camera';
import state from './state';
import start from './start';

function goBack() {
    jQuery("#validateKeyModal").modal("hide");

    if (state.caretakerId()) {
        start.displayTab("caretaker-edit");
    } else {
        start.displayTab("secret-edit");
    }
}

function validateKey(validatedKey) {
    jQuery("#validateKeyModal").off().on('hidden.bs.modal', function () {
        camera.stopScanner();
        jQuery("#keyUrlContainer,#keyQrcode").fadeTo("slow", 1);
        jQuery("#keyUrlContainer,#keyQrcode").css({
            visibility: "visible"
        });
    });

    jQuery("#validateKeyConfirm").off().click(function () {
        const enteredKey = jQuery("#validatePrivateKey").val().trim();
        if (validatedKey === enteredKey) {
            state.unvalidatedKey(false);
            goBack();
        } else {
            common.showError("Key did not match");
        }
    });

    camera.connectCamera("#validate-camera-overlay", "#validate-qrscan", function (content) {
        if (validatedKey == content) {
            state.unvalidatedKey(false);
            goBack();
        } else {
            common.showError("Incorrect key scanned");
        }
    });

    jQuery("#validateKeyModal").modal('show');
    jQuery("#keyUrlContainer,#keyQrcode").fadeTo("slow", 0);
}

function showTab() {
    const key = state.createKey();

    const siteUrl = state.siteLink() + "#s";

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
        if (state.unvalidatedKey()) {
            validateKey(state.createKey());
        } else {
            goBack();
        }
    });
}

export default showTab