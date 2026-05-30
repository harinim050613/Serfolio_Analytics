import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const CONFIG = {
    count: 25000, 
    transitionSpeed: 0.10, // Increased for much faster reassembly after disturbance
    sliceRadius: 12,    // Smaller radius for local disturbance
    sliceStrength: 8.0, // Dramatically stronger push
    particleColor: 0x0062FF 
};

let scene, camera, renderer, instancedMesh, composer;
let currentPositions, targetPositions, randomSeed;
let mouse = new THREE.Vector2(-999, -999);
let prevMouse = new THREE.Vector2(-999, -999);
let raycaster = new THREE.Raycaster();
let plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let mouseWorld = new THREE.Vector3();
let animationStartTime = 0;

let SHAPE_LOGO = new Float32Array(CONFIG.count * 3);
let SHAPE_BG = new Float32Array(CONFIG.count * 3);
let SHAPE_SPHERE = new Float32Array(CONFIG.count * 3);
let COLOR_LOGO = new Float32Array(CONFIG.count * 3);
let COLOR_BG = new Float32Array(CONFIG.count * 3);

async function processImage(src, targetArray, colorArray, scale = 0.5, yOffset = 0) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 220; // Higher resolution for better logo detail
            canvas.width = size;
            canvas.height = size;
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            
            const data = ctx.getImageData(0, 0, size, size).data;
            const points = [];
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const idx = (y * size + x) * 4;
                    const r = data[idx];
                    const g = data[idx+1];
                    const b = data[idx+2];
                    const a = data[idx+3];
                    
                    // Accept all sufficiently opaque pixels — the logo uses vivid blues
                    // which have low overall brightness, so don't filter by brightness here
                    if (a > 80) {
                        // Weight sampling by opacity so edges are proportionally represented
                        const weight = a > 200 ? 2 : 1;
                        for (let w = 0; w < weight; w++) {
                            points.push({
                                x: (x - size/2) * scale,
                                y: (size/2 - y) * scale + yOffset,
                                z: (Math.random() - 0.5) * 2.5,
                                r: r / 255,
                                g: g / 255,
                                b: b / 255
                            });
                        }
                    }
                }
            }

            // Shuffle points so particles are distributed evenly across the logo
            for (let i = points.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [points[i], points[j]] = [points[j], points[i]];
            }

            for (let i = 0; i < CONFIG.count; i++) {
                const pt = points[i % points.length];
                targetArray[i*3] = pt.x;
                targetArray[i*3+1] = pt.y;
                targetArray[i*3+2] = pt.z;
                if (colorArray) {
                    colorArray[i*3] = pt.r;
                    colorArray[i*3+1] = pt.g;
                    colorArray[i*3+2] = pt.b;
                }
            }
            resolve();
        };
        img.onerror = () => resolve(); // Graceful fallback
    });
}

export async function initParticles(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    scene = new THREE.Scene();
    scene.background = null;

    const container = canvas.parentElement || canvas;
    const width = container.clientWidth || 450;
    const height = container.clientHeight || 280;
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    
    const aspect = width / height;
    let zPos = 85;
    if (aspect < 1.6) {
        zPos = 85 * (1.6 / aspect);
    }
    camera.position.set(0, 0, zPos);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;

    const instGeometry = new THREE.TetrahedronGeometry(0.18);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff, // White base color to multiply with instance colors
        transparent: true,
        opacity: 0.82
    });

    instancedMesh = new THREE.InstancedMesh(instGeometry, material, CONFIG.count);
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CONFIG.count * 3), 3);
    scene.add(instancedMesh);

    currentPositions = new Float32Array(CONFIG.count * 3);
    targetPositions = new Float32Array(CONFIG.count * 3);
    randomSeed = new Float32Array(CONFIG.count);

    for (let i = 0; i < CONFIG.count; i++) {
        currentPositions[i*3] = (Math.random() - 0.5) * 50; 
        currentPositions[i*3+1] = (Math.random() - 0.5) * 50;
        currentPositions[i*3+2] = (Math.random() - 0.5) * 50;
        randomSeed[i] = Math.random() * 20;

        const phi = Math.acos(-1 + (2 * i) / CONFIG.count);
        const theta = Math.sqrt(CONFIG.count * Math.PI) * phi;
        SHAPE_SPHERE[i*3] = 40 * Math.cos(theta) * Math.sin(phi);
        SHAPE_SPHERE[i*3+1] = 40 * Math.sin(theta) * Math.sin(phi);
        SHAPE_SPHERE[i*3+2] = 40 * Math.cos(phi);
    }

    await Promise.all([
        processImage('./logo.png', SHAPE_LOGO, COLOR_LOGO, 0.22, 0.0),
        processImage('./background.jpg', SHAPE_BG, COLOR_BG, 0.6, 0)
    ]);

    // Apply logo colors to every particle instance
    for (let i = 0; i < CONFIG.count; i++) {
        instancedMesh.setColorAt(i, new THREE.Color(
            COLOR_LOGO[i*3], COLOR_LOGO[i*3+1], COLOR_LOGO[i*3+2]
        ).convertSRGBToLinear());
    }
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

    targetPositions.set(SHAPE_LOGO); 

    window.addEventListener('mousemove', (e) => {
        prevMouse.copy(mouse);
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            prevMouse.copy(mouse);
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
        }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
        }
    }, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            const w = entry.contentRect.width || container.clientWidth || 450;
            const h = entry.contentRect.height || container.clientHeight || 280;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            
            let currentAspect = w / h;
            let zPos = 85;
            if (currentAspect < 1.6) {
                zPos = 85 * (1.6 / currentAspect);
            }
            camera.position.z = zPos;
            
            renderer.setSize(w, h, false);
            if (composer) composer.setSize(w, h);
        }
    });
    resizeObserver.observe(container);

    animationStartTime = performance.now() * 0.001;
    animate();
}

