import jQuery from 'jquery';
import nacl from 'tweetnacl';
import ed2curve from 'ed2curve';

"use strict"; // Start of use strict

function encodeBin(data) {
    if (typeof data == "string") {
        data = Buffer.from(data, 'utf8');
    } else if (!Buffer.isBuffer(data)) {
        data = Buffer.from(data);
    }
    return data.toString('base64')
        .replace(/=+$/, "")
        .replace(/\//g, "_")
        .replace(/\+/g, '-');
}

const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}

function decodeBin(data) {
    if (typeof data !== "string") {
        data = data.toString();
    }
    return Buffer.from(data, 'base64');
}

function decodeEncryptedEnvelope(encoded) {
    if (typeof encoded == "string") {
        encoded = decodeBin(encoded);
    }

    if (encoded[0] !== 1) {
        return null;
    }
    const nonceSize = encoded[1];

    if (nonceSize !== 0 && nonceSize !== nacl.box.nonceLength) {
        return null;
    }

    const nonceStart = 2;
    const nonceEnd = nonceSize + nonceStart;
    const publicKeySize = encoded[nonceEnd];

    if (publicKeySize !== 0 && publicKeySize !== nacl.box.publicKeyLength) {
        return null;
    }

    const publicKeyStart = nonceEnd + 1;
    const publicKeyEnd = publicKeyStart + publicKeySize;
    const signatureSize = encoded[publicKeyEnd];

    if (signatureSize !== nacl.sign.signatureLength) {
        return null;
    }

    const signatureStart = publicKeyEnd + 1;
    const signatureEnd = signatureSize + signatureStart;

    return {
        nonce: encoded.slice(nonceStart, nonceEnd),
        publicKey: encoded.slice(publicKeyStart, publicKeyEnd),
        signature: encoded.slice(signatureStart, signatureEnd),
        message: encoded.slice(signatureEnd)
    };
}

function isEncrypted(encoded) {
    const result = decodeEncryptedEnvelope(encoded);
    if (result && result.nonce.length == 0) {
        return false;
    }
    return true;
}

function decodeEncrypted(encoded, signatureKey, privateKey) {
    const result = decodeEncryptedEnvelope(encoded);

    if (typeof signatureKey == "string") {
        signatureKey = decodeBin(signatureKey);
    }
    if (typeof privateKey == "string") {
        privateKey = decodeBin(privateKey);
    }

    if (!nacl.sign.detached.verify(result.message, result.signature, signatureKey)) {
        return null;
    }

    if (result.nonce.length > 0) {
        if (result.publicKey.length > 0) {
            return nacl.box.open(result.message,
                result.nonce,
                result.publicKey,
                ed2curve.convertSecretKey(privateKey));
        }
        return nacl.secretbox.open(result.message, result.nonce, privateKey);
    } else {
        return result.message;
    }
}

function encodeEncryptionEnvelope(result) {
    let ret = new Uint8Array(4 +
        result.nonce.length +
        result.publicKey.length +
        result.signature.length +
        result.message.length);

    ret[0] = 1;
    let pos = 1;

    ret[pos] = result.nonce.length;
    pos++;
    ret.set(result.nonce, pos);
    pos += result.nonce.length;

    ret[pos] = result.publicKey.length;
    pos++;
    ret.set(result.publicKey, pos);
    pos += result.publicKey.length;

    ret[pos] = result.signature.length;
    pos++;
    ret.set(result.signature, pos);
    pos += result.signature.length;

    ret.set(result.message, pos);

    return encodeBin(ret);
}

function encodeEncryptedSymmetric(message, signatureKey, privateKey) {
    var result;
    if (typeof message == "string") {
        message = Buffer.from(message, "utf8");
    }
    if (typeof signatureKey == "string") {
        signatureKey = decodeBin(signatureKey);
    }
    if (typeof privateKey == "string") {
        privateKey = decodeBin(privateKey);
    }


    let nonce;
    let c;
    if (privateKey) {
        nonce = nacl.randomBytes(nacl.box.nonceLength);

        c = nacl.secretbox(message, nonce, privateKey);
    } else {
        c = message;
        nonce = Buffer.from("", "utf8");
    }
    result = {
        message: c,
        nonce: nonce,
        publicKey: Buffer.from("", "utf8"),
        signature: nacl.sign.detached(c, signatureKey)
    }

    return encodeEncryptionEnvelope(result);
}

