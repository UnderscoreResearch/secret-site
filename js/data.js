import nacl from 'tweetnacl';
import sharing from 'secret-sharing.js';

import state from "./state";
import common from "./common";

const MAX_SIZE = 1024 * 1024;
const MAX_FILE_SIZE = MAX_SIZE * 10;
const ENCRYPTION_OVERHEAR = 100;
const DEFAULT_DOCUMENT = '.delta';
const BEFORE_ENCRYPTION_SIZE_1K = 609;
const BEFORE_ENCRYPTION_SIZE_2K = 1360;

function loadModules() {
    return import(/* webpackChunkName: "edit" */ 'jszip').then(JSZip => {
        return JSZip.default;
    });
}

function splitKey(required, key) {
    return {
        required: required,
        bits: parseInt(key[0], 36),
        x: parseInt(key.substr(1, 2), 16),
        y: common.encodeBin(Buffer.from(key.substr(3), 'hex'))
    };
}

function combineKey(share) {
    var x = share.x.toString(16);
    while (x.length < share.bits / 4) {
        x = "0" + x;
    }
    return share.bits.toString(36) + x + common.decodeBin(share.y).toString("hex");
}

sharing.setRNG(function (bits) {
    const data = nacl.randomBytes(Math.ceil((bits)/ 8));

    let ret = "";
    for (let i = 0; ret.length - 1 < bits; i++) {
        for (let bit = 1; bit < 256 && ret.length - 1 < bits; bit = bit * 2) {
            if (data[i] & bit) {
                ret = "1" + ret;
            } else {
                ret = "0" + ret;
            }
        }
    }

    return ret;
});

function createShares(dataKey, shares, required) {
    return sharing.share(dataKey.toString("hex"), shares, required).map((t) => splitKey(required, t));
}

function combineShares(secrets) {
    return Buffer.from(sharing.combine(secrets.map((t) => combineKey(t))), 'hex');
}

function createDataKeyMap(caretakers) {
    const ret = {};

    caretakers.forEach((caretaker) => {
        let key = caretaker.addressDataKey;
        if (key) {
            ret[caretaker.caretakerId] = common.encodeBin(key);
        }
    });

    return ret;
}

export class Caretaker {
    #title;
    #publicKey;
    #address;
    #addressType;
    #unlock;
    #status;
    #caretaker;
    #notification;
    #encrypted;
    #caretakerId;
    changed;
    deleted;
    allowShare;
    pendingShare;

