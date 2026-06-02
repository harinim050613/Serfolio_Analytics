// ── Force page to always start at top on refresh ──────────────────────
if (history.scrollRestoration) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);

    // ─── 0. Lenis Smooth Scrolling Integration ─────────────────────────────
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth exponential easing
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    // Synchronize Lenis scrolling with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // ─── 0.1 High-End CSS Image Preloader ────────────────────────────────
    const preloader = document.getElementById('preloader');
    
    if (preloader) {
        // Hide preloader when window is fully loaded (minimum timeout 1.5s for premium feel)
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));
        const windowLoadEvent = new Promise(resolve => window.addEventListener('load', resolve));
        
        Promise.all([minLoadingTime, windowLoadEvent]).then(() => {
            preloader.classList.add('loaded');
        });
    }

    // ─── 1. Cursor Glow ───────────────────────────────────────────────────
    const cursorGlow = document.getElementById('cursor-glow');
    document.addEventListener('mousemove', (e) => {
        gsap.to(cursorGlow, { x: e.clientX, y: e.clientY, duration: 0.5, ease: 'power2.out' });
    });
    document.querySelectorAll('button, .bento-card, input, select, textarea, .nav-link').forEach(el => {
        el.addEventListener('mouseenter', () => gsap.to(cursorGlow, { width: 300, height: 300, duration: 0.3 }));
        el.addEventListener('mouseleave', () => gsap.to(cursorGlow, { width: 200, height: 200, duration: 0.3 }));
    });

    // ─── 2. Background Paths ──────────────────────────────────────────────
    const pathSvg = document.getElementById('background-paths');
    const colors  = ['#0B3C8A', '#1E88E5', '#42A5F5', '#1565C0', '#1976D2'];
    function createPath() {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M -100 ${Math.random()*900} C 480 ${Math.random()*900}, 960 ${Math.random()*900}, 1540 ${Math.random()*900}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', colors[Math.floor(Math.random() * colors.length)]);
        path.setAttribute('stroke-width', Math.random() * 2 + 1);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-opacity', Math.random() * 0.25 + 0.15);
        path.classList.add('bg-path');
        if (pathSvg) pathSvg.appendChild(path);
        gsap.set(path, { strokeDasharray: 2000, strokeDashoffset: 2000 });
        gsap.to(path, { strokeDashoffset: 0, duration: 10 + Math.random() * 10, repeat: -1, ease: 'none', delay: Math.random() * 5 });
    }
    for (let i = 0; i < 8; i++) createPath();

    // ─── 3. Canvas Opacity on Scroll ──────────────────────────────────────
    const canvas = document.getElementById('particle-canvas');
    function updateCanvasOpacity() {
        if (!canvas) return;
        canvas.style.opacity = '1';
    }
    updateCanvasOpacity();
    window.addEventListener('scroll', () => {
        if (pathSvg) gsap.set(pathSvg, { y: -window.scrollY * 0.2 });
    }, { passive: true });

    // ─── 4. BENTO CARDS — SCROLL-DRIVEN STICKY CARD STACKING ──────────────
    //
    //  Calculates progress of container scroll and applies mathematical
    //  interpolation to position and scale cards sequentially.
    // ─────────────────────────────────────────────────────────────────────
    const servicesContainer = document.getElementById('slide-3');
    const bentoCards = Array.from(document.querySelectorAll('#services-grid .bento-card'));

    function updateCardStacking() {
        if (!servicesContainer || bentoCards.length === 0) return;

        const rect = servicesContainer.getBoundingClientRect();
        const scrolled = -rect.top;
        const viewportHeight = window.innerHeight;
        const scrollableHeight = rect.height - viewportHeight;

        let progress = scrolled / scrollableHeight;
        progress = Math.max(0, Math.min(1, progress));

        const N = bentoCards.length;
        const cardHeight = bentoCards[0].offsetHeight || 400; // Read actual height from CSS
        const centerY = (viewportHeight - cardHeight) / 2;

        let activeCardIndex = 1;
        let t_i = 0;

        if (progress > 0) {
            const step = 1 / (N - 1);
            activeCardIndex = Math.min(N - 1, Math.floor(progress / step) + 1);
            const start_i = (activeCardIndex - 1) * step;
            const end_i = activeCardIndex * step;
            t_i = (progress - start_i) / (end_i - start_i);
            t_i = Math.max(0, Math.min(1, t_i));
        }

        bentoCards.forEach((card, index) => {
            let ty, sc, op;
            const targetY = index * 24;
            const offscreenY = viewportHeight - centerY;

            if (index > activeCardIndex) {
                // Card is offscreen waiting to fly up
                ty = offscreenY;
                sc = 1;
                op = 1;
            } else if (index === activeCardIndex) {
                // Card is currently flying up from offscreen to its stacked position
                ty = offscreenY + t_i * (targetY - offscreenY);
                sc = 1;
                op = 1;
            } else if (index === activeCardIndex - 1) {
                // Card is directly underneath the active card, fading out content as active card flies up
                ty = targetY;
                sc = 1 - (activeCardIndex - 1 - index) * 0.03 - t_i * 0.03;
                op = 1 - t_i;
            } else {
                // Card is already stacked deep underneath
                ty = targetY;
                sc = 1 - (activeCardIndex - 1 - index) * 0.03 - t_i * 0.03;
                op = 0;
            }

            card.style.transform = `translateY(${ty}px) scale(${sc})`;
            card.style.zIndex = index + 1;

            const content = card.querySelector('.card-split-container');
            if (content) {
                content.style.opacity = op;
                content.style.pointerEvents = op < 0.15 ? 'none' : 'auto';
                // Add a smooth CSS transition for direct visual response on resize, but instant scroll binding
                content.style.transition = 'opacity 0.15s ease-out, pointer-events 0.15s ease-out';
            }
        });
    }

    // Attach passive listeners
    window.addEventListener('scroll', updateCardStacking, { passive: true });
    window.addEventListener('resize', updateCardStacking, { passive: true });
    // Also bind to Lenis explicitly if needed, but ScrollTrigger.update covers most
    lenis.on('scroll', updateCardStacking);
    // Initialize immediately
    updateCardStacking();

    // ─── 5. Bento Card 3D Tilt on Hover (inner split container) ──────────
    bentoCards.forEach(card => {
        const container = card.querySelector('.card-split-container');
        if (!container) return;

        card.addEventListener('mousemove', (e) => {
            if (window.innerWidth <= 768) return;
            const rect = card.getBoundingClientRect();
            gsap.to(container, {
                rotateX:    (e.clientY - rect.top  - rect.height / 2) / 14,
                rotateY:   -(e.clientX - rect.left - rect.width  / 2) / 14,
                translateZ: 20,
                duration:   0.45,
                ease:       'power2.out'
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(container, { rotateX: 0, rotateY: 0, translateZ: 0, duration: 0.5, ease: 'power2.out' });
        });

        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-cta')) return;
            const service = card.dataset.service;
            if (service) window.location.href = `service-${service}.html`;
        });
    });

    // ─── 6. Contact Form Ripple & WhatsApp Redirection ────────────────────
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn    = contactForm.querySelector('.submit-button');
            const ripple = document.createElement('div');
            ripple.classList.add('ripple');
            btn.appendChild(ripple);

            // Collect values
            const name = contactForm.querySelector('[name="name"]').value;
            const email = contactForm.querySelector('[name="email"]').value;
            const phone = contactForm.querySelector('[name="phone"]').value || 'Not provided';
            const service = contactForm.querySelector('[name="service"]').value;
            const message = contactForm.querySelector('[name="message"]').value;

            // Formulate WhatsApp message text
            const waText = `*New Inquiry from Serfolio Analytics Website*\n\n` +
                           `*Name:* ${name}\n` +
                           `*Email:* ${email}\n` +
                           `*Phone:* ${phone}\n` +
                           `*Service:* ${service}\n` +
                           `*Message:* ${message}`;
            
            const waUrl = `https://wa.me/919384931363?text=${encodeURIComponent(waText)}`;

            gsap.to(ripple, {
                width: 1000, height: 1000, opacity: 0, duration: 1, ease: 'power2.out',
                onComplete: () => { 
                    ripple.remove(); 
                    // Open WhatsApp in a new tab
                    window.open(waUrl, '_blank');
                    // Submit the HTML form
                    contactForm.submit(); 
                }
            });
        });
    }

    // ─── 7. Hamburger Menubar Toggling ───────────────────────────────────
    const menubarToggle = document.querySelector('.menubar-toggle');
    const menubarWrapper = document.querySelector('.menubar-wrapper');
    if (menubarToggle && menubarWrapper) {
        menubarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menubarWrapper.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!menubarWrapper.contains(e.target)) {
                menubarWrapper.classList.remove('active');
            }
        });
    }

    // ─── 8. URL Parameters → Scroll to slide ─────────────────────────────
    setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const slide  = params.get('slide');
        if (slide !== null) {
            const map = { '1': 'slide-2', '2': 'slide-3', '3': 'slide-4' };
            const el  = document.getElementById(map[slide]);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);

    // Restore service card position if present in URL
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const restoreService = urlParams.get('service');
    if (restoreService && servicesContainer && bentoCards.length > 0) {
        const targetIndex = bentoCards.findIndex(c => c.dataset.service === restoreService);
        if (targetIndex >= 0) {
            setTimeout(() => {
                const sectionTop = servicesContainer.getBoundingClientRect().top + window.scrollY;
                const scrollableHeight = servicesContainer.offsetHeight - window.innerHeight;
                const step = 1 / (bentoCards.length - 1);
                
                // Add a small pixel buffer (e.g., 50px) to ensure the card finishes its upward flight animation
                const targetScrollY = sectionTop + (targetIndex * step * scrollableHeight) + 50;
                
                if (typeof lenis !== 'undefined') {
                    lenis.scrollTo(targetScrollY, { immediate: true });
                } else {
                    window.scrollTo(0, targetScrollY);
                }
            }, 100); 
        }
    }

});
