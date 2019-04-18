import jQuery from 'jquery';
import nacl from 'tweetnacl';

import state from './state';
import common from './common';

import endpointParser from './endpointparser'

let apiEndpoints = endpointParser();
let sendCount = 0;

const MAX_TRIES = 3;

let timestampDrift = 0;

function getError(result, status) {
    if (result.responseJSON && result.responseJSON.message) {
        return result.responseJSON.message;
    } else if (result.responseText) {
        return result.responseText;
    } else if (result.message) {
        return result.message;
    } else if (result.status == 404) {
        return "Resource not found";
    } else if (result.status) {
        return result.status + " " + status;
    } else {
        return "Failed API call: " + result + " " + status;
    }
}

function ajaxCallRetry(req) {
    let method = req.type;
    if (!method) {
        method = "GET";
    } else {
        method = method.toUpperCase();
    }

    const timestamp = (Date.now() + timestampDrift) + "";

    if (!req.tryCount) {
        req.tryCount = 1;
    } else {
        req.tryCount++;
    }

    const msg = Buffer.from(method + timestamp + req.signingUrl, 'utf8');

    let privateKey;
    if (req.privateKey) {
        privateKey = req.privateKey;
    } else {
        privateKey = state.privateKey();
    }

    if (privateKey) {
        let sig = nacl.sign.detached(msg, privateKey);

        let auth = common.encodeBin(JSON.stringify({
            t: timestamp,
            s: common.encodeBin(sig)
        }));

        req.headers = {
            "x-yoursharedsecret-ownership": auth
        };
    }

    jQuery.ajax(req);
}

function ajaxCall(req, baseUrl) {
    
    const url = req.url;
    if (!baseUrl) {
        if (url.endsWith("/send") && req.type === "post") {
            baseUrl = apiEndpoints[sendCount % apiEndpoints.length];
            sendCount++;
        } else {
            baseUrl = apiEndpoints[0];
        }
    }

    req.dataType = "json";
    req.contentType = 'application/json';
    const queryStringIndex = url.indexOf('?');
    if (queryStringIndex >= 0)
        req.signingUrl = url.substring(0, queryStringIndex);
    else
        req.signingUrl = url;


    req.url = baseUrl + url;
    req.processData = false;
    if (req.data && typeof req.data !== 'string') {
        req.data = JSON.stringify(req.data);
    }

    return new Promise(function (resolve, reject) {
        req.success = function(data, textStatus, xhr) {
            if (req.type === 'head') {
                resolve(xhr.status);
            } else {
                resolve(data);
            }
        };
        req.tryCount = 0;
        req.error = function(callbackRet, txt) {
            if (req.tryCount < MAX_TRIES) {
                setTimeout(function() {
                    ajaxCallRetry(req);
                }, 500 * 2 ^ req.tryCount);
            } else {
                reject(getError(callbackRet, txt));
            }
        };
        
        ajaxCallRetry(req);
    });
}

function paymentInformation() {
    let keyPair = nacl.sign.keyPair();
    
    return ajaxCall({
        url: "/payments/" + common.encodeBin(keyPair.publicKey),
        privateKey: keyPair.secretKey
    }).then(function (data) {
        return data.options;
    });
}

function createSecret(secret) {
    secret.publicKey = common.encodeBin(state.publicKey());
    return ajaxCall({
        url: "/secrets",
        type: "post",
        data: secret
    }).then((data) => {
        return data.secretId;
    });
}

function updateSecret(secretId, secret) {
    if (secret.publicKey) {
        delete secret["publicKey"];
    }
    return ajaxCall({
        url: "/secrets/" + secretId,
        type: "put",
        data: secret
    });
}

function getSecret(secretId, dataKey, caretakerId) {
    let url = "/secrets/" + secretId;
    if (dataKey) {
        url += "?dataKeyDigest=" + common.encodeBin(nacl.hash(dataKey))
        if (caretakerId) {
            url += "&caretakerId=" + caretakerId;
        }
    }
    return ajaxCall({
        url: url
    }).then((data) => {
        return data;
    });
}