function encodeEncryptedAsymmetric(message, signatureKey, publicKey) {
    var result;
    if (typeof message == "string") {
        message = Buffer.from(message, "utf8");
    }
    if (typeof signatureKey == "string") {
        signatureKey = decodeBin(signatureKey);
    }
    if (typeof publicKey == "string") {
        publicKey = decodeBin(publicKey);
    }

    let c;
    let p;
    let nonce;
    if (publicKey) {
        nonce = nacl.randomBytes(nacl.box.nonceLength);
        let privateKey = ed2curve.convertSecretKey(nacl.sign.keyPair().secretKey);

        p = nacl.box.keyPair.fromSecretKey(privateKey).publicKey;
        privateKey = nacl.box.before(ed2curve.convertPublicKey(publicKey), privateKey);

        c = nacl.secretbox(message, nonce, privateKey);
    } else {
        c = message;
        p = nonce = Buffer.from("", "utf8");
    }
    result = {
        nonce: nonce,
        publicKey: p,
        message: c,
        signature: nacl.sign.detached(c, signatureKey)
    };

    return encodeEncryptionEnvelope(result);
}

let errorHandling = true;

function enableErrorHandling(val) {
    errorHandling = val;
}


function showError(error) {
    console.log(error);
    jQuery('html, body').scrollTop(0);
    jQuery("#errorText").text(error);
    jQuery("#errorRow").slideDown();
}

const emailRe = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function validateEmail(email, allowEmpty = true) {
    email = email.trim();
    if (email.length == 0) {
        return allowEmpty;
    }
    return emailRe.test(email);
}

function hideError() {
    jQuery("#errorRow").slideUp();
}

let isProcessing = false;

function showProcessing() {
    isProcessing = true;
    jQuery("#busyProcessing").modal('show');
}

function hideProcessing() {
    isProcessing = false;
    jQuery("#busyProcessing").modal('hide');
}

(function () {
    jQuery("#busyProcessing").on('hidden.bs.modal', function () {
        if (isProcessing) {
            showProcessing();
        }
    }).on('shown.bs.modal', function () {
        if (!isProcessing) {
            hideProcessing();
        }
    });

    window.addEventListener('unhandledrejection', function (event) {
        if (errorHandling) {
            showError(event.reason);
            hideProcessing();
        }
    });

    window.addEventListener('error', function (event) {
        if (errorHandling) {
            showError(event.error);
            hideProcessing();
        }
    });
})();

function createCaretakerAddress(signingKey, encryptionKey, caretaker) {
    return new Promise(function(resolve) {
        let addressBytes = Buffer.from(caretaker.address, 'utf8');
        resolve({
            address: encodeEncryptedSymmetric(addressBytes, signingKey, encryptionKey),
            addressDigest: encodeBin(nacl.hash(addressBytes)),
            addressType: caretaker.addressType
        });
    });
}

function decodeCaretakerAddress(publicKey, encryptionKey, address) {
    return new Promise(function(resolve, reject) {
        let decodedAddress = decodeEncrypted(address.address, publicKey, encryptionKey);
        if (!decodedAddress) {
            reject(new Error("Invalid address"));
        } else {
            resolve(Buffer.from(decodedAddress).toString('utf8'));
        }
    });
}

function deriveKey(publicKey, privateKey) {
    if (typeof publicKey == "string") {
        publicKey = decodeBin(publicKey);
    }
    if (typeof privateKey == "string") {
        privateKey = decodeBin(privateKey);
    }

    return nacl.box.before(ed2curve.convertPublicKey(publicKey), ed2curve.convertSecretKey(privateKey));
}

function updatePaymentInformation(paymentInformation) {
    if (paymentInformation) {
        jQuery(".btc-address").text(paymentInformation["BTC"].token);
        jQuery(".eth-address").text(paymentInformation["ETH"].token);
        jQuery(".btc-amount").text(paymentInformation["BTC"].amount);
        jQuery(".eth-amount").text(paymentInformation["ETH"].amount);
        jQuery(".usd-amount").text(paymentInformation["USD"].amount);
    }
}

function encodeObject(size, obj) {
    let val = Buffer.from(JSON.stringify(obj), 'utf8');
    if (size > val.length) {
        let padding = Buffer.alloc(size - val.length, ' ', 'utf8');
        val = Buffer.concat([val, padding]);
    }
    return val;
}

function decodeObject(val) {
    return JSON.parse(Buffer.from(val).toString('utf8'));
}

export default {
    escapeHtml: escapeHtml,
    encodeBin: encodeBin,
    encodeEncryptedSymmetric: encodeEncryptedSymmetric,
    encodeEncryptedAsymmetric: encodeEncryptedAsymmetric,
    validateEmail: validateEmail,
    decodeBin: decodeBin,
    decodeObject: decodeObject,
    encodeObject: encodeObject,
    decodeEncrypted: decodeEncrypted,
    isEncrypted: isEncrypted,
    deriveKey: deriveKey,
    showError: showError,
    hideError: hideError,
    showProcessing: showProcessing,
    hideProcessing: hideProcessing,
    enableErrorHandling: enableErrorHandling,
    createCaretakerAddress: createCaretakerAddress,
    decodeCaretakerAddress: decodeCaretakerAddress,
    updatePaymentInformation: updatePaymentInformation
};
