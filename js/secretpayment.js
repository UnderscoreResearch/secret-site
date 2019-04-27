import jQuery from 'jquery';
import CardValidator from 'card-validator';
import InputMask from 'inputmask';

import common from './common';
import data from './data';
import api from './api';
import state from './state';
import start from './start';

function paymentEmptied() {
    return {
        ccNumber: false,
        ccCode: false,
        ccExpiration: false,
        ccEmail: false,
        ccPostalCode: false
    };
}

let paymentStatus = paymentEmptied();

function validCardInput() {
    let ret = false;
    for (let kind in paymentStatus)
        if (paymentStatus.hasOwnProperty(kind)) {
            ret = true;
            if (!paymentStatus[kind])
                return false;
        }
    return ret;
}

function showTab() {
    function selectedPaymentType() {
        return jQuery("input[name=paymentOption]:checked").val();
    }

    function updateButtons(enabled) {
        let button = jQuery("#secretPaymentNext");
        if (enabled) {
            common.hideProcessing();
            button.removeAttr('disabled');
        }
        else {
            button.attr("disabled", true);
        }
    }

    function validateEmail() {
        let email = jQuery("#ccEmail");
        if (!common.validateEmail(email.val(), false)) {
            email.addClass("invalidInput");
            paymentStatus["ccEmail"] = false;
        } else {
            email.removeClass("invalidInput");
            paymentStatus["ccEmail"] = true;
        }

        updateButtons(validCardInput());
    }

    function validateExpiration() {
        let expiration = jQuery("#ccExpiration");
        const result = CardValidator.expirationDate(expiration.val());
        if (!result.isValid) {
            expiration.addClass("invalidInput");
            paymentStatus["ccExpiration"] = false;
        } else {
            expiration.removeClass("invalidInput");
            paymentStatus["ccExpiration"] = true;
        }

        updateButtons(validCardInput());
    }

    function validatePostalCode() {
        let postalCode = jQuery("#ccPostalCode");
        const result = CardValidator.postalCode(postalCode.val());
        if (!result.isValid) {
            postalCode.addClass("invalidInput");
            paymentStatus["ccPostalCode"] = false;
        } else {
            postalCode.removeClass("invalidInput");
            paymentStatus["ccPostalCode"] = true;
        }

        updateButtons(validCardInput());
    }

    function validateCode() {
        let code = jQuery("#ccCode");
        if (code.val().length > 0) {
            const number = jQuery("#ccNumber");
            const cardResult = CardValidator.number(number.val());
            let result;
            if (cardResult.card && cardResult.card.code && cardResult.card.code.size) {
                result = CardValidator.cvv(code.val(), cardResult.card.code.size);
            } else {
                result = CardValidator.cvv(code.val());
            }
            if (!result.isValid) {
                code.addClass("invalidInput");
                paymentStatus["ccCode"] = false;
            } else {
                code.removeClass("invalidInput");
                paymentStatus["ccCode"] = true;
            }

            updateButtons(validCardInput());
        }
    }

    function clearCardType() {
        const elem = jQuery("#ccNumberLabel");
        elem
            .removeClass("american-express")
            .removeClass("discover")
            .removeClass("visa")
            .removeClass("mastercard");
    }

    function validateNumber() {
        const number = jQuery("#ccNumber");
        const result = CardValidator.number(number.val());
        paymentStatus["ccNumber"] = result.isValid;
        if (!result.isValid) {
            number.addClass("invalidInput");
        } else {
            number.removeClass("invalidInput");
        }
        clearCardType();

        if (result.card) {
            let mask = '';
            for (let i = 0; i < result.card.lengths[0]; i++) {
                if (result.card.gaps.filter(t => t == i).length > 0) {
                    mask += " ";
                }
                mask += "9";
            }
            InputMask(mask, {
                placeholder: '',
                showMaskOnHover: false,
                showMaskOnFocus: false,
            }).mask(jQuery(this));

            jQuery("#ccNumberLabel").addClass(result.card.type);

            if (result.card.code) {
                let mask = "";
                let placeholder = result.card.code.name;
                for (let i = 0; i < result.card.code.size; i++) {
                    mask += "9";
                }
                InputMask(mask, {
                    placeholder: '',
                    showMaskOnHover: false,
                    showMaskOnFocus: false,
                }).mask(jQuery("#ccCode"));

                jQuery("#ccCode").attr("placeholder", placeholder.trim());

                validateCode();
            }
        }

        updateButtons(validCardInput());
    }

    function displayCardWithEmail(notificationEmail) {
        jQuery("#paymentCardRow").slideDown();
    }

    function displayCard() {
        updateButtons(validCardInput());

        displayCardWithEmail();
    }

    function clearInput() {
        jQuery("#ccCode,#ccEmail,#ccPostalCode,#ccExpiration,#ccNumber,#couponCode,#paymentTransaction").val("");

        clearCardType();

        paymentStatus = paymentEmptied();
    }

    function executePayment(type, token) {
        const secret = state.secret().apiSecret;
        secret.paymentType = type;
        secret.paymentToken = token;

        if (state.secretId()) {
            api.updateSecret(state.secretId(), secret)
                .then(() => {
                    clearInput();
                    updateButtons(true);
                    const estimateDate = Math.max(Date.now(), state.secret().payDate);
                    state.secret().payDate = estimateDate + 366 * 24 * 60 * 60 * 1000;
                    start.displayTab("secret-edit");
                })
                .catch((err) => {
                    common.showError(err);
                });
        } else {
            api.createSecret(secret)
                .then((secretId) => {
                    clearInput();
                    state.secret().changed = false;
                    state.secretId(secretId);

                    return api.saveCaretakers(secretId, state.caretakers())
                        .then((data) => {
                            state.caretakers(data);
                            start.displayTab("key");
                        })
                        .catch((err) => {
                            common.showError(err);
                        })
                })
                .catch((err) => {
                    common.showError(err);
                })
                .then(() => {
                    updateButtons(true);
                    common.hideProcessing();
                });
        }
    }

    const paymentTransaction = jQuery("#paymentTransaction");
    const couponCode = jQuery("#couponCode");

    function validateBlockchainInput() {
        const validTransaction = /^\s*(0x)?[0-9a-fA-F]{64}\s*$/;
        if (selectedPaymentType().length !== 3) {
            updateButtons(false);
        }
        else {
            updateButtons(validTransaction.exec(paymentTransaction.val()));
        }
    }

    function validateCouponInput() {
        updateButtons(couponCode.val().trim().length > 0);
    }

    jQuery(".paymentOption").off().change(function() {
        if (selectedPaymentType() === 'USD') {
            jQuery("#paymentTransactionRow").slideUp();
            jQuery("#paymentCouponRow").slideUp();
            displayCard();
        }
        else if (selectedPaymentType() == 'CPN') {
            jQuery("#paymentCouponRow").slideDown();
            jQuery("#paymentCardRow").slideUp();
            jQuery("#paymentTransactionRow").slideUp();
            validateCouponInput();
        } else {
            jQuery("#paymentCouponRow").slideUp();
            jQuery("#paymentCardRow").slideUp();
            jQuery("#paymentTransactionRow").slideDown();
            validateBlockchainInput();
        }
    });

    paymentTransaction.off().on('change paste keyup', validateBlockchainInput);
    couponCode.off().on('change paste keyup', validateCouponInput);

    if (selectedPaymentType() === 'USD') {
        jQuery("#paymentTransactionRow").hide();
        jQuery("#paymentCouponRow").hide();
        jQuery("#paymentCardRow").show();
    }
    else {
        if (selectedPaymentType() === 'CPN') {
            jQuery("#paymentCouponRow").show();
            jQuery("#paymentTransactionRow").hide();
        } else {
            jQuery("#paymentCouponRow").hide();
            jQuery("#paymentTransactionRow").show();
        }
        jQuery("#paymentCardRow").hide();
        validateBlockchainInput();
    }

    jQuery("#secretPaymentBack").off().click(function() {
        start.displayTab("secret-edit");
    });

    jQuery("#secretPaymentNext").off().click(function() {
        common.showProcessing();
        updateButtons(false);
        const type = selectedPaymentType();
        if (type === 'USD') {
            const token = JSON.stringify({
                email: jQuery("#ccEmail").val().trim(),
                number: jQuery("#ccNumber").val().replace(/\s+/g,""),
                exp: jQuery("#ccExpiration").val().trim(),
                code: jQuery("#ccCode").val().trim(),
                zip: jQuery("#ccPostalCode").val().trim(),
            });
            executePayment(type, token);
        }
        else if (type == 'CPN') {
            executePayment(type, couponCode.val().trim());
        } else {
            executePayment(type, paymentTransaction.val().trim());
        }
    });

    jQuery("#ccEmail").off().on('change paste keyup', validateEmail);
    jQuery("#ccNumber").off().on('change paste keyup', validateNumber);
    jQuery("#ccExpiration").off().on('change paste keyup', validateExpiration);
    jQuery("#ccCode").off().on('change paste keyup', validateCode);
    jQuery("#ccPostalCode").off().on('change paste keyup', validatePostalCode);

    InputMask("9999 9999 9999 9999", {
        placeholder: '',
        showMaskOnHover: false,
        showMaskOnFocus: false,
    }).mask(jQuery("#ccNumber"));

    InputMask("99/99", {
        placeholder: '',
        showMaskOnHover: false,
        showMaskOnFocus: false,
    }).mask(jQuery("#ccExpiration"));

    InputMask("9999", {
        placeholder: '',
        showMaskOnHover: false,
        showMaskOnFocus: false,
    }).mask(jQuery("#ccCode"));

    if (state.caretakers()) {
        data.caretakerListFromMap(state.caretakers())
            .then((caretakers) => {
                caretakers.forEach((caretaker) => {
                    if (caretaker.notification && !caretaker.encrypted) {
                        jQuery("#ccEmail").val(caretaker.address);
                        validateEmail();
                    }
                });
            });
    }
}

export default showTab