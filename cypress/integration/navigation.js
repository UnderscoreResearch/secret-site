describe('navigation', function() {
    function checkTabs(clickOpen) {
        cy.visit('/')

        clickOpen();
        cy.get('.nav-item > .how').click()

        cy.get('#front-page').should("not.be.visible")
        cy.get('#how-page').should("be.visible")

        clickOpen();
        cy.get('.nav-item > .pricing').click()

        cy.get('#how-page').should("not.be.visible")
        cy.get('#pricing-page').should("be.visible")

        clickOpen();
        cy.get('.nav-item > .secure').click()

        cy.get('#pricing-page').should("not.be.visible")
        cy.get('#secure-page').should("be.visible")

        clickOpen();
        cy.get('.nav-item > .dev').click()

        cy.get('#secure-page').should("not.be.visible")
        cy.get('#dev-page').should("be.visible")

        clickOpen();
        cy.get('.nav-item > .faq').click()

        cy.get('#dev-page').should("not.be.visible")
        cy.get('#faq-page').should("be.visible")

        if (false) {
            clickOpen();
            cy.get('.nav-item > .s').click()

            cy.get('#faq-page').should("not.be.visible")
            cy.get('#s-page').should("be.visible")
        }

        clickOpen();
        cy.get('.nav-item > .about').click()

        cy.wait(1500)

        cy.window().then((window) => {
            expect(window.scrollY).to.be.greaterThan(0);
        })

        cy.get('#s-page').should("not.be.visible")
        cy.get('#front-page').should("be.visible")

        cy.get('.navbar-brand').click()

        cy.wait(1500)

        cy.window().then((window) => {
            expect(window.scrollY).to.be.equal(0);
        })

        cy.get('#front-page').should("be.visible")
    }

    it('top tabs small', function() {
        cy.viewport("iphone-6");

        checkTabs(function () {
            cy.wait(200)

            cy.get('.navbar-toggler > .fas').click()
        })
    })

    it('top tabs large', function() {
        cy.viewport("macbook-15");

        checkTabs(function () {
        })
    })

})
