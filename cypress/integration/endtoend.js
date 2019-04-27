import nacl from 'tweetnacl';
import 'cypress-file-upload';

import common from '../../js/common';

function validateCommon() {
    cy.wait(500);

    cy.get("#secretTitle").should("have.value", "Test Title");
    cy.get(".ql-editor").should("have.text", "Test Document");
    cy.get('#secretNotification').should('have.value', 'test@yoursharedsecret.com');
    cy.get("#notificationUnencrypted").should('not.be.checked');
    cy.get("#notificationEncrypted").should('be.checked');
    cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddress').should('have.value', 'test1@yoursharedsecret.com')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddress').should('have.value', 'test2@yoursharedsecret.com')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddress').should('have.value', 'test3@yoursharedsecret.com')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddress').should('have.value', 'test4@yoursharedsecret.com')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddress').should('have.value', 'test5@yoursharedsecret.com')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddressType').should('have.value', 'EMAIL')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddressType').should('have.value', 'EMAIL')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddressType').should('have.value', 'EMAIL')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddressType').should('have.value', 'EMAIL')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddressType').should('have.value', 'EMAIL')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerUnlock').should('be.checked')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerUnlock').should('be.checked')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerUnlock').should('be.checked')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerUnlock').should('not.be.checked')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerUnlock').should('be.checked')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerDelete').should('be.enabled')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerDelete').should('be.enabled')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerDelete').should('be.enabled')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerDelete').should('be.enabled')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerDelete').should('be.enabled')

    cy.get('#fileList .list-group-item:nth-child(1) input').should('be.enabled')
    cy.get('#fileList .list-group-item:nth-child(2) input').should('be.enabled')

    cy.get('#fileList .list-group-item:nth-child(1) a').should('have.text', "dropped.txt")
    cy.get('#fileList .list-group-item:nth-child(2) a').should('have.text', "input.txt")
}

function validateSecretContentsBeforeAccept(status) {
    validateCommon();

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerStatus').should('have.text', "Invited")
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerStatus').should('have.text', "Invited")
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerStatus').should('have.text', "Invited")
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerStatus').should('have.text', "Invited")
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerStatus').should('have.text', "Invited")

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerFingerprint').should('not.have.text')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerFingerprint').should('not.have.text')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerFingerprint').should('not.have.text')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerFingerprint').should('not.have.text')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerFingerprint').should('not.have.text')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerResend').should('exist');
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerResend').should('exist');
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerResend').should('exist');
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerResend').should('exist');
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerResend').should('exist');

    cy.get("#secretEditNext").should("be.disabled");
    cy.get("#secretEditNext").should("have.text", "Update");
}

function validateSecretContentsBeforePublish(status) {
    validateCommon();

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerStatus').should('have.text', "Accepted")
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerStatus').should('have.text', "Accepted")
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerStatus').should('have.text', "Accepted")
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerStatus').should('have.text', "Accepted")
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerStatus').should('have.text', "Invited")

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddress').should('not.be.disabled')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddressType').should('not.be.disabled')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerResend').should('exist');

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerFingerprint').should('not.have.text')

    cy.get("#secretEditNext").should("not.be.disabled");
    cy.get("#secretEditNext").should("have.text", "Publish");
}

function validateSecretContentsAfterPublish(status) {
    validateCommon();

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerStatus').should('have.text', "Participating")
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerStatus').should('have.text', "Participating")
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerStatus').should('have.text', "Participating")
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerStatus').should('have.text', "Participating")
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerStatus').should('have.text', "Invited")

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddress').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddress').should('not.be.disabled')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddressType').should('be.disabled')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddressType').should('not.be.disabled')

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerResend').should('not.exist');
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerResend').should('exist');

    cy.get('.secretCaretakerRow:nth-child(1) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(2) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(3) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(4) .caretakerFingerprint').should('not.be.empty')
    cy.get('.secretCaretakerRow:nth-child(5) .caretakerFingerprint').should('not.have.text')

    cy.get("#secretEditNext").should("not.be.disabled");
    cy.get("#secretEditNext").should("have.text", "Publish");
}

