/**
 * PARASFOLIO CORE LOGIC
 * Features: Custom Cursor, 3D Hover Tilt, GSAP ScrollTriggers, 
 * Memory-Managed Three.js WebGL Engine, Abortable API Feeds & Dynamic Lightbox Focus Trap.
 */

'use strict';

// --- SECURITY & UTILITY HELPER FUNCTIONS ---
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (match) => {
        const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return escapeMap[match];
    });
}

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 5000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// --- 00. ASSET AVAILABILITY CHECK ---
(function initAssetAvailabilityCheck() {
    const links = document.querySelectorAll('[data-asset-check]');
    if (!links.length) return;

    const uniqueAssets = [...new Set([...links].map((el) => el.dataset.assetCheck))];

    uniqueAssets.forEach((path) => {
        fetchWithTimeout(path, { method: 'HEAD', cache: 'no-store', timeout: 4000 })
            .then((res) => {
                if (res.ok) return;
                markUnavailable(path);
            })
            .catch(() => markUnavailable(path));
    });

    function markUnavailable(path) {
        document.querySelectorAll(`[data-asset-check="${path}"]`).forEach((el) => {
            el.classList.add('is-unavailable');
            el.setAttribute('aria-disabled', 'true');
            el.title = 'Not uploaded yet — check back soon';
            el.addEventListener('click', (e) => e.preventDefault());
        });
    }
})();

// --- 0A. DECORATIVE ACTIVITY GRID ---
(function initHeatmapGrid() {
    const host = document.getElementById('gh-heatmap-grid');
    if (!host) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 120; i++) {
        const val = Math.random();
        let cls = 'bg-gray-100/5';
        if (val > 0.90) cls = 'bg-[#39d353]';
        else if (val > 0.70) cls = 'bg-[#26a641]';
        else if (val > 0.50) cls = 'bg-[#006d32]';
        else if (val > 0.30) cls = 'bg-[#0e4429]';
        const cell = document.createElement('div');
        cell.className = `w-3 h-3 md:w-4 md:h-4 rounded-sm shrink-0 ${cls} transition-colors duration-300 hover:bg-gray-100`;
        frag.appendChild(cell);
    }
    host.appendChild(frag);
})();

// --- 0B. MOBILE SLIDE-OUT MENU WITH FOCUS TRAP ---
(function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuBackdrop = document.getElementById('mobile-menu-backdrop');
    const menuIcon = menuToggle ? menuToggle.querySelector('i') : null;
    if (!menuToggle || !mobileMenu || !menuBackdrop) return;

    let previousActiveElement = null;
    
    // Ensure properly hidden from a11y tree on load
    mobileMenu.setAttribute('inert', '');

    function openMobileMenu() {
        previousActiveElement = document.activeElement;
        mobileMenu.removeAttribute('inert');
        mobileMenu.classList.add('open');
        menuBackdrop.classList.add('open');
        document.body.classList.add('menu-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        if (menuIcon) {
            menuIcon.classList.remove('fa-bars-staggered');
            menuIcon.classList.add('fa-xmark');
        }
        
        const firstFocusable = mobileMenu.querySelector('a, button');
        if (firstFocusable) firstFocusable.focus();
    }

    function closeMobileMenu() {
        mobileMenu.setAttribute('inert', '');
        mobileMenu.classList.remove('open');
        menuBackdrop.classList.remove('open');
        document.body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        if (menuIcon) {
            menuIcon.classList.remove('fa-xmark');
            menuIcon.classList.add('fa-bars-staggered');
        }
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
            previousActiveElement.focus();
        }
    }

    menuToggle.addEventListener('click', () => {
        mobileMenu.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
    });
    menuBackdrop.addEventListener('click', closeMobileMenu);
    mobileMenu.querySelectorAll('.mobile-nav-link').forEach((link) => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024 && mobileMenu.classList.contains('open')) closeMobileMenu();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
        if (!mobileMenu.classList.contains('open')) return;
        if (e.key === 'Escape') closeMobileMenu();

        if (e.key === 'Tab') {
            const focusables = Array.from(mobileMenu.querySelectorAll('a[href], button:not([disabled])'));
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
})();

