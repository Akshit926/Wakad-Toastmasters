function getApiBase() {
    const configured = window.__TM_API_BASE_URL__?.trim();
    if (configured) return configured.replace(/\/$/, '');

    const metaBase = document.querySelector('meta[name="tm-api-base"]')?.content?.trim();
    if (metaBase) return metaBase.replace(/\/$/, '');

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5001';
    }

    return window.location.origin;
}

const navbar = document.querySelector('.navbar');
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('section[id], header[id]');

// ============================================
// MOBILE HAMBURGER MENU
// ============================================
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinksContainer = document.getElementById('navLinks');
const mobileOverlay = document.getElementById('mobileOverlay');

function openMobileMenu() {
    hamburgerBtn.classList.add('active');
    navLinksContainer.classList.add('mobile-open');
    if (mobileOverlay) mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    hamburgerBtn.classList.remove('active');
    navLinksContainer.classList.remove('mobile-open');
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
        if (navLinksContainer.classList.contains('mobile-open')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });
}

if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeMobileMenu);
}

// Close mobile menu when a nav link is clicked
if (navLinksContainer) {
    navLinksContainer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });
}

// Close mobile menu on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinksContainer && navLinksContainer.classList.contains('mobile-open')) {
        closeMobileMenu();
    }
});

// Close mobile menu if window is resized above mobile breakpoint
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

function toggleFaq(button) {
    const item = button.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) {
        item.classList.add('open');
    }
}

document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => toggleFaq(btn));
});

const contactBtn = document.querySelector('.contact-form button');
if (contactBtn) {
    contactBtn.addEventListener('click', async () => {
        const inputs = document.querySelectorAll('.contact-form input, .contact-form textarea');
        let allFilled = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                allFilled = false;
                input.style.borderColor = 'var(--tm-red)';
            } else {
                input.style.borderColor = '';
            }
        });

        if (!allFilled) {
            alert('Please fill in all fields before sending.');
            return;
        }

        const data = {
            name: inputs[0].value.trim(),
            email: inputs[1].value.trim(),
            message: `Subject: ${inputs[2].value.trim()}\n\n${inputs[3].value.trim()}`
        };

        try {
            const response = await fetch(`${getApiBase()}/api/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Thank you! Your message has been sent to our new database.');
                inputs.forEach(input => input.value = '');
            } else {
                alert('Server error, please try again.');
            }
        } catch (err) {
            console.error(err);
            alert('Could not reach the server. Please try again.');
        }
    });
}

const themeToggleBtn = document.getElementById('themeToggle');
const html = document.documentElement;
let currentTheme = localStorage.getItem('tm_theme');
if (!currentTheme) {
    currentTheme = 'light';
}
html.setAttribute('data-theme', currentTheme);
if (themeToggleBtn) {
    themeToggleBtn.textContent = currentTheme === 'dark' ? 'Light' : 'Dark';
    themeToggleBtn.addEventListener('click', () => {
        const nextTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', nextTheme);
        localStorage.setItem('tm_theme', nextTheme);
        themeToggleBtn.textContent = nextTheme === 'dark' ? 'Light' : 'Dark';
    });
}

const revealEls = document.querySelectorAll('.reveal-on-scroll');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -10px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

let lastScroll = 0;
if (navbar) {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.style.transform = 'translateY(-100%)';
            navbar.style.transition = 'transform 0.3s ease';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;

        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.pageYOffset >= sectionTop) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.style.color = '';
            if (link.getAttribute('href') === '#' + currentSection) {
                link.style.color = '#772432';
            }
        });
    });
}
