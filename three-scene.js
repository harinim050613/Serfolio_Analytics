/**
 * three-scene.js
 * 3D Logo — top-left corner
 *
 * Technique: Layered plane extrusion
 *   - 10 planes stacked in Z behind the front face
 *   - Each layer gets progressively darker blue → looks like a real extruded logo
 *   - No box, no geometry tricks — just the S-logo shape with real 3D depth
 *
 * Behaviour:
 *  • Slide 1  → face-on (straight), gentle float only
 *  • Past slide 1 → slow Y rotation (1 full spin = 10 seconds)
 *  • Hover → rotation pauses, pulse scale animation + blue ring glows
 *  • Un-hover → scale resets, ring fades, rotation resumes
 */
import * as THREE from 'three';

let logoRenderer, logoScene, logoCamera, logoGroup, ringMesh;
let autoRotate  = false;
let isHovered   = false;
let currentRotY = 0;

// Exactly 10 seconds per full revolution @ 60fps
const ROTATION_SPEED = (2 * Math.PI) / (60 * 10); // ≈ 0.01047 rad/frame

export function init3DLogo() {
    const canvas = document.getElementById('logo-3d-canvas');
    if (!canvas) return;

    const SIZE = 52;

    // ── Scene / Camera ───────────────────────────────────────────────────────
    logoScene  = new THREE.Scene();
    logoCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    logoCamera.position.z = 3.2;

    // ── Renderer ─────────────────────────────────────────────────────────────
    logoRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        premultipliedAlpha: false
    });
    logoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    logoRenderer.setSize(SIZE, SIZE);
    logoRenderer.setClearColor(0x000000, 0);

    // ── Build the extruded logo once texture loads ────────────────────────────
    new THREE.TextureLoader().load('logo.png', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        logoGroup = new THREE.Group();

        const EXTRUSION_LAYERS = 10;
        const LAYER_STEP       = 0.025; // Z gap between layers (total depth = 0.25)

        const deepBlue = new THREE.Color(0x0B2A6B);
        const midBlue  = new THREE.Color(0x1565C0);

        // ── Extrusion layers (back to front) ──────────────────────────────
        for (let i = EXTRUSION_LAYERS; i >= 1; i--) {
            const t = i / EXTRUSION_LAYERS;                    // 1 = deepest, 0 = shallowest
            const color = deepBlue.clone().lerp(midBlue, 1 - t); // deep → mid gradient

            const layerMat = new THREE.MeshBasicMaterial({
                map: texture,
                color: color,          // multiplies with texture — keeps logo shape, tints blue
                transparent: true,
                alphaTest: 0.08,       // only render logo pixels, not transparent areas
                depthWrite: false,
                side: THREE.FrontSide
            });

            const layer = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), layerMat);
            layer.position.z = -i * LAYER_STEP;
            layer.renderOrder = i;     // paint back layers first
            logoGroup.add(layer);
        }

        // ── Front face — original logo at full brightness ─────────────────
        const frontMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.08,
            depthWrite: false,
            side: THREE.FrontSide
        });
        const frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), frontMat);
        frontPlane.position.z = 0;
        frontPlane.renderOrder = 0;
        logoGroup.add(frontPlane);

        // ── Blue glow ring (hidden until hover) ───────────────────────────
        ringMesh = new THREE.Mesh(
            new THREE.RingGeometry(0.94, 1.10, 72),
            new THREE.MeshBasicMaterial({
                color: 0x42A5F5,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        ringMesh.position.z = 0.02;
        ringMesh.renderOrder = -1;
        logoGroup.add(ringMesh);

        logoScene.add(logoGroup);
    });

    // ── Hover ─────────────────────────────────────────────────────────────────
    const container = document.getElementById('logo-container');
    if (container) {
        container.addEventListener('mouseenter', () => {
            isHovered = true;
            if (logoGroup) currentRotY = logoGroup.rotation.y;
            if (ringMesh && typeof gsap !== 'undefined')
                gsap.to(ringMesh.material, { opacity: 0.55, duration: 0.35, ease: 'power2.out' });
        });

        container.addEventListener('mouseleave', () => {
            isHovered = false;
            if (logoGroup && typeof gsap !== 'undefined')
                gsap.to(logoGroup.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'power2.out' });
            if (ringMesh && typeof gsap !== 'undefined')
                gsap.to(ringMesh.material, { opacity: 0, duration: 0.4, ease: 'power2.out' });
        });
    }

    // ── Slide 1 IntersectionObserver ─────────────────────────────────────────
    const slide1 = document.getElementById('slide-1');
    if (slide1) {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(({ intersectionRatio }) => {
                const wasRotating = autoRotate;
                autoRotate = intersectionRatio < 0.25;

                // Snap back to straight when returning to slide 1
                if (!autoRotate && wasRotating && logoGroup && typeof gsap !== 'undefined') {
                    gsap.to(logoGroup.rotation, {
                        y: 0, x: 0,
                        duration: 0.9,
                        ease: 'power3.out'
                    });
                    currentRotY = 0;
                }
            });
        }, { threshold: [0, 0.1, 0.25, 0.5, 1.0] });
        obs.observe(slide1);
    }

    // ── Animation Loop ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animateLogo() {
        requestAnimationFrame(animateLogo);
        if (!logoGroup) return;

        const t = clock.getElapsedTime();

        if (isHovered) {
            // Pulse scale ±4% at ~0.55 Hz — feels like a heartbeat
            const pulse = 1 + Math.sin(t * 3.5) * 0.04;
            logoGroup.scale.setScalar(pulse);
            if (ringMesh) ringMesh.rotation.z = t * 0.65;

        } else if (autoRotate) {
            // 10-second Y rotation
            currentRotY += ROTATION_SPEED;
            logoGroup.rotation.y = currentRotY;
            logoGroup.position.y = Math.sin(t * 0.85) * 0.045;

        } else {
            // Slide 1 — perfectly face-on, float only
            logoGroup.position.y = Math.sin(t * 0.85) * 0.045;
        }

        logoRenderer.render(logoScene, logoCamera);
    }
    animateLogo();
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    init3DLogo();
});