    constructor(caretakerId, secretPublicKey) {
        this.#caretaker = {
            addresses: []
        };
        if (caretakerId) {
            this.#caretakerId = caretakerId;
            this.#caretaker.secretPublicKey = secretPublicKey;
        } else {
            this.#caretakerId = common.encodeBin(nacl.randomBytes(16));
            this.#caretaker.created = true;
        }
        this.#unlock = true;
        this.#addressType = "EMAIL";
        this.#status = 'Unsent';
        this.#encrypted = true;
    }

    get status() {
        if (!this.#encrypted && !state.secret()) {
            return "Participating";
        } else if (this.#caretaker && this.#caretaker.publicKey) {
            if (this.#caretaker.publicKey == this.#caretaker.unlockPublicKey) {
                return "Unlocking";
            } else if (this.#caretaker.unlockData) {
                return "Submitted";
            } else if (this.#caretaker.data) {
                return "Participating";
            } else {
                return "Accepted";
            }
        } else {
            return this.#status;
        }
    }

    get addressDataKey() {
        if (state.caretakerId()) {
            return common.deriveKey(this.secretPublicKey, state.privateKey());
        }
        if (this.#notification && !this.#encrypted) {
            return null;
        }
        if (this.#publicKey) {
            return common.deriveKey(this.#publicKey, state.privateKey());
        }
        return null;
    }

    set status(val) {
        this.changed = true;
        this.#status = val;
    }

    get caretakerId() {
        return this.#caretakerId;
    }

    get publicKey() {
        return this.#publicKey;
    }

    get secretPublicKey() {
        return common.decodeBin(this.#caretaker.secretPublicKey);
    }

    set publicKey(val) {
        this.changed = true;
        this.#publicKey = val;
    }

    get title() {
        return this.#title;
    }

    set title(val) {
        if (!state.caretakerId()) {
            throw new Error("Tried to set title when not caretaker");
        }
        this.changed = true;
        this.#title = val;
    }

    get isReadOnly() {
        if (!this.#caretaker.data) {
            return false;
        }
        return !state.dataKey() && state.secret().encryptedWithDataKey;
    }

    get unlock() {
        return this.#unlock;
    }

    get isMail() {
        return this.#addressType === 'MAIL';
    }

    get canInvite() {
        return this.#address && (this.status === 'Invited' || this.#status == 'Unsent');
    }

    set unlock(val) {
        if (state.caretakerId()) {
            throw new Error("Tried to set unlock when caretaker");
        }
        this.changed = true;
        this.#unlock = val;
    }

    get fingerprint() {
        if (this.#publicKey) {
            return Buffer.from(this.#publicKey).slice(0, 8).toString("hex");
        }
        return null;
    }

    get notification() {
        return this.#notification;
    }

    set notification(val) {
        if (state.caretakerId()) {
            throw new Error("Tried to set notification when caretaker");
        }
        this.#notification = val;
    }

    get encrypted() {
        return this.#encrypted;
    }

    set encrypted(val) {
        if (state.caretakerId()) {
            throw new Error("Tried to set encrypted when caretaker");
        }
        this.changed = true;
        this.#encrypted = val;
    }

    get addressType() {
        return this.#addressType;
    }

    set addressType(val) {
        if (!state.caretakerId() && this.#publicKey && !this.#notification) {
            throw new Error("Tried to set addressType on accepted address when not caretaker");
        }
        this.changed = true;
        this.#addressType = val;
    }

    get address() {
        return this.#address;
    }

    get addressFormatted() {
        return common.escapeHtml(this.#address).replace(/\r?\n/g,"<br/>");;
    }

    set address(val) {
        if (!state.caretakerId() && this.#publicKey && !this.#notification) {
            throw new Error("Tried to set addressType on accepted address when not caretaker");
        }
        this.changed = true;
        this.#address = val;
    }

    get data() {
        if (common.encodeBin(state.caretaker().publicKey) !== common.encodeBin(this.publicKey)) {
            throw new Error("Tried to read data without caretaker");
        }
        if (this.#caretaker.data) {
            return common.decodeObject(common.decodeEncrypted(this.#caretaker.data,
                this.secretPublicKey, state.privateKey()));
        }
        return null;
    }

    get hasData() {
        if (!this.#caretaker) {
            return false;
        }
        return this.#caretaker.data;
    }

    set data(val) {
        if (state.caretakerId()) {
            throw new Error("Tried to set data from caretaker");
        }

        this.changed = true;
        this.#caretaker.data = common.encodeEncryptedAsymmetric(common.encodeObject(BEFORE_ENCRYPTION_SIZE_2K, val),
            state.privateKey(), this.#publicKey);
    }
    
    get hasDataKey() {
        if (!this.#caretaker)
            return false;
        return this.#caretaker.dataKey;
    }
    
    get dataKey() {
        if (common.encodeBin(state.caretaker().publicKey) !== common.encodeBin(this.publicKey)) {
            throw new Error("Tried to read dataKey without caretaker");
        }
        if (!this.#caretaker || !this.#caretaker.dataKey || !this.unlockPublicKey)
            return null;
        return common.decodeEncrypted(this.#caretaker.dataKey,
            this.unlockPublicKey, state.privateKey());
    }
    
    set dataKey(val) {
        if (common.encodeBin(state.caretaker().publicKey) !== common.encodeBin(this.unlockPublicKey)) {
            throw new Error("Tried to set dataKey without being unlocking caretaker");
        }
        
        this.changed = true;
        this.#caretaker.dataKey = common.encodeEncryptedAsymmetric(val, state.privateKey(), this.#publicKey);
    }

    get unlockData() {
        if (common.encodeBin(state.caretaker().publicKey) !== this.#caretaker.unlockPublicKey) {
            throw new Error("Tried to read unlockPublicKey from wrong caretaker");
        }
        if (this.#caretaker.unlockData) {
            return common.decodeObject(common.decodeEncrypted(this.#caretaker.unlockData,
                this.publicKey, state.privateKey()));
        }
        return null;
    }

    get hasUnlockData() {
        if (!this.#caretaker) {
            return false;
        }
        return this.#caretaker.unlockData;
    }

    get unlockPublicKey() {
        if (this.#caretaker && this.#caretaker.unlockPublicKey) {
            return common.decodeBin(this.#caretaker.unlockPublicKey);
        }
        return null;
    }

    set unlockPublicKey(val) {
        if (!val) {
            this.#caretaker.unlockPublicKey = null;
        } else {
            this.#caretaker.unlockPublicKey = common.encodeBin(val);
        }
    }

    set unlockData(val) {
        if (!state.caretakerId() || !this.#caretaker.unlockPublicKey) {
            throw new Error("Tried to set unlockData from secret or without having unlock requested");
        }

        this.changed = true;
        this.#caretaker.unlockData = common.encodeEncryptedAsymmetric(common.encodeObject(BEFORE_ENCRYPTION_SIZE_2K, val),
            state.privateKey(), this.#caretaker.unlockPublicKey);
    }

    get created() {
        return !this.#caretaker || this.#caretaker.created;
    }

    get empty () {
        if (!this.#address)
            return true;

        return this.#address.trim().length == 0;
    }

    get valid() {
        if (this.empty) {
            return this.created || this.#notification;
        }
        if (this.#addressType !== 'MAIL') {
            return common.validateEmail(this.#address, false);
        }
    }

    get apiCaretaker() {
        if (this.#caretaker.created) {
            if (!this.#address || this.deleted) {
                return null;
            }
        }

        let addressPrivateKey;
        let encryptionKey;
        let addressData;
        let addressBytes = Buffer.from(this.#address, 'utf8');

        if (this.#notification) {
            let addressPublicKey;
            if (this.#caretaker.secretData) {
                addressPublicKey = common.decodeBin(this.#publicKey);
                let secretData = common.decodeEncrypted(this.#caretaker.secretData, state.publicKey(), state.privateKey());
                if (!secretData) {
                    return null;
                }
                const data = common.decodeObject(secretData);
                addressPrivateKey = common.decodeBin(data.privateKey);
            } else {
                let keyPair = nacl.sign.keyPair();

                addressPrivateKey = keyPair.secretKey;
                addressPublicKey = keyPair.publicKey;
                this.#publicKey = addressPublicKey;
            }

            if (this.#encrypted) {
                encryptionKey = common.deriveKey(state.publicKey(), addressPrivateKey);
            } else {
                encryptionKey = null;
            }
            addressData = common.encodeEncryptedSymmetric(addressBytes, addressPrivateKey, encryptionKey);
        } else if (this.#publicKey) {
            if (state.caretakerId()) {
                addressPrivateKey = state.privateKey();
                encryptionKey = common.deriveKey(this.#caretaker.secretPublicKey, state.privateKey());
                addressData = common.encodeEncryptedSymmetric(addressBytes, addressPrivateKey, encryptionKey);
            } else {
                encryptionKey = common.deriveKey(this.#caretaker.publicKey, state.privateKey());
            }
        } else {
            addressPrivateKey = state.privateKey();
            encryptionKey = state.publicKey();
            addressData = common.encodeEncryptedAsymmetric(addressBytes, addressPrivateKey, encryptionKey);
        }

        if (addressPrivateKey) {

            const address = {
                address: addressData,
                addressDigest: common.encodeBin(nacl.hash(addressBytes)),
                addressType: this.#addressType
            };

            for (let i = 0; i < this.#caretaker.addresses.length; i++) {
                let type = this.#caretaker.addresses[i].addressType;
                if (type === "MAIL" || type === "EMAIL") {
                    this.#caretaker.addresses.splice(i, 1);
                    break;
                }
            }

            this.#caretaker.addresses.splice(0, 0, address);
        }

        if (!this.#caretaker.created) {
            this.#caretaker.changed = this.changed;
            this.#caretaker.deleted = this.deleted;
        } else {
            this.#caretaker.changed = false;
        }

        if (state.caretakerId()) {
            let caretakerData = common.encodeObject(BEFORE_ENCRYPTION_SIZE_1K, {
                title: this.#title
            });

            this.#caretaker.publicKey = common.encodeBin(this.#publicKey);
            this.#caretaker.caretakerData = common.encodeEncryptedAsymmetric(caretakerData, state.privateKey(), state.publicKey());
            this.#caretaker.addressKeyDigest = common.encodeBin(nacl.hash(nacl.hash(encryptionKey)));
        } else {
            let secretData;
            if (this.#notification) {
                this.#caretaker.publicKey = common.encodeBin(this.#publicKey);
                if (this.#encrypted) {
                    this.#caretaker.caretakerData =
                        common.encodeEncryptedAsymmetric(common.encodeObject(BEFORE_ENCRYPTION_SIZE_1K, {}),
                            addressPrivateKey,
                            this.#publicKey);
                    this.#caretaker.addressKeyDigest = common.encodeBin(nacl.hash(nacl.hash(encryptionKey)));
                } else {
                    delete this.#caretaker["addressKeyDigest"];
                }
                secretData = common.encodeObject(BEFORE_ENCRYPTION_SIZE_1K, {
                    notification: true,
                    privateKey: common.encodeBin(addressPrivateKey)
                });
            } else {
                secretData = common.encodeObject(BEFORE_ENCRYPTION_SIZE_1K, {
                    status: this.#status,
                    unlock: this.#unlock
                });
                this.#caretaker.addressKeyDigest = common.encodeBin(nacl.hash(nacl.hash(encryptionKey)));
            }

            this.#caretaker.secretData = common.encodeEncryptedAsymmetric(secretData, state.privateKey(), state.publicKey());
        }
        if (encryptionKey) {
            let addressPublicKey;
            if (this.publicKey) {
                addressPublicKey = this.publicKey;
            } else {
                addressPublicKey = state.secret().publicKey;
            }

            this.#caretaker.addresses.forEach(addr => {
                if (!addr.addressDigest) {
                    const address = common.decodeEncrypted(addr.address, addressPublicKey, encryptionKey)
                    addr.addressDigest = common.encodeBin(nacl.hash(address));
                }
            });
        }

        const ret = Object.assign({}, this.#caretaker);
        delete ret["secretPublicKey"];
        if (!ret.unlockData) {
            delete ret["unlockPublicKey"];
        }
        return ret;
    }

    load(caretakerId, apiCaretaker) {
        return new Promise((resolve, reject) => {
            let encryptionKey;

            this.#unlock = false;
            this.#status = null;
            this.#notification = false;
            this.#title = null;
            this.#addressType = null;
            this.#address = null;
            this.#publicKey = null;
            this.#caretaker = null;

            if (state.caretakerId()) {
                if (state.caretakerId() === caretakerId) {
                    if (apiCaretaker.caretakerData) {
                        let caretakerData = common.decodeEncrypted(apiCaretaker.caretakerData, apiCaretaker.publicKey, state.privateKey());
                        if (!caretakerData) {
                            reject(new Error("Failed to unpack caretakerData"));
                            return;
                        }

                        caretakerData = common.decodeObject(caretakerData);
                        if (caretakerData) {
                            this.#title = caretakerData.title;
                        }
                    }

                    encryptionKey = common.deriveKey(apiCaretaker.secretPublicKey, state.privateKey());
                } else {
                    let key = state.caretaker().data.keys[caretakerId];
                    if (key) {
                        encryptionKey = common.decodeBin(key);
                    }
                }
            } else {
                if (apiCaretaker.secretData) {
                    let secretData = common.decodeEncrypted(apiCaretaker.secretData, state.publicKey(), state.privateKey());
                    if (!secretData) {
                        reject(new Error("Failed to unpack secretData"));
                        return;
                    }

                    secretData = common.decodeObject(secretData);
                    if (secretData && secretData.notification) {
                        this.#notification = true;
                    } else {
                        this.#unlock = secretData.unlock;
                        this.#status = secretData.status;
                    }
                }

                if (apiCaretaker.publicKey) {
                    encryptionKey = common.deriveKey(apiCaretaker.publicKey, state.privateKey());
                } else {
                    encryptionKey = state.privateKey();
                }
            }

            let addressPublicKey;
            if (apiCaretaker.publicKey) {
                addressPublicKey = common.decodeBin(apiCaretaker.publicKey);
            } else if (state.secret()) {
                addressPublicKey = state.secret().publicKey;
            } else {
                addressPublicKey = apiCaretaker.secretPublicKey;
            }

            if (apiCaretaker.publicKey) {
                this.#publicKey = common.decodeBin(apiCaretaker.publicKey);
            }
            this.#encrypted = common.isEncrypted(apiCaretaker.addresses[0].address);

            this.#caretaker = apiCaretaker;
            this.#caretakerId = caretakerId;

            for (let i = 0; i < apiCaretaker.addresses.length; i++) {
                let address = apiCaretaker.addresses[i];
                if (address.addressType === 'MAIL' || address.addressType === 'EMAIL') {
                    this.#addressType = address.addressType;
                    resolve(common.decodeCaretakerAddress(addressPublicKey, encryptionKey, address)
                        .then((addr) => {
                            this.#address = addr;
                        }));
                }
            }

            resolve(this);
        });
    }
}

export function caretakerListFromMap(caretakerMap) {
    const caretakers = [];
    const promises = [];

    for (let caretakerId in caretakerMap) {
        if (caretakerMap.hasOwnProperty(caretakerId)) {
            let apiCaretaker = caretakerMap[caretakerId];
            if (state.secret() || apiCaretaker.publicKey) {
                const caretaker = new Caretaker();
                promises.push(caretaker.load(caretakerId, apiCaretaker));
                caretakers.push(caretaker);
            }
        }
    }

    return Promise.all(promises)
        .then(() => caretakers.sort((a, b) => a.address.localeCompare(b.address)));
}

export class Secret {
    changed = false;
    #uploadedFiles = {};
    #secret = {};
    #encryptedWithDataKey;
    #dataSize = 0;
    #title;
    #activeZip = null;

    constructor() {
        this.#secret.publicKey = common.encodeBin(state.publicKey());
    }

    updatePublishData() {
        this.changed = true;

        if (state.caretakerId()) {
            throw new Error("Tried to update publishData from caretaker");
        }

        const publishDataBin = common.encodeObject(BEFORE_ENCRYPTION_SIZE_1K, {
            title: this.#title
        });

        this.#secret.publishData = common.encodeEncryptedAsymmetric(publishDataBin, state.privateKey(), state.publicKey());
    }

    rebuildZip() {
        this.#activeZip = "placeholder";

        return new Promise((resolve, reject) => {
            loadModules().then((JSZip) => {
                const zip = new JSZip();
                this.#activeZip = zip;

                if (this.#secret == null) {
                    reject(new Error("Tried to update secret before it was properly loaded"));
                }
                if (state.caretakerId()) {
                    reject(new Error("Tried to update data from caretaker"));
                }

                for (let file in this.#uploadedFiles) {
                    if (this.#uploadedFiles.hasOwnProperty(file)) {
                        zip.file(file, this.#uploadedFiles[file]);
                    }
                }

                return zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: {
                        level: 9
                    }
                }).then((blob) => {
                    if (this.#activeZip == zip) {
                        let size = blob.size + ENCRYPTION_OVERHEAR;

                        if (size > MAX_SIZE) {
                            this.#dataSize = size + ENCRYPTION_OVERHEAR;
                            return;
                        }

                        const fileReader = new FileReader();

                        fileReader.onload = () => {
                            if (fileReader.error) {
                                this.#activeZip = null;
                                reject(fileReader.error());
                            } else if (this.#activeZip === zip) {
                                let data;
                                if (state.secret() && this.#encryptedWithDataKey) {
                                    data = common.encodeEncryptedSymmetric(Buffer.from(fileReader.result), state.privateKey(), state.dataKey());
                                } else {
                                    data = common.encodeEncryptedAsymmetric(Buffer.from(fileReader.result), state.privateKey(), state.publicKey());
                                }
                                this.#secret.data = data;
                                this.#dataSize = data.length;
                                this.#activeZip = null;
                                resolve();
                            } else {
                                this.#activeZip = null;
                            }
                        };

                        fileReader.readAsArrayBuffer(blob);
                    }
                });
            }).catch((err) => reject(err));
        });
    }

    encryptWithDataKey() {
        this.changed = true;

        if (!state.dataKey()) {
            throw new Error("Can't encode data without data key");
        }
        if (!this.#encryptedWithDataKey) {
            let decodedData = common.decodeEncrypted(this.#secret.data, state.publicKey(), state.privateKey());

            if (!decodedData)
                throw new Error("Failed to unpack data");

            this.#encryptedWithDataKey = true;
            this.#secret.dataKeyDigest = common.encodeBin(nacl.hash(nacl.hash(state.dataKey())));
            this.#secret.data = common.encodeEncryptedSymmetric(decodedData, state.privateKey(), state.dataKey());
        }
    }

    get encryptedWithDataKey() {
        return this.#encryptedWithDataKey;
    }

    load(apiSecret) {
        this.#secret = null;

        return new Promise((resolve, reject) => {
            let unencryptedData;
            let missingDataKey;

            try {
                unencryptedData = common.decodeEncrypted(apiSecret.data, apiSecret.publicKey, state.privateKey());
            } catch (err) {
                if (state.dataKey()) {
                    this.#encryptedWithDataKey = true;
                    unencryptedData = common.decodeEncrypted(apiSecret.data, apiSecret.publicKey, state.dataKey());
                } else if (!state.caretakerId()) {
                    missingDataKey = true;
                    this.#encryptedWithDataKey = true;
                }
            }

            if (!unencryptedData && !missingDataKey) {
                reject(new Error("Data is invalid"));
                return;
            }

            let title;
            if (!state.caretakerId() && apiSecret.publishData) {
                let publishData = common.decodeEncrypted(apiSecret.publishData, state.publicKey(), state.privateKey());
                if (!publishData) {
                    reject(new Error("Publishing data is invalid"));
                }

                publishData = common.decodeObject(publishData);

                title = publishData.title;
            }
            this.#dataSize = apiSecret.data.length;

            if (unencryptedData) {
                loadModules().then((JSZip) => {
                    const zip = new JSZip();

                    resolve(zip.loadAsync(unencryptedData).then(() => {
                        const files = {};
                        const promises = [];

                        zip.forEach((relativePath, zipEntry) => {
                            if (!zipEntry.directory) {
                                let promise;
                                if (relativePath === DEFAULT_DOCUMENT) {
                                    promise = zipEntry.async("string");
                                } else {
                                    promise = zipEntry.async("blob");
                                }
                                promises.push(promise.then((data) => {
                                    files[relativePath] = data;
                                }));
                            }
                        });

                        return Promise.all(promises).then(() => {
                            this.#uploadedFiles = files;
                            this.#secret = apiSecret;
                            this.#title = title;
                            this.changed = false;
                        });
                    }));
                }).catch((err) => reject(err));
            } else {
                this.#uploadedFiles = null;
                this.#secret = apiSecret;
                this.#title = title;
                this.changed = false;
                resolve();
            }
        });
    }

    addFile(fileName, contents) {
        this.changed = true;
        const placeholder = nacl.randomBytes(32);
        this.#activeZip = placeholder;

        return new Promise((resolve, reject) => {
            if (typeof contents == 'string') {
                this.#uploadedFiles[fileName] = Buffer.from(contents, 'utf8');
                resolve();
            } else {
                const size = contents.size + ENCRYPTION_OVERHEAR;
                if (size > MAX_FILE_SIZE) {
                    if (this.#activeZip == placeholder) {
                        this.#activeZip = null;
                    }
                    resolve();
                } else {
                    const fileReader = new FileReader();

                    fileReader.onload = () => {
                        if (fileReader.error) {
                            if (this.#activeZip == placeholder) {
                                this.#activeZip = null;
                            }
                            reject(fileReader.error());
                        } else {
                            this.#uploadedFiles[fileName] = fileReader.result;
                            resolve();
                        }
                    };

                    fileReader.readAsArrayBuffer(contents);
                }
            }
        });
    }

    removeFile(fileName) {
        if (this.#uploadedFiles[fileName]) {
            this.changed = true;
            delete this.#uploadedFiles[fileName];
        }
    }

    get uploadedFiles() {
        let files = {};
        if (this.#uploadedFiles) {
            for (let name in this.#uploadedFiles) {
                if (name !== DEFAULT_DOCUMENT && this.#uploadedFiles.hasOwnProperty(name)) {
                    files[name] = this.#uploadedFiles[name];
                }
            }
        }
        return files;
    }

    get documentDelta() {
        if (!this.#uploadedFiles) {
            return null;
        }
        return this.#uploadedFiles[DEFAULT_DOCUMENT];
    }

    get missingData() {
        return !this.#uploadedFiles;
    }

    set documentDelta(val) {
        this.changed = true;
        return this.addFile(DEFAULT_DOCUMENT, val);
    }

    get processing() {
        return this.#activeZip !== null;
    }

    get title() {
        return this.#title;
    }

    get dataSize() {
        return this.#dataSize;
    }

    get payDate() {
        return this.#secret.payDate;
    }

    set payDate(val) {
        this.#secret.payDate = val;
    }

    get publicKey() {
        return common.decodeBin(this.#secret.publicKey);
    }

    get unlockPublicKey() {
        if (this.#secret.unlockPublicKey) {
            return common.decodeBin(this.#secret.unlockPublicKey);
        }
        return null;
    }

    set unlockPublicKey(val) {
        if (!val) {
            this.#secret.unlockPublicKey = null;
        } else {
            this.#secret.unlockPublicKey = common.encodeBin(val);
        }
    }

    set title(val) {
        this.#title = val;

        this.updatePublishData();
    }

    get apiSecret() {
        const ret = Object.assign({}, this.#secret);
        delete ret["payDate"];
        delete ret["unlockPublicKey"];
        return ret;
    }
}

export default {
    Caretaker: Caretaker,
    Secret: Secret,
    MAX_SIZE: MAX_SIZE,
    caretakerListFromMap: caretakerListFromMap,
    createDataKeyMap: createDataKeyMap,
    createShares: createShares,
    combineShares: combineShares
}