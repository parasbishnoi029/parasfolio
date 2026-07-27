/**
 * PARASFOLIO AI ASSISTANT
 * A lightweight, dependency-free chat widget that:
 *  1. Answers questions using a knowledge base built from this site's own content
 *     (about, education, skills, projects, achievements, contact).
 *  2. Pulls LIVE data from the public GitHub REST API for GitHub-related questions.
 *  3. Links out to the LinkedIn profile for LinkedIn-related questions. Note:
 *     LinkedIn has no public, unauthenticated API and blocks cross-origin scraping
 *     from the browser, so this widget cannot live-fetch LinkedIn content — it
 *     instead answers from the profile summary already published on this site
 *     and gives a direct link to the live profile.
 */
(function () {
    'use strict';

    const GH_USER = 'parasbishnoi029';
    const GITHUB_URL = `https://github.com/${GH_USER}`;
    const LINKEDIN_URL = 'https://linkedin.com/in/paras029';
    const EMAIL = 'parasbishnoi012@gmail.com';

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }

    function linkify(text) {
        // Turn bare URLs in an already-escaped string into clickable links.
        return text.replace(/(https?:\/\/[^\s]+)/g, (url) => {
            const clean = url.replace(/[.,)]+$/, '');
            const trail = url.slice(clean.length);
            return `<a href="${clean}" target="_blank" rel="noopener noreferrer">${clean}</a>${trail}`;
        });
    }

    // ---------------- Knowledge base (derived from this site's content) ----------------
    const KB = {
        greeting: `Hey! I'm ParasBot 👋 — ask me anything about Paras: his background, education, skills, projects, achievements, GitHub, LinkedIn, or how to get in touch.`,

        about: `Paras Bishnoi is a BS student in Applied AI & Data Science at IIT Jodhpur (2025–Present), currently at a CGPA of 8.375. He's a Navodayan (JNV alumnus) focused on Machine Learning, AI, Android and Web development, building robust, production-grade software at the intersection of deep neural analytics, mathematical modeling, and scalable data infrastructure. He's actively seeking machine learning internships, open-source collaborations, and data science roles.`,

        education: `Education timeline:
• IIT Jodhpur (2025–Present) — BS in Applied AI & Data Science, CGPA 8.375. Core focus: deep learning architectures, scalable data pipelines, MLOps, and advanced statistical algorithms.
• ALLEN Sikar / S.G.R. (2024–2025) — 12th Grade, Sikar, Rajasthan. JEE preparation and board diagnostics, intensive quantitative problem solving.
• JNV Sandhuan (2023–2024) — 11th Grade, Punjab.
• JNV Kikarwala Roopa (2018–2023) — 6th to 10th Grade, Punjab. Foundational reasoning modules.`,

        skills: `Tech stack:
• Core language: Python
• ML / Deep Learning: PyTorch, TensorFlow, Scikit-learn
• Data Science: Pandas, NumPy, Matplotlib
• NLP & Generative AI: LangChain, Gemini API, HuggingFace
• Also in the toolbox: Kotlin, Android Development, Next.js, Tailwind CSS, Supabase, Firebase, Git, GitHub, Power BI, Tableau`,

        projects: `Engineered systems / projects:
1. Neural Net From Scratch — a modular deep learning framework built purely in Python + NumPy (no PyTorch/TensorFlow), implementing forward/backward propagation, activation layers, and custom optimizers. ${GITHUB_URL}/neural-net-from-scratch
2. CodeBridge — an AI-powered IDE extension that translates legacy codebases into modern frameworks using Generative AI and LLM parsing. ${GITHUB_URL}/CodeBridge
3. AI Resume Analyser — an AI tool that parses and evaluates resumes. ${GITHUB_URL}/AI-Resume-Analyser
4. Course Recommendation Assistant — recommends courses using ML. ${GITHUB_URL}/-Course-Recommendation-Assistant
5. Job Pre-Screening Bot — a conversational AI that interviews candidates and extracts competency metrics. ${GITHUB_URL}/Job-Pre-Screening-Bot
6. ChatGPT Clone / Deployment — LLM API integration deployed to a scalable edge network on Vercel. ${GITHUB_URL}/chatgpt-vercel`,

        achievements: `Certifications & achievements:
• Machine Learning Foundation — verified credential covering supervised & unsupervised algorithms.
• Data Science Core — verified credential covering data analysis, cleaning, and pipeline structuring.
• Hackathon Participant — rapid-prototyped and deployed ML models under strict deadlines.
• Coursework & badges: Google AI Studio, Google Cloud Skills Boost, Kaggle, IIT Jodhpur coursework, with more certifications on the way.`,

        stats: `Quick stats: CGPA 8.375 • 5+ projects shipped • 10+ technologies used • started the AI journey in 2025.`,

        resume: `Paras's resume is downloadable directly from this site — look for the "Resume.pdf" button in the top navbar, the mobile menu, or the terminal panel in the Contact section.`,

        contact: `You can reach Paras here:
• Email: ${EMAIL}
• GitHub: ${GITHUB_URL}
• LinkedIn: ${LINKEDIN_URL}
• Resume: downloadable from the navbar/footer on this site
He's open to ML internships, open-source collaboration, and data science roles — say hello!`,

        linkedinStatic: `LinkedIn profile: ${LINKEDIN_URL}
Heads up: LinkedIn doesn't expose a public API and blocks browsers from reading profile pages cross-origin, so I can't pull live LinkedIn data the way I can with GitHub. From what's published: Paras Bishnoi is an Applied AI & Data Science student at IIT Jodhpur, focused on ML/DL, NLP, and full-stack development. Tap the link above for the live, up-to-date profile.`,

        fallback: `I'm not sure about that one — I know Paras's background, education, skills, projects, achievements, GitHub activity, LinkedIn, and contact info. Try one of the quick topics below, or ask me something like "what projects has Paras built?"`
    };

    const QUICK_REPLIES = [
        { label: 'About', intent: 'about' },
        { label: 'Education', intent: 'education' },
        { label: 'Skills', intent: 'skills' },
        { label: 'Projects', intent: 'projects' },
        { label: 'GitHub', intent: 'github' },
        { label: 'LinkedIn', intent: 'linkedin' },
        { label: 'Achievements', intent: 'achievements' },
        { label: 'Contact', intent: 'contact' },
    ];

    // ---------------- Live GitHub lookup ----------------
    let ghCache = null;
    async function fetchGithubSummary() {
        if (ghCache) return ghCache;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const [userRes, reposRes] = await Promise.all([
                fetch(`https://api.github.com/users/${GH_USER}`, { signal: controller.signal }),
                fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`, { signal: controller.signal })
            ]);
            clearTimeout(timer);
            if (!userRes.ok || !reposRes.ok) throw new Error('GitHub API error');

            const user = await userRes.json();
            const repos = await reposRes.json();
            const nonForks = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
            const pool = nonForks.length ? nonForks : repos;
            const totalStars = pool.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
            const top = [...pool]
                .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0) || new Date(b.pushed_at) - new Date(a.pushed_at))
                .slice(0, 5);
            const topList = top
                .map((r) => `  – ${r.name}${r.stargazers_count ? ` (${r.stargazers_count}★)` : ''}${r.description ? `: ${r.description}` : ''}`)
                .join('\n');

            ghCache = `Live from GitHub (@${GH_USER}):
• ${user.public_repos} public repos, ${user.followers} followers, ${user.following} following
• ${totalStars}★ total across repos
${user.bio ? `• Bio: ${user.bio}\n` : ''}Top repos:
${topList || '  – (no repos returned)'}
Full profile: ${GITHUB_URL}`;
            return ghCache;
        } catch (err) {
            return `I couldn't reach the live GitHub API just now (rate limit or network hiccup), but here's the profile directly: ${GITHUB_URL}
Pinned AI repos include Neural Net From Scratch, CodeBridge, and AI Resume Analyser.`;
        }
    }

    // ---------------- Intent matching ----------------
    function getIntent(raw) {
        const t = raw.toLowerCase().trim();
        if (/^(hi|hello|hey|yo)\b/.test(t) && t.length < 16) return 'greeting';
        if (/(github|repo|repositor|open source|open-source)/.test(t)) return 'github';
        if (/(linkedin)/.test(t)) return 'linkedin';
        if (/(resume|cv\b)/.test(t)) return 'resume';
        if (/(contact|email|reach|hire|internship|collab)/.test(t)) return 'contact';
        if (/(project|system|built|build|portfolio work|repositories)/.test(t)) return 'projects';
        if (/(skill|stack|tech|language|tool|framework)/.test(t)) return 'skills';
        if (/(educat|college|school|degree|cgpa|study|studies|jnv|iit|university)/.test(t)) return 'education';
        if (/(award|certificat|achievement|credential|hackathon)/.test(t)) return 'achievements';
        if (/(stat|number|figure|cgpa)/.test(t)) return 'stats';
        if (/(who is|who are you|about paras|tell me about|introduce|bio|background)/.test(t)) return 'about';
        return 'fallback';
    }

    async function answerFor(intent) {
        switch (intent) {
            case 'github':
                return fetchGithubSummary();
            case 'linkedin':
                return KB.linkedinStatic;
            default:
                return KB[intent] || KB.fallback;
        }
    }

    // ---------------- UI construction ----------------
    let panelOpen = false;
    let previousActiveElement = null;

    function buildWidget() {
        const toggle = document.createElement('button');
        toggle.id = 'chatbot-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Open AI assistant chat');
        toggle.setAttribute('aria-haspopup', 'dialog');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.className = 'hover-target';
        toggle.innerHTML = `<i class="fa-solid fa-comment-dots" aria-hidden="true"></i><span class="chatbot-badge">AI</span>`;

        const panel = document.createElement('div');
        panel.id = 'chatbot-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'false');
        panel.setAttribute('aria-label', 'ParasBot AI assistant');
        panel.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-title">
                    <span class="chatbot-dot" aria-hidden="true"></span>
                    <div>
                        ParasBot
                        <span class="chatbot-header-sub">Ask about this portfolio, GitHub & LinkedIn</span>
                    </div>
                </div>
                <button type="button" id="chatbot-close" class="hover-target" aria-label="Close chat">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </div>
            <div id="chatbot-messages" role="log" aria-live="polite"></div>
            <div id="chatbot-quick-replies"></div>
            <div id="chatbot-input-row">
                <input type="text" id="chatbot-input" placeholder="Ask me anything about Paras…" autocomplete="off" aria-label="Type your question">
                <button type="button" id="chatbot-send" class="hover-target" aria-label="Send message">
                    <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toggle);
        document.body.appendChild(panel);

        const messagesHost = panel.querySelector('#chatbot-messages');
        const quickRepliesHost = panel.querySelector('#chatbot-quick-replies');
        const input = panel.querySelector('#chatbot-input');
        const sendBtn = panel.querySelector('#chatbot-send');
        const closeBtn = panel.querySelector('#chatbot-close');

        function renderQuickReplies() {
            quickRepliesHost.innerHTML = '';
            QUICK_REPLIES.forEach(({ label, intent }) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'chatbot-chip hover-target';
                chip.textContent = label;
                chip.addEventListener('click', () => handleUserMessage(label, intent));
                quickRepliesHost.appendChild(chip);
            });
        }

        function appendMessage(role, text) {
            const bubble = document.createElement('div');
            bubble.className = `chatbot-msg ${role}`;
            bubble.innerHTML = linkify(escapeHTML(text));
            messagesHost.appendChild(bubble);
            messagesHost.scrollTop = messagesHost.scrollHeight;
            return bubble;
        }

        function showTyping() {
            const typing = document.createElement('div');
            typing.className = 'chatbot-typing';
            typing.innerHTML = '<span></span><span></span><span></span>';
            messagesHost.appendChild(typing);
            messagesHost.scrollTop = messagesHost.scrollHeight;
            return typing;
        }

        async function handleUserMessage(displayText, forcedIntent) {
            if (!displayText.trim()) return;
            appendMessage('user', displayText);
            input.value = '';
            sendBtn.disabled = true;

            const typing = showTyping();
            const intent = forcedIntent || getIntent(displayText);
            const reply = await answerFor(intent);
            typing.remove();
            appendMessage('bot', reply);
            sendBtn.disabled = false;
            input.focus();
        }

        sendBtn.addEventListener('click', () => handleUserMessage(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleUserMessage(input.value);
        });

        function openPanel() {
            panelOpen = true;
            previousActiveElement = document.activeElement;
            panel.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
            if (!messagesHost.childElementCount) {
                appendMessage('bot', KB.greeting);
                renderQuickReplies();
            }
            input.focus();
        }

        function closePanel() {
            panelOpen = false;
            panel.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
                previousActiveElement.focus();
            }
        }

        toggle.addEventListener('click', () => (panelOpen ? closePanel() : openPanel()));
        closeBtn.addEventListener('click', closePanel);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panelOpen) closePanel();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
        buildWidget();
    }
})();