function createCaretaker(secretId, caretakerId, caretaker) {
    return ajaxCall({
        type: "post",
        url: "/caretakers/" + secretId + "/" + caretakerId,
        data: caretaker
    }).then(function (data) {
        return data;
    });
}

function updateCaretaker(secretId, caretakerId, caretaker) {
    delete caretaker["deleted"];
    delete caretaker["changed"];
    return ajaxCall({
        type: "put",
        url: "/caretakers/" + secretId + "/" + caretakerId,
        data: caretaker
    }).then((data) => {
        return data;
    });
}

function unlockSecret(secretId, caretakerId, keyDigests) {
    return ajaxCall({
        type: "post",
        url: "/secrets/" + secretId + "/" + caretakerId + "/unlock",
        data: { addressKeyDigests: keyDigests }
    }).then((data) => {
        return data;
    });
}

function shareSecret(secretId, caretakerId, sharedKeys) {
    return ajaxCall({
        type: "post",
        url: "/secrets/" + secretId + "/" + caretakerId + "/share",
        data: { sharedDataKeys: sharedKeys }
    });
}

function deleteSecret(secretId) {
    return ajaxCall({
        type: "delete",
        url: "/secrets/" + secretId
    });
}

function deleteCaretaker(secretId, caretakerId) {
    return ajaxCall({
        type: "delete",
        url: "/caretakers/" + secretId + "/" + caretakerId
    }).then((data) => {
        return data;
    });
}

function send(secretId, caretakerId, message) {
    return ajaxCall({
        type: "post",
        url: "/caretakers/" + secretId + "/" + caretakerId + "/send",
        data: message
    }).then((data) => {
        return data;
    });
}

function getCaretakers(secretId) {
    return ajaxCall({
        url: "/caretakers/" + secretId
    }).then((data) => {
        return data.caretakers;
    });
}

function getCaretaker(secretId, caretakerId) {
    return ajaxCall({
        url: "/caretakers/" + secretId + "/" + caretakerId
    });
}

function checkCaretaker(secretId, caretakerId, publicKey) {
    return ajaxCall({
        type: "head",
        url: "/caretakers/" + secretId + "/" + caretakerId + "?secretPublicKey=" + common.encodeBin(publicKey)
    });
}

function saveCaretakers(secretId, caretakers) {
    const promises = [];

    const result = {};

    for (let caretakerId in caretakers) {
        if (caretakers.hasOwnProperty(caretakerId)) {
            const caretaker = caretakers[caretakerId];

            if (caretaker.deleted) {
                promises.push(deleteCaretaker(secretId, caretakerId));
            } else {
                if (caretaker.created) {
                    delete caretaker["created"];
                    promises.push(createCaretaker(secretId, caretakerId, caretaker));
                } else if (caretaker.changed) {
                    delete caretaker["changed"];
                    promises.push(updateCaretaker(secretId, caretakerId, caretaker));
                }
                result[caretakerId] = caretaker;
            }
        }
    }

    return Promise.all(promises).then(function () {
        return result;
    });
}

(function () {
    const start = Date.now();
    jQuery.ajax(
        {
            url: apiEndpoints[0] + "/servicetime",
            dataType: 'json',
            error: function (result, status) {
                common.showError(getError(result, status));
            },
            success: function(data) {
                const estimatedMiddle = (start + Date.now()) / 2;
                timestampDrift = Math.round(data.serviceTime - estimatedMiddle);
                
                paymentInformation().then(function (data) {
                    state.paymentInformation(data);
                    common.updatePaymentInformation(data);
                });
            }
        });
})();

export default {
    paymentInformation: paymentInformation,
    createSecret: createSecret,
    getSecret: getSecret,
    updateSecret: updateSecret,
    deleteSecret: deleteSecret,
    unlockSecret: unlockSecret,
    shareSecret: shareSecret,
    checkCaretaker: checkCaretaker,
    getCaretakers: getCaretakers,
    getCaretaker: getCaretaker,
    saveCaretakers: saveCaretakers,
    updateCaretaker: updateCaretaker,
    send: send,
    baseUrl: apiEndpoints[0]
}