// --- 0C. BACK TO TOP CONTROL ---
(function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    const toggle = () => btn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', toggle, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    toggle();
})();

// --- 0D. ACTIVE NAV LINK HIGHLIGHTING ---
(function initActiveNav() {
    const navLinks = document.querySelectorAll('.nav-link[data-nav-section]');
    if (!navLinks.length) return;
    const sections = Array.from(navLinks)
        .map(link => document.getElementById(link.dataset.navSection))
        .filter(Boolean);
    if (!sections.length) return;

    const setActive = (id) => {
        navLinks.forEach(link => {
            link.classList.toggle('is-active', link.dataset.navSection === id);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) setActive(entry.target.id);
        });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));
})();

// --- 0E. LIVE GITHUB STATS ---
(function initGithubStats() {
    const GH_USER = 'parasbishnoi029';
    const statEl = document.getElementById('gh-live-stat');
    const pinnedEl = document.getElementById('gh-pinned-projects');
    if (!statEl && !pinnedEl) return;

    function timeAgo(dateStr) {
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diffMs / 86400000);
        if (days < 1) return 'today';
        if (days === 1) return '1 day ago';
        if (days < 30) return `${days} days ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} mo ago`;
        return `${Math.floor(months / 12)} yr ago`;
    }

    fetchWithTimeout(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`, {
        headers: { Accept: 'application/vnd.github+json' }
    })
        .then((res) => {
            if (!res.ok) throw new Error(`GitHub API ${res.status}`);
            return res.json();
        })
        .then((repos) => {
            if (!Array.isArray(repos) || !repos.length) throw new Error('No public repos returned');

            const nonForks = repos.filter((r) => !r.fork);
            const pool = nonForks.length ? nonForks : repos;

            const totalStars = pool.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
            const langCounts = {};
            pool.forEach((r) => {
                if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
            });
            const topLanguage = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0];

            if (statEl) {
                const parts = [`${pool.length} public repos`, `${totalStars} ★ total`];
                if (topLanguage) parts.push(`mostly ${escapeHTML(topLanguage[0])}`);
                statEl.textContent = parts.join(' • ');
                statEl.title = `Live from api.github.com/users/${GH_USER}/repos`;
            }

            if (pinnedEl) {
                const colorCycle = ['primary', 'secondary', 'accent'];
                const top = [...pool].sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at))).slice(0, 3);
                if (top.length) {
                    pinnedEl.innerHTML = top.map((repo, i) => {
                        const color = colorCycle[i % colorCycle.length];
                        const stars = repo.stargazers_count ? ` <span class="text-gray-500">· ${repo.stargazers_count}★</span>` : '';
                        return `<a href="${escapeHTML(repo.html_url)}" target="_blank" rel="noopener noreferrer" class="hover-target flex items-center gap-2 bg-gray-100/5 border border-gray-200/10 hover:border-${color}/50 hover:text-${color} px-4 py-2 rounded-full text-xs font-mono text-gray-300 transition-colors" title="Updated ${timeAgo(repo.pushed_at)}">
                            <i class="fa-solid fa-code-branch text-[10px]"></i> ${escapeHTML(repo.name)}${stars}
                        </a>`;
                    }).join('') + `<a href="https://github.com/${GH_USER}?tab=repositories" target="_blank" rel="noopener noreferrer" class="hover-target flex items-center gap-2 text-xs font-mono text-gray-50 px-4 py-2 uppercase tracking-widest hover:text-primary transition-colors">View All <i class="fa-solid fa-arrow-right ml-1"></i></a>`;
                }
            }
        })
        .catch(() => {
            console.log('Using fallback static stats.');
        });
})();

// --- 0F. LIVE DEMO PANEL ---
(function initDemoPanels() {
    document.querySelectorAll('[id^="demo-toggle-"]').forEach((btn) => {
        const panelId = btn.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : null;
        if (!panel) return;
        let loaded = false;

        btn.addEventListener('click', () => {
            const opening = panel.hasAttribute('hidden');
            if (opening) {
                panel.removeAttribute('hidden');
                btn.setAttribute('aria-expanded', 'true');
                btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Close Live Demo';

                if (!loaded) {
                    const demoUrl = btn.dataset.demoUrl;
                    if (demoUrl) {
                        panel.innerHTML = `<iframe src="${escapeHTML(demoUrl)}" loading="lazy" title="Live interactive demo" allow="clipboard-write"></iframe>`;
                    } else {
                        panel.innerHTML = `
                            <div class="demo-panel-placeholder">
                                <i class="fa-solid fa-plug-circle-bolt"></i>
                                <h4 class="font-display text-lg font-bold text-gray-50 mb-2">No live preview connected yet</h4>
                                <p class="text-sm text-gray-400 font-light max-w-md mx-auto leading-relaxed">
                                    This slot is wired up to embed a hosted model — a Hugging Face Space or Streamlit app. Check out the repository above in the meantime.
                                </p>
                            </div>`;
                    }
                    loaded = true;
                }
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                panel.setAttribute('hidden', '');
                btn.setAttribute('aria-expanded', 'false');
                btn.innerHTML = '<i class="fa-solid fa-play"></i> Launch Live Demo';
            }
        });
    });
})();

// --- 0G. DYNAMIC BLOG FEED ---
(async function initBlogFeed() {
    const container = document.getElementById('blog-feed-container');
    if (!container) return;

    try {
        const res = await fetchWithTimeout('https://dev.to/api/articles?username=parasbishnoi029&per_page=3');
        const articles = await res.json();
        
        if (Array.isArray(articles) && articles.length > 0) {
            container.innerHTML = articles.map(article => `
                <a href="${escapeHTML(article.url)}" target="_blank" rel="noopener noreferrer" class="glass-3d p-6 rounded-2xl interactive-3d hover-target group border-t-2 border-secondary/50 flex flex-col h-full">
                    <img src="${escapeHTML(article.cover_image || 'assets/placeholder.jpg')}" width="400" height="128" class="w-full h-32 object-cover rounded-xl mb-4 opacity-80 group-hover:opacity-100 transition-opacity" alt="Article Cover" onerror="this.style.display='none'">
                    <h3 class="font-display font-bold text-lg text-gray-50 mb-2">${escapeHTML(article.title)}</h3>
                    <p class="text-xs text-gray-400 font-light flex-grow">${escapeHTML(article.description)}</p>
                    <div class="mt-4 pt-4 border-t border-gray-200/10 text-[10px] font-mono text-secondary flex justify-between">
                        <span>${new Date(article.published_at).toLocaleDateString()}</span>
                        <span>Read <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </a>
            `).join('');
        }
    } catch (e) {
        console.log('Using static blog fallback.');
    }
})();

// --- 1. CUSTOM CURSOR INTEGRATION ---
(function initCustomCursor() {
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorRing = document.querySelector('.cursor-ring');
    if (!cursorDot || !cursorRing) return;

    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cursorDot.style.display = 'none';
        cursorRing.style.display = 'none';
        return;
    }

    // PERF FIX: previously wrote `left`/`top` (layout-triggering) on every mousemove and
    // called cursorRing.animate() per-event (a new Web Animation object per pixel of
    // movement). Now we just cache the pointer position and let a single rAF loop apply
    // GPU-friendly `transform: translate3d(...)` updates at most once per frame.
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let ringX = mouseX, ringY = mouseY;
    let cursorRafId = null;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (cursorRafId === null) {
            cursorRafId = requestAnimationFrame(updateCursor);
        }
    }, { passive: true });

    function updateCursor() {
        cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
        // Light easing on the ring so it keeps its trailing feel without the old
        // per-event Web Animation API call.
        ringX += (mouseX - ringX) * 0.35;
        ringY += (mouseY - ringY) * 0.35;
        cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

        if (Math.abs(mouseX - ringX) > 0.1 || Math.abs(mouseY - ringY) > 0.1) {
            cursorRafId = requestAnimationFrame(updateCursor);
        } else {
            cursorRafId = null;
        }
    }
    updateCursor();

    document.querySelectorAll('a, button, .hover-target').forEach(el => {
        el.addEventListener('mouseenter', () => { 
            cursorRing.style.width = '60px'; 
            cursorRing.style.height = '60px'; 
            cursorRing.style.backgroundColor = 'rgba(0,242,254,0.1)'; 
            cursorRing.style.borderColor = 'rgba(0,242,254,1)';
        });
        el.addEventListener('mouseleave', () => { 
            cursorRing.style.width = '40px'; 
            cursorRing.style.height = '40px'; 
            cursorRing.style.backgroundColor = 'transparent'; 
            cursorRing.style.borderColor = 'rgba(0,242,254,0.6)';
        });
    });
})();

// --- 2. CSS 3D HOVER EFFECT ---
(function init3DTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // PERF FIX: previously called el.getBoundingClientRect() on every mousemove event.
    // Since the previous mousemove had already written a new `transform` (invalidating
    // layout), the very next rect read forced a synchronous reflow — repeated on every
    // pixel of movement, across every tilt card. We now cache the rect once on
    // mouseenter (and refresh it on scroll/resize) and only re-measure lazily, plus
    // throttle the actual style write to one per animation frame.
    function initTiltGroup(selector, computeTransform) {
        document.querySelectorAll(selector).forEach(el => {
            let rect = null;
            let pendingEvent = null;
            let rafId = null;

            const measure = () => { rect = el.getBoundingClientRect(); };

            const applyTransform = () => {
                rafId = null;
                if (!rect || !pendingEvent) return;
                el.style.transform = computeTransform(rect, pendingEvent);
            };

            el.addEventListener('mouseenter', () => {
                measure();
            });
            el.addEventListener('mousemove', (e) => {
                pendingEvent = e;
                if (rafId === null) rafId = requestAnimationFrame(applyTransform);
            }, { passive: true });
            el.addEventListener('mouseleave', () => {
                if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
                el.style.transform = computeTransform(null, null);
            });
        });
    }

    initTiltGroup('.interactive-3d', (rect, e) => {
        if (!rect || !e) return `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = (y - centerY) / 20;
        const tiltY = (centerX - x) / 20;
        return `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    initTiltGroup('.gallery-card-inner', (rect, e) => {
        if (!rect || !e) return `rotateX(0deg) rotateY(0deg)`;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const tiltX = ((y - rect.height / 2) / rect.height) * -10;
        const tiltY = ((x - rect.width / 2) / rect.width) * 10;
        return `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

})();

