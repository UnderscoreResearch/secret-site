import nacl from 'tweetnacl';

import common from './common';

let privateKey;
let dataKey;
let address;
let secretId;
let caretakerId;
let secret;
let caretaker;
let secretPublicKey;
let caretakers;
let title;
let paymentInformation;

export function parseLink(location) {
    const parsingRe = /(?:#|^)s=([^\/]+)(?:\/p=([^\/]+))?(?:\/c=([^\/]+))?(?:\/a=([^\/]+))?(?:\/d=([^\/]+))?(?:\/u=([^\/]+))?(?:\/t=([^\/]+))?$/;

    secret = null;

    if (location) {
        const result = location.match(parsingRe);
        if (result) {
            secretId = result[1];
            if (result[2]) {
                privateKey = common.decodeBin(result[2]);
            } else {
                privateKey = null;
            }
            caretakerId = result[3];
            if (result[4]) {
                address = Buffer.from(common.decodeBin(result[4])).toString('utf8');
            } else {
                address = null;
            }
            if (result[5]) {
                dataKey = common.decodeBin(result[5]);
            } else {
                dataKey = null;
            }
            if (result[6]) {
                secretPublicKey = common.decodeBin(result[6]);
            } else {
                secretPublicKey = null;
            }
            if (result[7]) {
                title = Buffer.from(common.decodeBin(result[7])).toString('utf8');;
            } else {
                title = null;
            }
            return true;
        }
    }
    secretId = null;
    privateKey = null;
    caretakerId = null;
    address = null;
    dataKey = null;
    title = null;
    secretPublicKey = null;
    return false;
}

function siteLink() {
    const url = window.location.href;
    const hash = url.indexOf('#');
    if (hash >= 0) {
        return url.substr(0, hash);
    }
    return url;
}

function createLink() {
    return siteLink() + "#" + createKey();
}

function createKey() {
    let ret = "s=" + secretId;
    if (privateKey) {
        ret += "/p=" + common.encodeBin(privateKey);
    }
    if (caretakerId) {
        ret += "/c=" + caretakerId;
    }
    if (dataKey) {
        ret += "/d=" + common.encodeBin(dataKey);
    }
    return ret;
}

export default {
    privateKey: function (v) {
        if (typeof v !== 'undefined') {
            privateKey = v;
        } else {
            return privateKey;
        }
    },
    dataKey: function (v) {
        if (typeof v !== 'undefined') {
            dataKey = v;
        } else {
            return dataKey;
        }
    },
    address: function (v) {
        if (typeof v !== 'undefined') {
            address = v;
        } else {
            return address;
        }
    },
    publicKey: function () {
        if (privateKey) {
            return nacl.sign.keyPair.fromSecretKey(privateKey).publicKey;
        }
        return null;
    },
    secretId: function (v) {
        if (typeof v !== 'undefined') {
            secretId = v;
        } else {
            return secretId;
        }
    },
    caretakerId: function (v) {
        if (typeof v !== 'undefined') {
            caretakerId = v;
        } else {
            return caretakerId;
        }
    },
    secret: function (v) {
        if (typeof v !== 'undefined') {
            secret = v;
        } else {
            return secret;
        }
    },
    secretPublicKey: function (v) {
        if (typeof v !== 'undefined') {
            secretPublicKey = v;
        } else {
            return secretPublicKey;
        }
    },
    caretaker: function (v) {
        if (typeof v !== 'undefined') {
            caretaker = v;
        } else {
            return caretaker;
        }
    },
    caretakers: function (v) {
        if (typeof v !== 'undefined') {
            caretakers = v;
        } else {
            return caretakers;
        }
    },
    title: function (v) {
        if (typeof v !== 'undefined') {
            title = v;
        } else {
            return title;
        }
    },
    paymentInformation: function (v) {
        if (typeof v !== 'undefined') {
            paymentInformation = v;
        } else {
            return paymentInformation;
        }
    },
    parseLink: parseLink,
    createLink: createLink,
    createKey: createKey,
    siteLink: siteLink
};

if (window.location.hash) {
    if (parseLink(window.location.hash)) {
        window.history.replaceState(null, "Your Shared Secret", "/#s");
    }
}