window.morph = function(idx) {
    window.activeTargetIdx = idx;
    if (idx === 1) targetPositions.set(SHAPE_LOGO);
    else if (idx === 2) targetPositions.set(SHAPE_SPHERE);
    else targetPositions.set(SHAPE_BG);
};

function animate() {
    requestAnimationFrame(animate);
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, mouseWorld);

    // Dynamic scroll-based mesh translation and scale to prevent cards from obscuring the logo
    const scrollY = window.currentScrollY || 0;
    const vh = window.innerHeight || 900;
    const progress = scrollY / vh; // ranges from 0 to 3

    if (instancedMesh) {
        // Keep the logo centered and at its default scale on all pages
        const targetX = 0;
        const targetY = 0;
        const targetScale = 1;

        // Smoothly interpolate position and scale using damping
        instancedMesh.position.x += (targetX - instancedMesh.position.x) * 0.1;
        instancedMesh.position.y += (targetY - instancedMesh.position.y) * 0.1;
        
        const currentScale = instancedMesh.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * 0.1;
        instancedMesh.scale.setScalar(newScale);
    }

    const dummy = new THREE.Object3D(); 
    const time = performance.now() * 0.001;
    const elapsed = time - animationStartTime;
    
    // Smoothly ease in the transition speed over the first 2.5 seconds for a dramatic slow formation
    let currentSpeed = CONFIG.transitionSpeed;
    if (elapsed < 2.5) {
        currentSpeed = 0.002 + (elapsed / 2.5) * (CONFIG.transitionSpeed - 0.002);
    }

    for (let i = 0; i < CONFIG.count; i++) {
        const i3 = i * 3;
        
        // Return to target positions
        currentPositions[i3] += (targetPositions[i3] - currentPositions[i3]) * currentSpeed;
        currentPositions[i3+1] += (targetPositions[i3+1] - currentPositions[i3+1]) * currentSpeed;
        currentPositions[i3+2] += (targetPositions[i3+2] - currentPositions[i3+2]) * currentSpeed;

        let x = currentPositions[i3];
        let y = currentPositions[i3+1];
        let z = currentPositions[i3+2];

        const s = randomSeed[i];
        x += Math.sin(time + s) * 0.1;
        y += Math.cos(time + s * 1.1) * 0.1;

        // Blade Slicing Calculation
        const dx = x - mouseWorld.x;
        const dy = y - mouseWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.sliceRadius) {
            // Clean radial split: pushed exactly to the edge of the slice circle
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            const pushAmount = (CONFIG.sliceRadius - dist) * 0.9; // 0.9 for smooth but strong split
            
            currentPositions[i3] += dirX * pushAmount;
            currentPositions[i3+1] += dirY * pushAmount;
            
            // Re-fetch updated positions
            x = currentPositions[i3] + Math.sin(time + s) * 0.1;
            y = currentPositions[i3+1] + Math.cos(time + s * 1.1) * 0.1;
        }

        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
}