// --- 3. THREE.JS WEBGL ENGINE ---
let canvas, scene, camera, renderer, terrain, dust, avatar3DGroup, coreMesh, outerHaloMesh;
let animationFrameId = null;

function initWebGL() {
    const isMobileDevice = window.innerWidth < 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    canvas = document.getElementById('webgl-canvas');
    if (!canvas) return;

    if (isMobileDevice) {
        canvas.style.display = 'none';
        return;
    }

    canvas.style.display = 'block';
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030305, 0.012);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 30); 

    // PERF FIX: antialias was a major cost on every single frame (MSAA is expensive,
    // especially on integrated GPUs or software-rendered contexts) for a background
    // wireframe/particle scene where the softness barely reads anyway. Pixel ratio cap
    // lowered from 2 -> 1.5, which cuts fragment-shading work substantially on retina
    // displays (a 2x cap on a 1920px-wide viewport is ~7.9M shaded pixels/frame; 1.5x
    // cuts that by ~44%).
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const ambientLight = new THREE.AmbientLight(0xf9fafb, 0.4); 
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00F2FE, 6, 100); 
    pointLight1.position.set(10, 10, 10); 
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x9D4EDD, 6, 100); 
    pointLight2.position.set(-10, -10, 10); 
    scene.add(pointLight2);

    // PERF FIX: terrain mesh resolution halved (40x60 -> 24x36 segments = ~2,400 ->
    // ~864 quads). It's a wireframe at 0.08 opacity in the background — the extra
    // vertex density was invisible but not free to build or animate.
    const terrainGeo = new THREE.PlaneGeometry(200, 300, 24, 36);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const z = Math.sin(pos.getX(i) * 0.1) * Math.cos(pos.getY(i) * 0.1) * 4;
        pos.setZ(i, z);
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x00F2FE, wireframe: true, transparent: true, opacity: 0.08 });
    terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -20;
    terrain.position.z = -50;
    scene.add(terrain);

    // PERF FIX: particle count roughly halved (3000 -> 1400). Same ambient dust-field
    // effect at typical viewing distance, half the per-frame point-cloud cost.
    const pGeo = new THREE.BufferGeometry();
    const pCount = 1400;
    const pPos = new Float32Array(pCount * 3);
    for(let i = 0; i < pCount * 3; i+=3) {
        pPos[i] = (Math.random() - 0.5) * 200;       
        pPos[i+1] = (Math.random() - 0.5) * 200;     
        pPos[i+2] = (Math.random() - 0.5) * 300 - 50; 
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.05, color: 0xe2e8f0, transparent: true, opacity: 0.3 });
    dust = new THREE.Points(pGeo, pMat);
    scene.add(dust);

    // PERF FIX: icosahedron subdivision levels dropped one notch each (2->1, 3->2).
    // Subdivision detail grows the face/point count ~4x per level, so this is a large
    // cut in per-frame vertex work for shapes that are small and often partly offscreen.
    avatar3DGroup = new THREE.Group();
    const coreGeo = new THREE.IcosahedronGeometry(4, 1);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x00F2FE, wireframe: true, transparent: true, opacity: 0.6 });
    coreMesh = new THREE.Mesh(coreGeo, coreMat);

    const outerHaloGeo = new THREE.IcosahedronGeometry(5.5, 2);
    const outerHaloMat = new THREE.PointsMaterial({ size: 0.08, color: 0x9D4EDD, transparent: true, opacity: 0.4 });
    outerHaloMesh = new THREE.Points(outerHaloGeo, outerHaloMat);

    avatar3DGroup.add(coreMesh);
    avatar3DGroup.add(outerHaloMesh);
    avatar3DGroup.position.set(12, 0, -10); 
    scene.add(avatar3DGroup);

    let targetX = 0, targetY = 0, mouseX = 0, mouseY = 0;
    const halfX = window.innerWidth / 2;
    const halfY = window.innerHeight / 2;

    const onMouseMove = (event) => { mouseX = (event.clientX - halfX); mouseY = (event.clientY - halfY); };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const clock = new THREE.Clock();
    let renderingPaused = false;
    // PERF FIX: this loop previously rendered at full display refresh rate (60fps+)
    // forever. It's a slow-moving ambient background, not something that needs 60fps —
    // capping at ~30fps halves renderer.render() calls (the single most expensive line
    // in this file) with no perceptible visual difference.
    const FRAME_INTERVAL = 1000 / 30;
    let lastFrameTime = 0;

    function animate(now) {
        if (renderingPaused) { animationFrameId = null; return; }
        animationFrameId = requestAnimationFrame(animate);

        if (now - lastFrameTime < FRAME_INTERVAL) return;
        lastFrameTime = now;

        const t = clock.getElapsedTime();

        if (terrain) terrain.position.z = (t * 5) % 20 - 50;
        if (dust) dust.rotation.y = t * 0.02;
        
        if (coreMesh) { coreMesh.rotation.x = t * 0.4; coreMesh.rotation.y = t * 0.5; }
        if (outerHaloMesh) outerHaloMesh.rotation.z = -t * 0.15;

        targetX = mouseX * 0.005; targetY = mouseY * 0.005;
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.y += (-targetY - camera.position.y) * 0.05;
        camera.lookAt(camera.position.x, camera.position.y, camera.position.z - 50);

        renderer.render(scene, camera);
    }
    animate(0);

    // PERF FIX: the render loop used to run forever, full-speed, even when the tab was
    // backgrounded or the canvas had scrolled off-screen. Now we stop requestAnimationFrame
    // entirely in both cases and resume cleanly when it's actually visible again.
    function pauseRendering() {
        if (renderingPaused) return;
        renderingPaused = true;
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    function resumeRendering() {
        if (!renderingPaused) return;
        renderingPaused = false;
        clock.getDelta(); // avoid a large elapsed-time jump after being paused
        lastFrameTime = 0;
        animate(performance.now());
    }

    let canvasIsVisible = true;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseRendering();
        else if (canvasIsVisible) resumeRendering();
    });

    if ('IntersectionObserver' in window) {
        const canvasObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                canvasIsVisible = entry.isIntersecting;
                if (!entry.isIntersecting) pauseRendering();
                else if (!document.hidden) resumeRendering();
            });
        }, { threshold: 0 });
        canvasObserver.observe(canvas);
    }

    gsap.to(camera.position, {
        z: -150, ease: "none",
        scrollTrigger: { trigger: "#scroll-container", start: "top top", end: "bottom bottom", scrub: 1.5 }
    });

    gsap.to(dust.rotation, {
        z: Math.PI / 4, ease: "none",
        scrollTrigger: { trigger: "#scroll-container", start: "top top", end: "bottom bottom", scrub: 2 }
    });
}

