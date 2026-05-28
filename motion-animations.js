/**
 * motion-animations.js
 * Motion for JavaScript — premium spring animations
 * Bento cards now use GSAP ScrollTrigger for robust scroll-stacking animation
 */
import { animate, inView, spring, stagger } from 'https://cdn.jsdelivr.net/npm/motion@11.11.9/+esm';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Wait for DOM
// ─────────────────────────────────────────────────────────────────────────────
function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {

    // ─────────────────────────────────────────────────────────────────────────
    // 1. HERO TEXT CHARACTER REVEAL
    // ─────────────────────────────────────────────────────────────────────────
    const companyName = document.querySelector('.landing-title');
    const slogan = document.querySelector('.landing-text');

    function splitAndAnimate(el, delay = 0) {
        if (!el) return;
        const text = el.textContent;
        el.textContent = '';
        el.style.opacity = '1';
        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.style.display = 'inline-block';
            span.style.opacity = '0';
            span.style.transform = 'translateY(24px)';
            el.appendChild(span);
            animate(span, { opacity: [0, 1], y: [24, 0] }, {
                duration: 0.55, delay: delay + i * 0.04,
                easing: spring({ stiffness: 280, damping: 20 })
            });
        });
    }

    splitAndAnimate(companyName, 0.2);
    animate(slogan, { opacity: [0, 0.9], y: [18, 0] }, {
        duration: 0.8, delay: 1.4,
        easing: spring({ stiffness: 200, damping: 22 })
    });


    // ─────────────────────────────────────────────────────────────────────────
    // 2. SECTION TITLE inView REVEAL
    // ─────────────────────────────────────────────────────────────────────────
    inView('.section-title', ({ target }) => {
        animate(target, { opacity: [0, 1], y: [30, 0] }, {
            duration: 0.7, easing: spring({ stiffness: 220, damping: 24 })
        });
    }, { amount: 0.5 });


    // ─────────────────────────────────────────────────────────────────────────
    // 3. ABOUT HERO QUOTE inView REVEAL
    // ─────────────────────────────────────────────────────────────────────────
    inView('.hero-quote', ({ target }) => {
        animate(target, { opacity: [0, 1], scale: [0.75, 1], y: [15, 0] }, {
            duration: 0.8, easing: spring({ stiffness: 240, damping: 14 })
        });
    }, { amount: 0.5 });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ABOUT GLASS CARD inView REVEAL
    // ─────────────────────────────────────────────────────────────────────────
    inView('.about-container', ({ target }) => {
        animate(target, { opacity: [0, 1], scale: [0.94, 1], y: [20, 0] }, {
            duration: 0.75, easing: spring({ stiffness: 180, damping: 20 })
        });
    }, { amount: 0.4 });


    // ─────────────────────────────────────────────────────────────────────────
    // 4. NAV LINK SPRING HOVER EFFECTS
    // ─────────────────────────────────────────────────────────────────────────
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('mouseenter', () => {
            animate(link, { y: -3, scale: 1.07 }, { duration: 0.3, easing: spring({ stiffness: 380, damping: 18 }) });
        });
        link.addEventListener('mouseleave', () => {
            animate(link, { y: 0, scale: 1 }, { duration: 0.35, easing: spring({ stiffness: 280, damping: 22 }) });
        });
    });


    // ─────────────────────────────────────────────────────────────────────────
    // 5. LOGO CONTAINER SPRING HOVER
    // ─────────────────────────────────────────────────────────────────────────
    const logoContainer = document.getElementById('logo-container');
    if (logoContainer) {
        logoContainer.addEventListener('mouseenter', () => {
            animate(logoContainer, { scale: 1.06 }, { duration: 0.3, easing: spring({ stiffness: 400, damping: 20 }) });
        });
        logoContainer.addEventListener('mouseleave', () => {
            animate(logoContainer, { scale: 1 }, { duration: 0.4, easing: spring({ stiffness: 280, damping: 24 }) });
        });
    }


    // ─────────────────────────────────────────────────────────────────────────
    // 6. CONTACT CARD inView SPRING REVEAL
    // ─────────────────────────────────────────────────────────────────────────
    inView('.contact-card', ({ target }) => {
        animate(target, { opacity: [0, 1], y: [40, 0] }, {
            duration: 0.8, easing: spring({ stiffness: 200, damping: 22 })
        });
    }, { amount: 0.3 });


    // ─────────────────────────────────────────────────────────────────────────
    // 7. SOCIAL ICONS SPRING STAGGER on inView
    // ─────────────────────────────────────────────────────────────────────────
    inView('.social-icons-footer', ({ target }) => {
        const icons = target.querySelectorAll('.social-icon-item');
        animate(icons, { opacity: [0, 1], y: [20, 0], scale: [0.8, 1] }, {
            duration: 0.4, delay: stagger(0.08),
            easing: spring({ stiffness: 340, damping: 20 })
        });
    }, { amount: 0.5 });

    document.querySelectorAll('.social-icon-item').forEach(el => { el.style.opacity = '0'; });


    // ─────────────────────────────────────────────────────────────────────────
    // 8. CARD CTA SPRING HOVER
    // ─────────────────────────────────────────────────────────────────────────
    document.querySelectorAll('.card-cta').forEach(cta => {
        cta.addEventListener('mouseenter', () => {
            animate(cta, { x: 6 }, { duration: 0.25, easing: spring({ stiffness: 500, damping: 22 }) });
        });
        cta.addEventListener('mouseleave', () => {
            animate(cta, { x: 0 }, { duration: 0.3, easing: spring({ stiffness: 340, damping: 26 }) });
        });
    });


    // ─────────────────────────────────────────────────────────────────────────
    // 9. SERVICE CARD — SPRING-ENHANCED HOVER
    // ─────────────────────────────────────────────────────────────────────────
    document.querySelectorAll('.bento-card').forEach(card => {
        const container = card.querySelector('.card-split-container');
        if (!container) return;
        card.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                animate(container, { scale: 1.02 }, { duration: 0.35, easing: spring({ stiffness: 360, damping: 22 }) });
            }
        });
        card.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                animate(container, { scale: 1 }, { duration: 0.4, easing: spring({ stiffness: 260, damping: 26 }) });
            }
        });
    });

});
