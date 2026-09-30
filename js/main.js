(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    // ===== Footer year =====
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ===== Theme toggle (circular reveal where supported) =====
    const themeToggle = $('#themeToggle');
    const setTheme = (theme) => {
        root.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) { /* storage unavailable */ }
        themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#f7f7fb');
    };
    setTheme(root.getAttribute('data-theme') || 'dark');

    themeToggle.addEventListener('click', (e) => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

        if (!document.startViewTransition || reduceMotion) {
            root.classList.add('theme-transition');
            setTheme(next);
            setTimeout(() => root.classList.remove('theme-transition'), 550);
            return;
        }

        const x = e.clientX || window.innerWidth - 40;
        const y = e.clientY || 36;
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const transition = document.startViewTransition(() => setTheme(next));
        transition.ready.then(() => {
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
            );
        });
    });

    // ===== Mobile navigation =====
    const navToggle = $('#navToggle');
    const navMenu = $('#navMenu');
    const setMenu = (open) => {
        navMenu.classList.toggle('active', open);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.querySelector('use').setAttribute('href', open ? '#i-xmark' : '#i-bars');
    };
    navToggle.addEventListener('click', () => setMenu(!navMenu.classList.contains('active')));
    $$('a', navMenu).forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('active') && !e.target.closest('.navbar')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });

    // ===== Active nav link with sliding indicator =====
    const navLinks = $$('.navbar-nav a');
    const indicator = $('.nav-indicator');
    const moveIndicator = (link) => {
        if (!indicator) return;
        if (!link) {
            indicator.style.opacity = '0';
            return;
        }
        indicator.style.width = `${link.offsetWidth}px`;
        indicator.style.transform = `translateX(${link.offsetLeft}px)`;
        indicator.style.opacity = '1';
    };
    const setActive = (id) => {
        let activeLink = null;
        navLinks.forEach(link => {
            const on = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('active', on);
            if (on) {
                link.setAttribute('aria-current', 'true');
                activeLink = link;
            } else {
                link.removeAttribute('aria-current');
            }
        });
        moveIndicator(activeLink);
    };

    const sections = navLinks
        .map(link => document.getElementById(link.getAttribute('href').slice(1)))
        .filter(Boolean);
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) setActive(entry.target.id);
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(section => sectionObserver.observe(section));
    const heroObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) setActive(null);
    }, { rootMargin: '-45% 0px -50% 0px' });
    heroObserver.observe($('#hero'));
    window.addEventListener('resize', () => moveIndicator($('.navbar-nav a.active')));

    // ===== Scroll-driven UI (progress bar, navbar, back-to-top, timeline) =====
    const navbar = $('.navbar');
    const progressBar = $('.scroll-progress');
    const backToTop = $('#backToTop');
    const ringProgress = $('.back-to-top .progress');
    const ringLength = 144.5;
    const timeline = $('.experience-timeline');
    const timelineFill = $('.timeline-line-fill');
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(y / max, 1) : 0;

        progressBar.style.transform = `scaleX(${ratio})`;
        ringProgress.style.strokeDashoffset = String(ringLength * (1 - ratio));

        navbar.classList.toggle('scrolled', y > 40);
        const menuOpen = navMenu.classList.contains('active');
        navbar.classList.toggle('hidden', !menuOpen && y > 600 && y > lastY + 4);
        if (y < lastY - 4) navbar.classList.remove('hidden');

        backToTop.classList.toggle('visible', y > 600);

        if (timeline && timelineFill) {
            const rect = timeline.getBoundingClientRect();
            const progress = (window.innerHeight * 0.6 - rect.top) / rect.height;
            timelineFill.style.transform = `scaleY(${Math.max(0, Math.min(progress, 1))})`;
        }

        lastY = y;
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(onScroll);
            ticking = true;
        }
    }, { passive: true });
    onScroll();

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // ===== Typing effect for hero role =====
    const typed = $('.hero-role .typed');
    if (typed) {
        const words = JSON.parse(typed.dataset.words || '[]');
        if (words.length && !reduceMotion) {
            let w = 0;
            let c = words[0].length;
            let deleting = true;
            const tick = () => {
                const word = words[w];
                c += deleting ? -1 : 1;
                typed.textContent = word.slice(0, c);
                let delay = deleting ? 35 : 70;
                if (!deleting && c === word.length) {
                    deleting = true;
                    delay = 2200;
                } else if (deleting && c === 0) {
                    deleting = false;
                    w = (w + 1) % words.length;
                    delay = 350;
                }
                setTimeout(tick, delay);
            };
            setTimeout(tick, 2600);
        }
    }

    // ===== Scroll reveal =====
    const revealGroups = [
        '.section-heading',
        '.about-text',
        '.stat-card',
        '.timeline-item',
        '.skill-category',
        '.project-filters',
        '.project-card',
        '.publication-card',
        '.education-card',
        '.contact-card',
        '.clients'
    ];
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealGroups.forEach(selector => {
        $$(selector).forEach(el => {
            const siblings = [...el.parentElement.children].filter(s => s.matches(selector));
            el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 5) * 0.1}s`);
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
    });

    // Stagger index for tag clouds
    $$('.reveal-stagger').forEach(group => {
        [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
    });

    // ===== Animated stat counters =====
    const animateCount = (el) => {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        if (reduceMotion) {
            el.textContent = target + suffix;
            return;
        }
        const duration = 1600;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 4);
            el.textContent = Math.round(target * eased) + suffix;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.6 });
    $$('.stat-number[data-count]').forEach(el => statObserver.observe(el));

    // ===== Cursor spotlight on cards =====
    if (window.matchMedia('(hover: hover)').matches) {
        $$('.spotlight').forEach(card => {
            card.addEventListener('pointermove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                card.style.setProperty('--my', `${e.clientY - rect.top}px`);
            });
        });
    }

    // ===== Read more (smooth height) =====
    const collapsedHeight = (desc) => parseFloat(getComputedStyle(desc).lineHeight) * 5;
    const setupReadMore = () => {
        $$('.card-desc').forEach(desc => {
            const btn = desc.nextElementSibling;
            if (!btn || !btn.classList.contains('read-more-btn')) return;
            if (desc.classList.contains('expanded')) return;
            const needsClamp = desc.scrollHeight > collapsedHeight(desc) + 2;
            btn.hidden = !needsClamp;
            desc.classList.toggle('no-clamp', !needsClamp);
        });
    };
    $$('.read-more-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const desc = btn.previousElementSibling;
            const expanded = !desc.classList.contains('expanded');
            desc.classList.toggle('expanded', expanded);
            desc.style.maxHeight = expanded ? `${desc.scrollHeight}px` : '';
            btn.setAttribute('aria-expanded', String(expanded));
            btn.querySelector('.label').textContent = expanded ? 'Read Less' : 'Read More';
        });
    });
    setupReadMore();
    window.addEventListener('resize', setupReadMore);
    if (document.fonts) document.fonts.ready.then(setupReadMore);

    // ===== Project filters =====
    const filterWrap = $('.project-filters');
    const filterIndicator = $('.filter-indicator');
    const filterBtns = $$('.filter-btn');
    const cards = $$('.project-card');

    const moveFilterIndicator = (btn) => {
        filterIndicator.style.width = `${btn.offsetWidth}px`;
        filterIndicator.style.height = `${btn.offsetHeight}px`;
        filterIndicator.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
    };

    filterBtns.forEach(btn => {
        const f = btn.dataset.filter;
        const count = f === 'all' ? cards.length : cards.filter(c => c.dataset.category.split(' ').includes(f)).length;
        btn.insertAdjacentHTML('beforeend', ` <span class="count">${count}</span>`);
    });

    const applyFilter = (filter) => {
        const matches = (card) => filter === 'all' || card.dataset.category.split(' ').includes(filter);
        const visible = cards.filter(c => !c.classList.contains('is-hidden'));

        visible.forEach(card => {
            card.classList.remove('is-showing');
            card.classList.add('is-hiding');
        });

        setTimeout(() => {
            let i = 0;
            cards.forEach(card => {
                card.classList.remove('is-hiding', 'is-showing');
                if (matches(card)) {
                    card.classList.remove('is-hidden');
                    card.classList.add('visible');
                    card.style.setProperty('--i', i++);
                    void card.offsetWidth; // restart animation
                    card.classList.add('is-showing');
                } else {
                    card.classList.add('is-hidden');
                }
            });
            setupReadMore();
        }, reduceMotion ? 0 : 280);
    };

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;
            filterBtns.forEach(b => {
                b.classList.toggle('active', b === btn);
                b.setAttribute('aria-pressed', String(b === btn));
            });
            moveFilterIndicator(btn);
            applyFilter(btn.dataset.filter);
        });
    });
    if (filterWrap) {
        const init = () => moveFilterIndicator($('.filter-btn.active'));
        init();
        window.addEventListener('resize', init);
        if (document.fonts) document.fonts.ready.then(init);
    }

    // ===== Clients marquee: duplicate track for a seamless loop =====
    const marquee = $('.marquee');
    if (marquee) {
        const track = $('.marquee-track', marquee);
        const clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        marquee.appendChild(clone);
    }

    // ===== Copy email =====
    const copyBtn = $('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(copyBtn.dataset.copy);
                copyBtn.classList.add('copied');
                setTimeout(() => copyBtn.classList.remove('copied'), 1600);
            } catch (e) {
                window.location.href = `mailto:${copyBtn.dataset.copy}`;
            }
        });
    }
})();