// PERF FIX: this used to run immediately when main.js executed — building the full
// scene (geometry, particle buffers, materials) and kicking off a continuous render
// loop right in the middle of the page's critical loading window, which is exactly
// what Lighthouse's Total Blocking Time measures. The WebGL scene is a decorative
// background, not needed for first paint or for the page to be usable, so we now wait
// for the page to finish loading and the main thread to actually go idle before doing
// any of this work. Falls back to a short timeout on browsers without
// requestIdleCallback (e.g. Safari).
function scheduleWebGLInit() {
    const start = () => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initWebGL, { timeout: 2000 });
        } else {
            setTimeout(initWebGL, 300);
        }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
}
scheduleWebGLInit();

window.addEventListener('resize', () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight);
}, { passive: true });

// --- 4. PRELOADER & INITIAL GSAP ENTRANCE ---
gsap.registerPlugin(ScrollTrigger);

window.addEventListener('load', () => {
    gsap.to('#load-bar', { width: '100%', duration: 1.5, ease: 'power2.inOut', onUpdate: function() {
        const pctEl = document.getElementById('loading-percentage');
        if (pctEl) pctEl.innerText = Math.round(this.progress() * 100) + '%';
    }, onComplete: () => {
        gsap.to('#loader', { opacity: 0, duration: 0.8, onComplete: () => {
            const loader = document.getElementById('loader');
            if (loader) loader.style.display = 'none';
            
            const avatarCard = document.getElementById('hero-avatar');
            if (avatarCard) {
                gsap.fromTo(avatarCard, 
                    { z: 500, rotationY: 45, rotationX: -15, opacity: 0, scale: 0.5 }, 
                    { z: 0, rotationY: 0, rotationX: 0, opacity: 1, scale: 1, duration: 2.5, ease: 'power4.out' }
                );
            }

            gsap.from('.hero-title', { y: 100, opacity: 0, duration: 1.2, ease: 'power4.out', delay: 0.2 });
            gsap.from('.hero-subtitle', { y: 50, opacity: 0, duration: 1.2, ease: 'power4.out', delay: 0.4 });
            gsap.from('#home .gs-reveal', { y: 30, opacity: 0, duration: 1, stagger: 0.2, ease: 'power3.out', delay: 0.6 });
        }});

        gsap.utils.toArray('.gs-reveal').forEach((elem) => {
            if(!elem.closest('#home')) {
                gsap.from(elem, { 
                    y: 80, opacity: 0, duration: 1.2, ease: 'power3.out', 
                    scrollTrigger: { trigger: elem, start: 'top 85%' }
                });
            }
        });

        initGalleryScroll();
    }});
});

