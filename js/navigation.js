import jQuery from "jquery";

import start from './start';
import state from './state';
import common from './common';
import dev from './dev';

const loadedPages = {};
let page = "loading";

(function () {
    "use strict"; // Start of use strict

    var ua = window.navigator.userAgent;
    if (ua.indexOf('MSIE ') > 0 || ua.indexOf('Trident/') > 0) {
        jQuery("#loadingButton").hide();
        jQuery("#incompatibleText").replaceWith(jQuery("#incompatibleText").html());
        return;
    }

    function navbarCollapseForce() {
        jQuery("#mainNav").addClass("navbar-shrink");
    }

    function navbarCollapse() {
        if (!page) {
            let mainNav = jQuery("#mainNav");
            if (mainNav.offset().top > 100) {
                navbarCollapseForce();
            } else {
                mainNav.removeClass("navbar-shrink");
            }
        }
    }

    function scrollToAbout() {
        const target = jQuery('#about');
        if (target) {
            jQuery('html, body').animate({
                    scrollTop: (target.offset().top - 70)
                },
                1000,
                "easeInOutExpo");
        }
    }

    function copyToClipboard(text, el) {
        const elOriginalText = el.attr('data-original-title');

        const copyTextArea = document.createElement("textarea");
        copyTextArea.value = text;
        document.body.appendChild(copyTextArea);
        copyTextArea.select();
        try {
            const successful = document.execCommand('copy');
            const msg = successful ? 'Copied!' : 'Whoops, not copied!';
            el.attr('data-original-title', msg).tooltip('show');
        } catch (err) {
            console.log('Oops, unable to copy');
        }
        document.body.removeChild(copyTextArea);
        el.attr('data-original-title', elOriginalText);
    }

    function loadTemplate(target) {
        if (!loadedPages[target]) {
            const template = jQuery('#' + target + "-page-template").html();
            jQuery('#' + target + "-page").html(template);
            loadedPages[target] = true;

            let videoContainer = jQuery(".video-container video");
            videoContainer.off().click(function () {
                jQuery(".video-container video").attr("controls", "controls");

                // toggles play / pause
                setTimeout(() => this.play(), 10);

                videoContainer.off();
            });

            jQuery('.clickToCopy').off().click(function () {
                const text = jQuery(this).text();
                const el = jQuery(this);
                copyToClipboard(text, el);
            });

            jQuery('a.js-scroll-trigger').off().click(function () {
                jQuery('.navbar-collapse').collapse('hide');

                const target = this.hash.substr(1);
                showPage(target, true);
                window.history.pushState(null, "Your Shared Secret", "/#" + target);
                return false;
            });

            if (target === "s") {
                start.showPage();
            }

            jQuery('[data-toggle="tooltip"]').tooltip({ html: true });
            
            common.updatePaymentInformation(state.paymentInformation());
        }
    }

    function showPage(target, animate) {
        start.stopScanner();
        jQuery(".nav-link").removeClass("active");
        if (target) {
            jQuery("." + target).addClass("active");
        }

        let title = "Your Shared Secret";
        switch(target) {
            case "s":
                title += " - Account";
                break;
            case "faq":
                title += " - FAQ";
                break;
            case "dev":
                title += " - Architecture";
                break;
            case "secure":
                title += " - Security";
                break;
            case "pricing":
                title += " - Pricing";
                break;
            case "how":
                title += " - How";
                break;
        }
        jQuery(document).prop('title', title);

        if (target && target !== 'about') {
            loadTemplate(target);

            const constTarget = target;

            navbarCollapseForce();
            if (animate) {
                jQuery(".hiddenpage:not(#" + constTarget + "-page)").fadeOut().promise().done(function() {
                    jQuery('html, body').scrollTop(0);
                    jQuery("#" + constTarget + "-page").fadeIn();
                });
            } else {
                jQuery(".hiddenpage:not(#" + constTarget + "-page)").hide();
                jQuery("#" + constTarget + "-page").show();
            }
            page = target;

            if (target === "dev") {
                dev.loadSwagger();
            }
        } else {
            loadTemplate("front");

            const constTarget = target;

            if (page) {
                page = null;
                if (animate) {
                    jQuery(".hiddenpage:not(#front-page)").fadeOut().promise().done(function() {
                        jQuery('html, body').scrollTop(0);
                        jQuery("#front-page").fadeIn().promise().done(function() {
                            if (constTarget === "about") {
                                scrollToAbout();
                            }
                        });
                    });
                } else {
                    jQuery(".hiddenpage:not(#front-page)").hide();
                    jQuery("#front-page").show();
                    if (target === "about") {
                        scrollToAbout();
                    }
                }
                navbarCollapse();
            } else if (target === "about") {
                scrollToAbout();
            } else {
                if (animate) {
                    jQuery('html, body').animate({
                            scrollTop: 0
                        },
                        1000,
                        "easeInOutExpo");
                } else {
                    jQuery('html, body').scrollTop(0);
                }
            }
        }
    }

    // Activate scrollspy to add active class to navbar items on scroll
    jQuery('#front-page').scrollspy({
        target: '#mainNav',
        offset: 100
    });

    // Collapse now if page is not at top
    navbarCollapse();
    // Collapse the navbar when page is scrolled
    jQuery(window).scroll(navbarCollapse);

    // If it took longer than .5s to load then animate to next page.
    const animate = (Date.now() - pageLoadTimestamp) > 500;

    if (window.location.hash) {
        showPage(window.location.hash.substr(1), animate);
    } else {
        showPage(null, animate);
    }

    jQuery(window).on('popstate', function(event) {
        if (window.location.hash.length > 1) {
            showPage(window.location.hash.substr(1), true);
        } else {
            showPage("", true);
        }
    });
})(); // End of use strict
