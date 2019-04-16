import jQuery from 'jquery';
import scriptjs from 'scriptjs';

import common from './common';
import data from './data';
import api from './api';
import state from './state';
import start from './start';

let paymentForm;
let paymentStatus = {};

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
            jQuery("#ccEmail").addClass("invalidInput");
            paymentStatus["ccEmail"] = false;
        } else {
            jQuery("#ccEmail").removeClass("invalidInput");
            paymentStatus["ccEmail"] = true;
        }
        updateButtons(validCardInput());
    }

    function displayCardWithEmail(notificationEmail) {
        common.showProcessing();
        scriptjs('https://js.squareup.com/v2/paymentform', function() {
            function createPaymentForm(address) {
                const data = JSON.parse(address);

                common.enableErrorHandling(false);
                paymentForm = new SqPaymentForm({
                    applicationId: data.applicationId,
                    locationId: data.locationId,
                    inputClass: 'form-control',
                    cardNumber: {
                        elementId: 'ccNumber',
                        placeholder: '• • • •  • • • •  • • • •  • • • •'
                    },
                    cvv: {
                        elementId: 'ccCode',
                        placeholder: 'CVV'
                    },
                    expirationDate: {
                        elementId: 'ccExpiration',
                        placeholder: 'MM/YY'
                    },
                    postalCode: {
                        elementId: 'ccPostalCode',
                        placeholder: '12345'
                    },
                    callbacks: {
                        cardNonceResponseReceived: function (err, nonce) {
                            if (err) {
                                common.hideProcessing();
                                let str = 'Payment processing failed:\n';
                                err.forEach(e => {
                                    switch(e.field) {
                                        case "cardNumber":
                                            jQuery("#ccNumber").addClass("invalidInput");
                                            break;
                                        case "cvv":
                                            jQuery("#ccCode").addClass("invalidInput");
                                            break;
                                        case "expirationDate":
                                            jQuery("#ccExpiration").addClass("invalidInput");
                                            break;
                                        case "postalCode":
                                            jQuery("#ccPostalCode").addClass("invalidInput");
                                            break;
                                    }
                                    str += e.message + ":\n";
                                });
                                common.showError(str);

                                updateButtons(true);
                            } else {
                                executePayment('USD', JSON.stringify({
                                    nonce: nonce,
                                    email: jQuery("#ccEmail").val()
                                }));
                            }
                        },
                        inputEventReceived: function(event) {
                            if (event.eventType === "focusClassAdded") {
                                const elem = jQuery("#" + event.elementId);
                                if (event.currentState.isPotentiallyValid) {
                                    elem.removeClass("invalidInput");
                                } else {
                                    elem.addClass("invalidInput");
                                }
                            } else if (event.eventType === "focusClassRemoved") {
                                const elem = jQuery("#" + event.elementId);
                                if (event.currentState.isCompletelyValid) {
                                    elem.removeClass("invalidInput");
                                } else {
                                    elem.addClass("invalidInput");
                                }
                            } else if (event.eventType === "cardBrandChanged") {
                                const elem = jQuery("#ccNumberLabel");
                                elem
                                    .removeClass("americanExpress")
                                    .removeClass("discover")
                                    .removeClass("visa")
                                    .removeClass("masterCard");
                                elem.addClass(event.cardBrand);
                            }
                            paymentStatus[event.field] = event.currentState.isCompletelyValid;

                            updateButtons(validCardInput());
                        },
                        paymentFormLoaded: function () {
                            jQuery("#paymentCardRow").slideDown();
                            paymentForm.recalculateSize();
                            common.hideProcessing();

                            updateButtons(validCardInput());

                            // This is to eat Square error.
                            setTimeout(() => {
                                common.enableErrorHandling(true);
                            }, 10000);
                        }
                    }
                });
                paymentForm.build();
            }

            if (SqPaymentForm.isSupportedBrowser()) {
                if (!paymentForm) {
                    if (!state.paymentInformation()) {
                        api.paymentInformation()
                            .then((data) => createPaymentForm(data.USD.token));
                    } else {
                        createPaymentForm(state.paymentInformation()["USD"]["token"]);
                    }
                } else {
                    jQuery("#paymentCardRow").slideDown();
                    common.hideProcessing();
                }

                jQuery("#ccEmail").val(notificationEmail);

                if (jQuery("#ccEmail").off().on('change paste keyup', validateEmail).val()) {
                    validateEmail();
                } else {
                    paymentStatus["ccEmail"] = false;
                }
            } else {
                common.showError("Unsupported browser for payments");
            }
        });
    }

    function displayCard() {
        updateButtons(false);

        if (state.caretakers()) {
            data.caretakerListFromMap(state.caretakers())
                .then((caretakers) => {
                    let notificationEmail;
                    caretakers.forEach((caretaker) => {
                        if (caretaker.notification && !caretaker.encrypted) {
                            notificationEmail = caretaker.address;
                        }
                    });
                    displayCardWithEmail(notificationEmail);
                });
        } else {
            displayCardWithEmail();
        }
    }

    function executePayment(type, token) {
        const secret = state.secret().apiSecret;
        secret.paymentType = type;
        secret.paymentToken = token;

        if (state.secretId()) {
            api.updateSecret(state.secretId(), secret)
                .then(() => {
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
            jQuery(".ccField").removeClass("invalidInput");
            paymentForm.requestCardNonce();
        }
        else if (type == 'CPN') {
            executePayment(type, couponCode.val().trim());
        } else {
            executePayment(type, paymentTransaction.val().trim());
        }
    });

}

export default showTab