// --- GALLERY SCROLL LOGIC ---
// PERF/RELIABILITY FIX: this used to pin the section and scrub a GSAP transform across
// it, with a second, separate touch-swipe gesture detector layered on top that also
// tried to jump the position on every swipe. Two things could make it break in
// practice: (1) the pinned scroll-distance calculation only has to be off by a little
// for the pin to release before the track has translated far enough — and since the
// container clips overflow, everything past that point is simply clipped off (shows as
// blank space), which is exactly the "first few show, then blank" symptom; (2) on
// touch, the scroll-driven animation and the separate swipe-jump handler could both
// fire for the same gesture and fight each other.
// Now it's real native horizontal scrolling with CSS scroll-snap (the codebase already
// had this exact approach built as a prefers-reduced-motion fallback — it's simply the
// only path now). No distance math to get wrong, no pinning, no second gesture handler
// competing with the browser's own scrolling — mouse, trackpad, and touch all just work
// because they're driving a real scroll container instead of a simulated one.
function initGalleryScroll() {
    const pinWrap = document.getElementById('gallery-pin');
    const track = document.getElementById('gallery-track');
    const cards = Array.from(document.querySelectorAll('#gallery-track .gallery-card'));
    const progressFill = document.getElementById('gallery-progress-fill');
    const counterEl = document.getElementById('gallery-counter');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    const dotsWrap = document.getElementById('gallery-dots');
    if (!pinWrap || !track || !cards.length) return;

    const pad = (n) => String(n).padStart(2, '0');
    const setCounter = (i) => { if (counterEl) counterEl.textContent = `${pad(i + 1)} / ${pad(cards.length)}`; };

    let dots = [];
    if (dotsWrap) {
        dotsWrap.innerHTML = '';
        dots = cards.map((_, i) => {
            const dot = document.createElement('button');
            dot.type = 'button'; dot.className = 'gallery-dot' + (i === 0 ? ' is-active' : '');
            dot.setAttribute('aria-label', `Go to photo ${i + 1}`); dot.setAttribute('role', 'tab');
            dotsWrap.appendChild(dot); return dot;
        });
    }
    const setActiveDot = (i) => { dots.forEach((d, di) => d.classList.toggle('is-active', di === i)); };

    let currentIndex = 0;
    // Real gap between card starts (works even if individual card widths differ, e.g.
    // the CTA card), rather than assuming every card is the same width.
    const cardStep = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].getBoundingClientRect().width);

    const updateFromScroll = () => {
        const step = cardStep() || 1;
        const idx = Math.min(cards.length - 1, Math.max(0, Math.round(pinWrap.scrollLeft / step)));
        if (idx !== currentIndex) { currentIndex = idx; setActiveDot(idx); }
        setCounter(idx);
        const maxScroll = Math.max(track.scrollWidth - pinWrap.clientWidth, 1);
        if (progressFill) progressFill.style.width = `${Math.min(100, (pinWrap.scrollLeft / maxScroll) * 100)}%`;
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx === cards.length - 1;
    };

    function goToIndex(i) {
        const clamped = Math.min(Math.max(i, 0), cards.length - 1);
        pinWrap.scrollTo({ left: cards[clamped].offsetLeft - track.offsetLeft, behavior: 'smooth' });
    }

    pinWrap.addEventListener('scroll', updateFromScroll, { passive: true });
    dots.forEach((dot, i) => dot.addEventListener('click', () => goToIndex(i)));
    if (prevBtn) prevBtn.addEventListener('click', () => goToIndex(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToIndex(currentIndex + 1));

    document.addEventListener('keydown', (e) => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const rect = pinWrap.getBoundingClientRect();
        const inView = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;
        if (!inView) return;
        e.preventDefault();
        goToIndex(currentIndex + (e.key === 'ArrowRight' ? 1 : -1));
    });

    updateFromScroll();
}

