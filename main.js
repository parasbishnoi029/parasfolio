        /**
         * PARASFOLIO CORE LOGIC
         * Handles Custom Cursor, CSS 3D Tilt, GSAP ScrollTriggers, and Three.js 3D Environment.
         */
 
        // --- 0A. DECORATIVE ACTIVITY GRID (replaces a legacy document.write call) ---
        (function initHeatmapGrid() {
            const host = document.getElementById('gh-heatmap-grid');
            if (!host) return;
            const frag = document.createDocumentFragment();
            for (let i = 0; i < 120; i++) {
                const val = Math.random();
                let cls = 'bg-white/5';
                if (val > 0.90) cls = 'bg-[#39d353]';
                else if (val > 0.70) cls = 'bg-[#26a641]';
                else if (val > 0.50) cls = 'bg-[#006d32]';
                else if (val > 0.30) cls = 'bg-[#0e4429]';
                const cell = document.createElement('div');
                cell.className = `w-3 h-3 md:w-4 md:h-4 rounded-sm shrink-0 ${cls} transition-colors duration-300 hover:bg-white`;
                frag.appendChild(cell);
            }
            host.appendChild(frag);
        })();

        // --- 0. MOBILE SLIDE-OUT MENU ---
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        const menuBackdrop = document.getElementById('mobile-menu-backdrop');
        const menuIcon = menuToggle ? menuToggle.querySelector('i') : null;

        function openMobileMenu() {
            mobileMenu.classList.add('open');
            menuBackdrop.classList.add('open');
            document.body.classList.add('menu-open');
            menuToggle.setAttribute('aria-expanded', 'true');
            mobileMenu.setAttribute('aria-hidden', 'false');
            if (menuIcon) { menuIcon.classList.remove('fa-bars-staggered'); menuIcon.classList.add('fa-xmark'); }
        }

        function closeMobileMenu() {
            mobileMenu.classList.remove('open');
            menuBackdrop.classList.remove('open');
            document.body.classList.remove('menu-open');
            menuToggle.setAttribute('aria-expanded', 'false');
            mobileMenu.setAttribute('aria-hidden', 'true');
            if (menuIcon) { menuIcon.classList.remove('fa-xmark'); menuIcon.classList.add('fa-bars-staggered'); }
        }

        if (menuToggle && mobileMenu && menuBackdrop) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
            });
            menuBackdrop.addEventListener('click', closeMobileMenu);
            mobileMenu.querySelectorAll('.mobile-nav-link').forEach((link) => {
                link.addEventListener('click', closeMobileMenu);
            });
            window.addEventListener('resize', () => {
                if (window.innerWidth >= 1024) closeMobileMenu();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeMobileMenu();
            });
        }

        // --- 0B. LIVE "CONNECTION PORT" STATUS BADGE ---
        // Reflects an actual IST-based availability window, and clicking it now
        // copies the contact email with a visible confirmation state — a scroll-to
        // action gave no feedback since the email link was usually already on screen.
        (function initStatusBadge() {
            const badge = document.getElementById('status-badge');
            const label = document.getElementById('status-badge-text');
            if (!badge || !label) return;

            const EMAIL = 'paras.iitj@gmail.com';
            let confirming = false;

            function isAvailableNowIST() {
                const now = new Date();
                const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
                const istMinutes = (utcMinutes + 330) % 1440; // IST = UTC+5:30
                const istHour = Math.floor(istMinutes / 60);
                // Treat 08:00–23:00 IST as "open", the rest as "away"
                return istHour >= 8 && istHour < 23;
            }

            function render() {
                if (confirming) return;
                const open = isAvailableNowIST();
                badge.classList.toggle('is-away', !open);
                label.textContent = open ? 'Connection Port Open' : 'Connection Port — Away';
            }

            async function handleClick() {
                confirming = true;
                badge.classList.remove('is-away');
                badge.classList.add('is-copied');
                try {
                    await navigator.clipboard.writeText(EMAIL);
                    label.textContent = 'Email Copied!';
                } catch (err) {
                    label.textContent = 'Scroll to Email ↓';
                    const emailLink = document.querySelector('a[href^="mailto:"]');
                    if (emailLink) emailLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                setTimeout(() => {
                    badge.classList.remove('is-copied');
                    confirming = false;
                    render();
                }, 1800);
            }

            badge.addEventListener('click', handleClick);

            render();
            setInterval(render, 60000);
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

        // --- 0E. LIVE GITHUB STATS (real data via the public REST API) ---
        // Replaces the previously hardcoded, fabricated "1,240 commits" figure
        // and static pinned-project chips with real numbers pulled live from
        // GitHub. No auth token needed for public read-only endpoints; this
        // fails silently and keeps the existing static fallback content if
        // the API is unreachable or rate-limited.
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

            fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`, {
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
                        if (topLanguage) parts.push(`mostly ${topLanguage[0]}`);
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
                                return `<a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="hover-target flex items-center gap-2 bg-white/5 border border-white/10 hover:border-${color}/50 hover:text-${color} px-4 py-2 rounded-full text-xs font-mono text-gray-300 transition-colors" title="Updated ${timeAgo(repo.pushed_at)}">
                                    <i class="fa-solid fa-code-branch text-[10px]"></i> ${repo.name}${stars}
                                </a>`;
                            }).join('') + `<a href="https://github.com/${GH_USER}?tab=repositories" target="_blank" rel="noopener noreferrer" class="hover-target flex items-center gap-2 text-xs font-mono text-white px-4 py-2 uppercase tracking-widest hover:text-primary transition-colors">View All <i class="fa-solid fa-arrow-right ml-1"></i></a>`;
                        }
                    }
                })
                .catch(() => {
                    // Network error or API rate limit hit — leave the static
                    // fallback markup already in the page untouched.
                    if (statEl) statEl.textContent = 'Live stats unavailable — see GitHub';
                });
        })();

        // --- 0F. INTERACTIVE LIVE DEMO PANEL ---
        // Toggles an embedded preview of a hosted model (Hugging Face Space,
        // Streamlit app, etc). To go live: set data-demo-url="https://your-space-url"
        // on the trigger button — everything else activates automatically.
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
                                panel.innerHTML = `<iframe src="${demoUrl}" loading="lazy" title="Live interactive demo" allow="clipboard-write"></iframe>`;
                            } else {
                                panel.innerHTML = `
                                    <div class="demo-panel-placeholder">
                                        <i class="fa-solid fa-plug-circle-bolt"></i>
                                        <h4 class="font-display text-lg font-bold text-white mb-2">No live preview connected yet</h4>
                                        <p class="text-sm text-gray-400 font-light max-w-md mx-auto leading-relaxed">
                                            This slot is wired up to embed a hosted model — a Hugging Face Space or Streamlit app —
                                            the moment one is deployed. Until then, check out the source or the APK demo above.
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

        // --- 1. CUSTOM CURSOR INTEGRATION ---
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorRing = document.querySelector('.cursor-ring');
        
        window.addEventListener('mousemove', (e) => {
            cursorDot.style.left = `${e.clientX}px`; 
            cursorDot.style.top = `${e.clientY}px`;
            cursorRing.animate({ 
                left: `${e.clientX}px`, 
                top: `${e.clientY}px` 
            }, { duration: 100, fill: "forwards" });
        });
        
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
 
        // --- 2. CSS 3D IN-CONTEXT HOVER EFFECT ---
        document.querySelectorAll('.interactive-3d').forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left; 
                const y = e.clientY - rect.top;  
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const tiltX = (y - centerY) / 20; 
                const tiltY = (centerX - x) / 20;
                
                el.style.transform = `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });
        });

        // --- 2B. GALLERY CARD 3D TILT (separate from .interactive-3d so hover scale/opacity stack cleanly) ---
        document.querySelectorAll('.gallery-card-inner').forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const tiltX = ((y - rect.height / 2) / rect.height) * -10;
                const tiltY = ((x - rect.width / 2) / rect.width) * 10;
                el.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = `rotateX(0deg) rotateY(0deg)`;
            });
        });
 
        // --- 3. ADVANCED THREE.JS WEBGL ARCHITECTURE ---
        // Disabled on mobile/small screens to save battery, CPU and avoid jank.
        const isMobileDevice = window.innerWidth < 768;
        let canvas, scene, camera, renderer, terrain, dust, avatar3DGroup, coreMesh, outerHaloMesh;

        if (isMobileDevice) {
            const wc = document.getElementById('webgl-canvas');
            if (wc) wc.style.display = 'none';
        } else {
        canvas = document.getElementById('webgl-canvas');
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x030305, 0.012);
 
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 30); 
 
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 
        // LIGHTING
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
        scene.add(ambientLight);
        
        const pointLight1 = new THREE.PointLight(0x00F2FE, 6, 100); 
        pointLight1.position.set(10, 10, 10); 
        scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x9D4EDD, 6, 100); 
        pointLight2.position.set(-10, -10, 10); 
        scene.add(pointLight2);
 
        // --- 3A. THE DIGITAL TERRAIN (FLOOR) ---
        const terrainGeo = new THREE.PlaneGeometry(200, 300, 50, 75);
        const pos = terrainGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const z = Math.sin(pos.getX(i) * 0.1) * Math.cos(pos.getY(i) * 0.1) * 4;
            pos.setZ(i, z);
        }
        terrainGeo.computeVertexNormals();
        const terrainMat = new THREE.MeshStandardMaterial({ 
            color: 0x00F2FE, 
            wireframe: true, 
            transparent: true, 
            opacity: 0.08 
        });
        terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.y = -20;
        terrain.position.z = -50;
        scene.add(terrain);
 
        // --- 3B. BACKGROUND PARTICLES (DEEP TUNNEL) ---
        const pGeo = new THREE.BufferGeometry();
        const pCount = 4000;
        const pPos = new Float32Array(pCount * 3);
        for(let i = 0; i < pCount * 3; i+=3) {
            pPos[i] = (Math.random() - 0.5) * 200;       
            pPos[i+1] = (Math.random() - 0.5) * 200;     
            pPos[i+2] = (Math.random() - 0.5) * 300 - 50; 
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({ 
            size: 0.05, 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.3 
        });
        dust = new THREE.Points(pGeo, pMat);
        scene.add(dust);

        // --- 3C. THE 3D HOLOGRAPHIC AVATAR BACKGROUND CORE ---
        avatar3DGroup = new THREE.Group();
        const coreGeo = new THREE.IcosahedronGeometry(4, 2);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x00F2FE, wireframe: true, transparent: true, opacity: 0.6 });
        coreMesh = new THREE.Mesh(coreGeo, coreMat);
        
        const outerHaloGeo = new THREE.IcosahedronGeometry(5.5, 3);
        const outerHaloMat = new THREE.PointsMaterial({ size: 0.08, color: 0x9D4EDD, transparent: true, opacity: 0.4 });
        outerHaloMesh = new THREE.Points(outerHaloGeo, outerHaloMat);
        
        avatar3DGroup.add(coreMesh);
        avatar3DGroup.add(outerHaloMesh);
        avatar3DGroup.position.set(12, 0, -10); // Placed deep behind the vertical card spot
        scene.add(avatar3DGroup);
        } // end desktop-only Three.js setup
 
        // --- 4. PRELOADER & INITIAL GSAP ENTRANCE ANIMATIONS ---
        gsap.registerPlugin(ScrollTrigger);
        if (isMobileDevice) {
            // Skip heavy scroll recalculations from Three.js resizes on mobile
            ScrollTrigger.config({ ignoreMobileResize: true });
            // Shorter, snappier animations on mobile so scroll reveals don't feel laggy
            gsap.defaults({ duration: 0.4 });
        }
        
        window.addEventListener('load', () => {
            gsap.to('#load-bar', { width: '100%', duration: 1.5, ease: 'power2.inOut', onUpdate: function() {
                document.getElementById('loading-percentage').innerText = Math.round(this.progress() * 100) + '%';
            }, onComplete: () => {
                
                gsap.to('#loader', { opacity: 0, duration: 0.8, onComplete: () => {
                    document.getElementById('loader').style.display = 'none';
                    
                    const avatarCard = document.getElementById('hero-avatar');
                    if(avatarCard) {
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
                            y: 80, 
                            opacity: 0, 
                            duration: 1.2, 
                            ease: 'power3.out', 
                            scrollTrigger: { 
                                trigger: elem, 
                                start: 'top 85%' 
                            }
                        });
                    }
                });

                // --- GALLERY: PINNED HORIZONTAL SCROLL SETUP ---
                initGalleryScroll();
            }});
        });

        // --- GALLERY SCROLL LOGIC ---
        function initGalleryScroll() {
            const pinWrap = document.getElementById('gallery-pin');
            const track = document.getElementById('gallery-track');
            const cards = gsap.utils.toArray('.gallery-card');
            const progressFill = document.getElementById('gallery-progress-fill');
            const counterEl = document.getElementById('gallery-counter');
            const prevBtn = document.getElementById('gallery-prev');
            const nextBtn = document.getElementById('gallery-next');
            const dotsWrap = document.getElementById('gallery-dots');
            if (!pinWrap || !track || !cards.length) return;

            const pad = (n) => String(n).padStart(2, '0');
            const setCounter = (i) => {
                if (counterEl) counterEl.textContent = `${pad(i + 1)} / ${pad(cards.length)}`;
            };
            setCounter(0);

            // Build pagination dots once, wired to whichever navigation path (GSAP or native) is active
            let dots = [];
            if (dotsWrap) {
                dotsWrap.innerHTML = '';
                dots = cards.map((_, i) => {
                    const dot = document.createElement('button');
                    dot.type = 'button';
                    dot.className = 'gallery-dot' + (i === 0 ? ' is-active' : '');
                    dot.setAttribute('aria-label', `Go to project ${i + 1}`);
                    dot.setAttribute('role', 'tab');
                    dotsWrap.appendChild(dot);
                    return dot;
                });
            }
            const setActiveDot = (i) => {
                dots.forEach((d, di) => d.classList.toggle('is-active', di === i));
            };

            // Respect reduced-motion: skip page scroll-jacking entirely and fall back
            // to a native, swipe/scroll-friendly horizontal strip with snap points.
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
                const step = () => cards[0].getBoundingClientRect().width + 32; // approx gap
                const updateNative = () => {
                    const idx = Math.min(cards.length - 1, Math.max(0, Math.round(pinWrap.scrollLeft / step())));
                    setCounter(idx);
                    setActiveDot(idx);
                    if (progressFill) progressFill.style.width = `${(idx / (cards.length - 1)) * 100}%`;
                };
                pinWrap.addEventListener('scroll', updateNative, { passive: true });
                dots.forEach((dot, i) => dot.addEventListener('click', () => {
                    pinWrap.scrollTo({ left: i * step(), behavior: 'smooth' });
                }));
                updateNative();
                return;
            }

            const getScrollDistance = () => Math.max(track.scrollWidth - pinWrap.clientWidth, 0);
            let currentIndex = 0;

            const updateNavState = () => {
                if (prevBtn) prevBtn.disabled = currentIndex === 0;
                if (nextBtn) nextBtn.disabled = currentIndex === cards.length - 1;
                setActiveDot(currentIndex);
            };
            updateNavState();

            const galleryTween = gsap.to(track, {
                x: () => -getScrollDistance(),
                ease: 'none',
                force3D: true,
                scrollTrigger: {
                    trigger: pinWrap,
                    start: 'top top',
                    end: () => `+=${getScrollDistance() + window.innerHeight * 0.5}`,
                    scrub: 1,
                    pin: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => {
                        if (progressFill) progressFill.style.width = `${self.progress * 100}%`;
                        const idx = Math.min(cards.length - 1, Math.round(self.progress * (cards.length - 1)));
                        if (idx !== currentIndex) {
                            currentIndex = idx;
                            updateNavState();
                        }
                        setCounter(currentIndex);
                    }
                }
            });

            // Scale & fade each card as it nears the viewport center
            cards.forEach((card) => {
                gsap.fromTo(card,
                    { scale: 0.85, opacity: 0.5 },
                    {
                        scale: 1,
                        opacity: 1,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: card,
                            containerAnimation: galleryTween,
                            start: 'left 78%',
                            end: 'left 35%',
                            scrub: true
                        }
                    }
                );
            });

            function goToIndex(i) {
                const clamped = Math.min(Math.max(i, 0), cards.length - 1);
                const st = galleryTween.scrollTrigger;
                const targetProgress = clamped / (cards.length - 1);
                const targetScroll = st.start + targetProgress * (st.end - st.start);
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }

            if (prevBtn) prevBtn.addEventListener('click', () => goToIndex(currentIndex - 1));
            if (nextBtn) nextBtn.addEventListener('click', () => goToIndex(currentIndex + 1));
            dots.forEach((dot, i) => dot.addEventListener('click', () => goToIndex(i)));

            // Arrow-key navigation while the gallery is roughly centered in view
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

            // Touch swipe support (mobile/trackpad-less touch devices)
            let touchStartX = 0;
            let touchStartY = 0;
            pinWrap.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            pinWrap.addEventListener('touchend', (e) => {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return; // ignore vertical scrolls
                goToIndex(currentIndex + (dx < 0 ? 1 : -1));
            }, { passive: true });

            ScrollTrigger.refresh();
        }

        // --- GALLERY LIGHTBOX: click a card's media to view it larger ---
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

            let currentIndex = 0;

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
                    img.alt = sourceMedia.alt || '';
                    mediaHost.appendChild(img);
                } else {
                    const video = document.createElement('video');
                    video.src = sourceMedia.currentSrc || sourceMedia.querySelector('source')?.src || '';
                    video.controls = true;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    mediaHost.appendChild(video);
                }
                if (titleEl) titleEl.textContent = title ? title.textContent : '';
                if (descEl) descEl.textContent = desc ? desc.textContent : '';
                if (prevBtn) prevBtn.setAttribute('aria-label', `Previous project (${currentIndex} of ${cards.length})`);
                if (nextBtn) nextBtn.setAttribute('aria-label', `Next project (${currentIndex + 2 > cards.length ? 1 : currentIndex + 2} of ${cards.length})`);
            }

            function open(index) {
                renderCard(index);
                lightbox.classList.add('open');
                lightbox.setAttribute('aria-hidden', 'false');
                document.body.classList.add('menu-open'); // reuse existing overflow:hidden helper
                closeBtn.focus();
            }

            function close() {
                lightbox.classList.remove('open');
                lightbox.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('menu-open');
                mediaHost.innerHTML = ''; // stop any playing video
            }

            function nav(delta) {
                renderCard(currentIndex + delta);
            }

            cards.forEach((card, i) => {
                const media = card.querySelector('.gallery-card-media');
                if (!media) return;
                media.addEventListener('click', (e) => {
                    if (e.target.closest('[data-video-toggle]')) return; // don't open when toggling sound
                    open(i);
                });
            });
            closeBtn.addEventListener('click', close);
            prevBtn?.addEventListener('click', () => nav(-1));
            nextBtn?.addEventListener('click', () => nav(1));
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) close();
            });
            document.addEventListener('keydown', (e) => {
                if (!lightbox.classList.contains('open')) return;
                if (e.key === 'Escape') close();
                if (e.key === 'ArrowRight') nav(1);
                if (e.key === 'ArrowLeft') nav(-1);
            });
        }
        initGalleryLightbox();

        // --- GALLERY: per-card video sound toggle ---
        (function initGalleryVideoToggle() {
            document.querySelectorAll('[data-video-toggle]').forEach((btn) => {
                const video = btn.closest('.gallery-card-media')?.querySelector('video');
                if (!video) return;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    video.muted = !video.muted;
                    btn.setAttribute('aria-label', video.muted ? 'Unmute preview' : 'Mute preview');
                    btn.innerHTML = video.muted
                        ? '<i class="fa-solid fa-volume-xmark"></i>'
                        : '<i class="fa-solid fa-volume-high"></i>';
                });
            });
        })();

        // --- GALLERY: fade images/video in once actually loaded, instead of popping in ---
        (function initGalleryMediaFadeIn() {
            document.querySelectorAll('.gallery-card-media img').forEach((img) => {
                if (img.complete && img.naturalWidth > 0) {
                    img.classList.add('is-loaded');
                } else {
                    img.addEventListener('load', () => img.classList.add('is-loaded'));
                    img.addEventListener('error', () => img.classList.add('is-loaded'));
                }
            });
            document.querySelectorAll('.gallery-card-media video').forEach((video) => {
                if (video.readyState >= 2) {
                    video.classList.add('is-loaded');
                } else {
                    video.addEventListener('loadeddata', () => video.classList.add('is-loaded'));
                }
            });
        })();

        // --- GALLERY VIDEO: pause when off-screen to save battery/bandwidth ---
        (function initGalleryVideoVisibility() {
            const videos = document.querySelectorAll('.gallery-card-media video');
            if (!videos.length || !('IntersectionObserver' in window)) return;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const vid = entry.target;
                    if (entry.isIntersecting) {
                        vid.play().catch(() => {});
                    } else {
                        vid.pause();
                    }
                });
            }, { threshold: 0.25 });
            videos.forEach((v) => observer.observe(v));
        })();
 
        // --- 5. SCROLL-DRIVEN 3D CAMERA FLIGHT ---
        if (!isMobileDevice) {
        gsap.to(camera.position, {
            z: -150, 
            ease: "none",
            scrollTrigger: {
                trigger: "#scroll-container",
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5 
            }
        });
 
        gsap.to(dust.rotation, {
            z: Math.PI / 4,
            ease: "none",
            scrollTrigger: {
                trigger: "#scroll-container",
                start: "top top",
                end: "bottom bottom",
                scrub: 2
            }
        });
        } // end desktop-only scroll-driven camera/dust tweens
 
        // --- 6. MOUSE PARALLAX TRACKING LOGIC ---
        let mouseX = 0, mouseY = 0;
        let targetX = 0, targetY = 0;
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;
 
        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX - windowHalfX);
            mouseY = (event.clientY - windowHalfY);
        });
 
        window.addEventListener('resize', () => {
            if (isMobileDevice || !camera || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight; 
            camera.updateProjectionMatrix(); 
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
 
        // --- 7. GLOBAL RENDER LOOP (desktop only) ---
        if (!isMobileDevice) {
        const clock = new THREE.Clock();
        
        function animate() {
            requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
 
            terrain.position.z = (t * 5) % 20 - 50;
            dust.rotation.y = t * 0.02;
            
            // Spin background abstract core avatar
            coreMesh.rotation.x = t * 0.4;
            coreMesh.rotation.y = t * 0.5;
            outerHaloMesh.rotation.z = -t * 0.15;
 
            targetX = mouseX * 0.005;
            targetY = mouseY * 0.005;
            camera.position.x += (targetX - camera.position.x) * 0.05;
            camera.position.y += (-targetY - camera.position.y) * 0.05;
            
            camera.lookAt(camera.position.x, camera.position.y, camera.position.z - 50);
 
            renderer.render(scene, camera);
        }
 
        animate(); 
        } // end desktop-only render loop