describe('End to end', function() {

    it('Full end to end', function() {
        cy.visit('/#s')

        // First we create secret

        cy.get('#newSecretButton').click()

        cy.get('#secretTitle').click()

        cy.get('#secretTitle').type('Test Title')

        cy.get('.ql-editor').click()

        cy.get('.ql-editor').type('Test Document')

        cy.get('#dropZone').upload([{
            fileContent: "dropped",
            fileName: "dropped.txt",
            mimeType: "text/plain"
        }], {
            subjectType: 'drag-n-drop'
        });

        cy.get('#fileUpload').upload([{
            fileContent: "input",
            fileName: "input.txt",
            mimeType: "text/plain"
        }], {
            subjectType: 'input'
        });

        cy.wait(500);
        cy.get('#secretNotification').click()
        cy.get('#secretNotification').type('test@yoursharedsecret.com')

        let caretakers = [];

        cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddress').click()
        cy.get('.secretCaretakerRow:nth-child(1) .caretakerAddress').type('test1@yoursharedsecret.com')
        cy.get('.secretCaretakerRow:nth-child(1)').should('have.attr', 'data-itemid');
        cy.get('.secretCaretakerRow:nth-child(1)').then(elem => caretakers.push(elem.attr("data-itemid")));

        cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddress').click()
        cy.get('.secretCaretakerRow:nth-child(2) .caretakerAddress').type('test2@yoursharedsecret.com')
        cy.get('.secretCaretakerRow:nth-child(2)').should('have.attr', 'data-itemid');
        cy.get('.secretCaretakerRow:nth-child(2)').then(elem => caretakers.push(elem.attr("data-itemid")));

        cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddress').click()
        cy.get('.secretCaretakerRow:nth-child(3) .caretakerAddress').type('test3@yoursharedsecret.com')
        cy.get('.secretCaretakerRow:nth-child(3)').should('have.attr', 'data-itemid');
        cy.get('.secretCaretakerRow:nth-child(3)').then(elem => caretakers.push(elem.attr("data-itemid")));

        cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddress').click()
        cy.get('.secretCaretakerRow:nth-child(4) .caretakerAddress').type('test4@yoursharedsecret.com')
        cy.get('.secretCaretakerRow:nth-child(4) .caretakerUnlock').click()
        cy.get('.secretCaretakerRow:nth-child(4)').should('have.attr', 'data-itemid');
        cy.get('.secretCaretakerRow:nth-child(4)').then(elem => caretakers.push(elem.attr("data-itemid")));

        cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddress').click()
        cy.get('.secretCaretakerRow:nth-child(5) .caretakerAddress').type('test5@yoursharedsecret.com')

        // Go to the payment screen and enter payment details

        cy.wait(500);
        cy.get('#secretEditNext').click()
        cy.wait(500);
        cy.get('#paymentOptionCard').click()

        cy.get("#ccEmail",{
            timeout: 5000
        }).should("be.visible");
        cy.get("#ccEmail")
            .should('have.value', 'test@yoursharedsecret.com');

        cy.wait(500);
        cy.get('#secretPaymentBack').click()
        cy.wait(500);
        cy.get("#notificationEncrypted").check();
        cy.wait(500);
        cy.get('#secretEditNext').click()

        cy.get("#ccEmail")
            .should('have.value', 'test@yoursharedsecret.com');

        cy.wait(500);
        cy.get('#ccNumber').type("4111111111111111");
        cy.get('#ccExpiration').type("1234");
        cy.get('#ccCode').type("123");
        cy.get('#ccPostalCode').type("46217");

        cy.wait(500);
        cy.get("#secretPaymentNext").click();

        // Get the key for the secret and save it.

        cy.get("#keyDump", {
            timeout: 20000
        }).should('be.visible').then(elem => {
            let secretKey = elem.text();

            cy.log("http://localhost:8080/#" + secretKey);

            const parsingRe = /s=([^\/]+)\/p=([^\/]+)/;

            let secretId = secretKey.match(parsingRe)[1];
            let privateKey = common.decodeBin(secretKey.match(parsingRe)[2]);

            cy.wait(500);
            cy.get("#secretKeyBack").click();
            cy.get("#sendMessageBtn", {
                timeout: 5000
            }).click();
            cy.get("#busyProcessing", {
                timeout: 20000
            }).should('not.be.visible');

            validateSecretContentsBeforeAccept();

            cy.wait(500);
            cy.get("#secretEditExit").click();
            cy.wait(500);
            cy.get("#privateKey").type(secretKey);
            cy.get("#showKeyButton").click();

            validateSecretContentsBeforeAccept();

            cy.wait(500);
            cy.get("#secretEditExit").click();

            let caretakerKeys = []

            // Accept first 4 caretakers

            for (let i = 0; i < caretakers.length; i++) {
                const email = "test" + (i + 1) + "@yoursharedsecret.com";
                cy.wait(500);
                cy.get("#privateKey").type("s=" + secretId + "/c=" + caretakers[i] +
                    "/a=" + common.encodeBin(email) +
                    "/u=" + common.encodeBin(nacl.sign.keyPair.fromSecretKey(privateKey).publicKey) +
                    "/t=" + common.encodeBin(Buffer.from("Test Title")));
                cy.get("#showKeyButton").click();
                cy.get("#caretakerNotification").should("have.value", email)
                cy.get("#caretakerTitle").should("have.text", "Test Title");
                cy.get('#caretakerEmail').should('be.checked')
                cy.get('#caretakerMail').should('not.be.checked')
                cy.get("#caretakerNext").should("have.text", "Accept Responsibility");
                cy.wait(500);
                cy.get("#caretakerNext").click();

                cy.get("#keyDump", {
                    timeout: 8000
                }).should('be.visible').then(elem => {
                    caretakerKeys.push(elem.text());
                });
                cy.get("#secretKeyBack").click();
                cy.get("#caretakerNext").should("have.text", "Update");
                cy.get("#caretakerNext").should("not.be.enabled");
                cy.wait(500);
                cy.get("#caretakerExit").click();
            }

            // Publish the secret

            cy.wait(500);
            cy.get("#privateKey").type(secretKey);
            cy.get("#showKeyButton").click()

            validateSecretContentsBeforePublish();

            cy.wait(500);
            cy.get("#secretEditNext").click()
            cy.wait(500);
            cy.get("#publishRequireDone").click()
            cy.get("#busyProcessing", {
                timeout: 10000
            }).should('not.be.visible');

            validateSecretContentsAfterPublish();

            cy.wait(500);
            cy.get("#secretEditExit").click()

            cy.get("#privateKey").then(() => {
                let unlockTimestamp;

                // Request unlock of secret and then submit 2 more keys.

                for (let i = 0; i < 3; i++) {
                    const email = "test" + (i + 1) + "@yoursharedsecret.com";
                    cy.wait(500);
                    cy.get("#privateKey").type(caretakerKeys[i]);
                    cy.get("#showKeyButton").click();
                    cy.get("#caretakerNotification").should("have.value", email);
                    cy.get("#caretakerTitle").should("have.text", "Test Title");
                    cy.get('#caretakerEmail').should('be.checked')
                    cy.get('#caretakerMail').should('not.be.checked')
                    if (i == 0) {
                        cy.get("#caretakerNext").should("have.text", "Unlock");
                        cy.wait(500);
                        cy.get("#caretakerNext").click();

                        cy.get("#sendMessageBtn", {
                            timeout: 10000
                        }).should("be.visible").then(() => {
                            unlockTimestamp = Date.now();
                        })

                        cy.wait(500);
                        cy.get("#sendMessageBtn")
                            .click();

                        cy.get("#busyProcessing", {
                            timeout: 10000
                        }).should('not.be.visible');

                        cy.get('.caretakerRow', {
                            timeout: 5000
                        }).should("exist");

                        cy.get('.caretakerRow:nth-child(1) .caretakerAddress').should('have.text', 'test@yoursharedsecret.com')
                        cy.get('.caretakerRow:nth-child(2) .caretakerAddress').should('have.text', 'test2@yoursharedsecret.com')
                        cy.get('.caretakerRow:nth-child(3) .caretakerAddress').should('have.text', 'test3@yoursharedsecret.com')
                        cy.get('.caretakerRow:nth-child(4) .caretakerAddress').should('have.text', 'test4@yoursharedsecret.com')

                        cy.get('.caretakerRow:nth-child(1) .caretakerStatus').should('have.text', 'Participating')
                        cy.get('.caretakerRow:nth-child(2) .caretakerStatus').should('have.text', 'Participating')
                        cy.get('.caretakerRow:nth-child(3) .caretakerStatus').should('have.text', 'Participating')
                        cy.get('.caretakerRow:nth-child(4) .caretakerStatus').should('have.text', 'Participating')

                        cy.get('.caretakerRow:nth-child(1) .caretakerAddressType').should('have.text', 'Email')
                        cy.get('.caretakerRow:nth-child(2) .caretakerAddressType').should('have.text', 'Email')
                        cy.get('.caretakerRow:nth-child(3) .caretakerAddressType').should('have.text', 'Email')
                        cy.get('.caretakerRow:nth-child(4) .caretakerAddressType').should('have.text', 'Email')

                        cy.get('.caretakerRow:nth-child(1) .caretakerShare').should('not.exist')
                        cy.get('.caretakerRow:nth-child(2) .caretakerShare').should('not.exist')
                        cy.get('.caretakerRow:nth-child(3) .caretakerShare').should('not.exist')
                        cy.get('.caretakerRow:nth-child(4) .caretakerShare').should('not.exist')
                    } else {
                        cy.get("#caretakerNext").should("have.text", "Submit Key");
                        cy.wait(500);
                        cy.get("#caretakerNext").click();

                        cy.get("#busyProcessing", {
                            timeout: 10000
                        }).should('not.be.visible');
                    }

                    cy.wait(500);
                    cy.get("#caretakerExit").click({
                        force: true
                    });
                }

                // Wait for 60 seconds since unlock

                cy.wait(500);
                cy.get("#privateKey").type(caretakerKeys[0]).then(() => {
                    const waitTime = unlockTimestamp + 61 * 1000 - Date.now();
                    if (waitTime) {
                        cy.wait(waitTime);
                    }
                });
                cy.get("#showKeyButton").click().then(() => {

                    // Check that we got the secret

                    cy.get("#caretakerEditor", {
                        timeout: 5000
                    }).should("be.visible");
                    cy.wait(500);
                    cy.get("#caretakerEditor").should('have.text', "Test Document");

                    cy.get('#caretakerFileList .list-group-item:nth-child(1) a').should('have.text', "dropped.txt")
                    cy.get('#caretakerFileList .list-group-item:nth-child(2) a').should('have.text', "input.txt")

                    cy.get("#caretakerNext").should("have.text", "Update").should("be.disabled");

                    cy.get('.caretakerRow:nth-child(1) .caretakerAddress').should('have.text', 'test@yoursharedsecret.com')
                    cy.get('.caretakerRow:nth-child(2) .caretakerAddress').should('have.text', 'test2@yoursharedsecret.com')
                    cy.get('.caretakerRow:nth-child(3) .caretakerAddress').should('have.text', 'test3@yoursharedsecret.com')
                    cy.get('.caretakerRow:nth-child(4) .caretakerAddress').should('have.text', 'test4@yoursharedsecret.com')

                    cy.get('.caretakerRow:nth-child(1) .caretakerStatus').should('have.text', 'Participating')
                    cy.get('.caretakerRow:nth-child(2) .caretakerStatus').should('have.text', 'Submitted')
                    cy.get('.caretakerRow:nth-child(3) .caretakerStatus').should('have.text', 'Submitted')
                    cy.get('.caretakerRow:nth-child(4) .caretakerStatus').should('have.text', 'Participating')

                    cy.get('.caretakerRow:nth-child(1) .caretakerAddressType').should('have.text', 'Email')
                    cy.get('.caretakerRow:nth-child(2) .caretakerAddressType').should('have.text', 'Email')
                    cy.get('.caretakerRow:nth-child(3) .caretakerAddressType').should('have.text', 'Email')
                    cy.get('.caretakerRow:nth-child(4) .caretakerAddressType').should('have.text', 'Email')

                    cy.get('.caretakerRow:nth-child(1) .caretakerShare').should('be.enabled').should('not.be.checked')
                    cy.get('.caretakerRow:nth-child(2) .caretakerShare').should('be.enabled').should('not.be.checked')
                    cy.get('.caretakerRow:nth-child(2) .caretakerShare').click();
                    cy.get('.caretakerRow:nth-child(3) .caretakerShare').should('be.enabled').should('not.be.checked')
                    cy.get('.caretakerRow:nth-child(4) .caretakerShare').should('be.enabled').should('not.be.checked')

                    // Share access with another caretaker

                    cy.get("#caretakerNext").should("have.text", "Share Access");
                    cy.wait(500);
                    cy.get("#caretakerNext").click();

                    cy.get("#sendMessageBtn", {
                        timeout: 10000
                    }).should("be.visible").then(() => {
                        unlockTimestamp = Date.now();
                    })

                    cy.wait(500);
                    cy.get("#sendMessageBtn")
                        .click();

                    cy.get("#busyProcessing", {
                        timeout: 10000
                    }).should('not.be.visible');

                    cy.wait(5000);
                    cy.get("#caretakerExit").click();

                    cy.wait(500);
                    cy.get("#privateKey").type(caretakerKeys[1])
                    cy.get("#showKeyButton").click()

                    // Validate other caretaker has access

                    cy.get("#caretakerEditor", {
                        timeout: 5000
                    }).should("be.visible");
                    cy.wait(500);
                    cy.get("#caretakerEditor").should('have.text', "Test Document");

                    cy.get('#caretakerFileList .list-group-item:nth-child(1) a').should('have.text', "dropped.txt")
                    cy.get('#caretakerFileList .list-group-item:nth-child(2) a').should('have.text', "input.txt")

                    cy.get("#caretakerNext").should("have.text", "Update").should("be.disabled");

                    // Override unlock in other caretaker

                    cy.get("#caretakerEditMenuLink").click();
                    cy.get("#caretakerOverride").click();

                    cy.get("#sendMessageBtn", {
                        timeout: 10000
                    }).should("be.visible").then(() => {
                        unlockTimestamp = Date.now();
                    })

                    cy.wait(500);
                    cy.get("#sendMessageBtn")
                        .click();

                    cy.get("#busyProcessing", {
                        timeout: 10000
                    }).should('not.be.visible');

                    cy.get('.caretakerRow', {
                        timeout: 5000
                    }).should("exist");

                    cy.get('.caretakerRow:nth-child(1) .caretakerAddress').should('have.text', 'test@yoursharedsecret.com')
                    cy.get('.caretakerRow:nth-child(2) .caretakerAddress').should('have.text', 'test1@yoursharedsecret.com')
                    cy.get('.caretakerRow:nth-child(3) .caretakerAddress').should('have.text', 'test3@yoursharedsecret.com')
                    cy.get('.caretakerRow:nth-child(4) .caretakerAddress').should('have.text', 'test4@yoursharedsecret.com')

                    cy.get('.caretakerRow:nth-child(1) .caretakerStatus').should('have.text', 'Participating')
                    cy.get('.caretakerRow:nth-child(2) .caretakerStatus').should('have.text', 'Participating')
                    cy.get('.caretakerRow:nth-child(3) .caretakerStatus').should('have.text', 'Participating')
                    cy.get('.caretakerRow:nth-child(4) .caretakerStatus').should('have.text', 'Participating')

                    cy.get('.caretakerRow:nth-child(1) .caretakerAddressType').should('have.text', 'Email')
                    cy.get('.caretakerRow:nth-child(2) .caretakerAddressType').should('have.text', 'Email')
                    cy.get('.caretakerRow:nth-child(3) .caretakerAddressType').should('have.text', 'Email')
                    cy.get('.caretakerRow:nth-child(4) .caretakerAddressType').should('have.text', 'Email')

                    cy.wait(500);
                    cy.get("#caretakerExit").click({
                        force: true
                    });

                    // Validate that first caretaker no longer has access

                    cy.wait(500);
                    cy.get("#privateKey").type(caretakerKeys[0])
                    cy.get("#showKeyButton").click()

                    cy.get("#caretakerEditor", {
                        timeout: 5000
                    }).should("not.be.visible");
                    cy.get("#caretakerNext").should("have.text", "Submit Key");

                    cy.wait(500);
                    cy.get("#caretakerExit").click();
                });
            });

            cy.wait(500);
            cy.get("#privateKey").type(secretKey);
            cy.get("#showKeyButton").click()
                .then(() => {
                    // Cancel the unlock

                    cy.get('#secretEditNext', {
                        timeout: 10000
                    }).should('have.text', "Cancel Unlock").click();

                    cy.get("#busyProcessing", {
                        timeout: 5000
                    }).should('not.be.visible');

                    cy.wait(500);
                    cy.get("#secretEditExit").click();

                    // Validate that first caretaker no longer has access

                    cy.wait(2000);
                    cy.get("#privateKey").type(caretakerKeys[0])
                    cy.get("#showKeyButton").click()

                    cy.get("#caretakerEditor", {
                        timeout: 10000
                    }).should("not.be.visible");
                    cy.get("#caretakerNext").should("have.text", "Unlock");

                    cy.log("http://localhost:8080/#" + secretKey);

                    caretakerKeys.forEach((key) => {
                        cy.log("http://localhost:8080/#" + key);
                    });
                })
        });

    })

})