// --- GALLERY LIGHTBOX WITH FOCUS TRAP ---
function initGalleryLightbox() {
    const lightbox = document.getElementById('gallery-lightbox');
    const mediaHost = document.getElementById('gallery-lightbox-media');
    const titleEl = document.getElementById('gallery-lightbox-title');
    const descEl = document.getElementById('gallery-lightbox-desc');
    const closeBtn = document.getElementById('gallery-lightbox-close');
    const prevBtn = document.getElementById('gallery-lightbox-prev');
    const nextBtn = document.getElementById('gallery-lightbox-next');
    const cards = Array.from(document.querySelectorAll('.gallery-card'));
    if (!lightbox || !mediaHost || !closeBtn || !cards.length) return;

    // Ensure hidden from a11y tree initially
    lightbox.setAttribute('inert', '');

    let currentIndex = 0;
    let previousActiveElement = null;

    function renderCard(index) {
        currentIndex = (index + cards.length) % cards.length;
        const card = cards[currentIndex];
        const sourceMedia = card.querySelector('.gallery-card-media img, .gallery-card-media video');
        const title = card.querySelector('.gallery-card-body h3');
        const desc = card.querySelector('.gallery-card-body p');
        if (!sourceMedia) return;

        mediaHost.innerHTML = '';
        if (sourceMedia.tagName === 'IMG') {
            const img = document.createElement('img');
            img.src = sourceMedia.currentSrc || sourceMedia.src;
            img.alt = escapeHTML(sourceMedia.alt || 'Photo preview');
            mediaHost.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = sourceMedia.currentSrc || sourceMedia.querySelector('source')?.src || '';
            video.controls = true; video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
            mediaHost.appendChild(video);
        }
        if (titleEl) titleEl.textContent = title ? title.textContent : '';
        if (descEl) descEl.textContent = desc ? desc.textContent : '';
        if (prevBtn) prevBtn.setAttribute('aria-label', `Previous photo (${currentIndex + 1} of ${cards.length})`);
        if (nextBtn) nextBtn.setAttribute('aria-label', `Next photo (${currentIndex + 1} of ${cards.length})`);
    }

    function open(index) {
        previousActiveElement = document.activeElement;
        lightbox.removeAttribute('inert');
        renderCard(index);
        lightbox.classList.add('open');
        document.body.classList.add('menu-open'); 
        closeBtn.focus();
    }

    function close() {
        lightbox.setAttribute('inert', '');
        lightbox.classList.remove('open');
        document.body.classList.remove('menu-open');
        mediaHost.innerHTML = ''; 
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
            previousActiveElement.focus();
        }
    }

    function nav(delta) { renderCard(currentIndex + delta); }

    cards.forEach((card, i) => {
        const media = card.querySelector('.gallery-card-media');
        if (!media) return;
        media.addEventListener('click', (e) => {
            if (e.target.closest('[data-video-toggle]')) return; 
            open(i);
        });
    });

    closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', () => nav(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => nav(1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight') nav(1);
        if (e.key === 'ArrowLeft') nav(-1);

        if (e.key === 'Tab') {
            const focusables = Array.from(lightbox.querySelectorAll('button:not([disabled]), a[href]'));
            if (!focusables.length) return;
            const first = focusables[0]; const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
}

initGalleryLightbox();

// --- GALLERY: Video Controls & Fade In ---
(function initGalleryMediaHelpers() {
    document.querySelectorAll('[data-video-toggle]').forEach((btn) => {
        const video = btn.closest('.gallery-card-media')?.querySelector('video');
        if (!video) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.muted = !video.muted;
            btn.setAttribute('aria-label', video.muted ? 'Unmute preview' : 'Mute preview');
            btn.innerHTML = video.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
        });
    });

    document.querySelectorAll('.gallery-card-media img').forEach((img) => {
        if (img.complete && img.naturalWidth > 0) { img.classList.add('is-loaded'); }
        else {
            img.addEventListener('load', () => img.classList.add('is-loaded'));
            img.addEventListener('error', () => img.classList.add('is-loaded'));
        }
    });

    document.querySelectorAll('.gallery-card-media video').forEach((video) => {
        if (video.readyState >= 2) { video.classList.add('is-loaded'); }
        else { video.addEventListener('loadeddata', () => video.classList.add('is-loaded')); }
    });

    const videos = document.querySelectorAll('.gallery-card-media video');
    if (!videos.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const vid = entry.target;
            if (entry.isIntersecting) { vid.play().catch(() => {}); } else { vid.pause(); }
        });
    }, { threshold: 0.25 });
    videos.forEach((v) => observer.observe(v));
})();
