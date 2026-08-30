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

function wireTextCounters() {
    document.querySelectorAll('textarea').forEach(function (textarea) {
        const counter = textarea.parentElement.querySelector('.counter');
        if (!counter) return;

        const max = textarea.getAttribute('maxlength');
        const updateCounter = function () {
            counter.textContent = textarea.value.length + '/' + max;
        };

        textarea.addEventListener('input', updateCounter);
        updateCounter();
    });
}

function wireSourceToggle() {
    const source = document.getElementById('source');
    const sourceOtherGroup = document.getElementById('sourceOtherGroup');
    const sourceOther = document.getElementById('sourceOther');

    if (!source || !sourceOtherGroup || !sourceOther) return;

    const syncVisibility = () => {
        const showOther = source.value === 'Others';
        sourceOtherGroup.style.display = showOther ? 'block' : 'none';
        sourceOther.required = showOther;
        if (!showOther) sourceOther.value = '';
    };

    source.addEventListener('change', syncVisibility);
    syncVisibility();
}

function wireDateLimit() {
    const birthDate = document.getElementById('birthDate');
    if (!birthDate) return;

    birthDate.max = new Date().toISOString().split('T')[0];
}

function refreshFormState() {
    document.querySelectorAll('textarea').forEach((textarea) => {
        const counter = textarea.parentElement.querySelector('.counter');
        if (counter) {
            counter.textContent = `0/${textarea.getAttribute('maxlength')}`;
        }
    });

    const source = document.getElementById('source');
    if (source) {
        source.dispatchEvent(new Event('change'));
    }

    wireDateLimit();
}

function normalizeDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 10);
}

document.addEventListener('DOMContentLoaded', () => {
    wireTextCounters();
    wireSourceToggle();
    wireDateLimit();

    const phone = document.getElementById('phone');
    if (phone) {
        phone.addEventListener('input', () => {
            phone.value = normalizeDigits(phone.value);
        });
    }

    const form = document.getElementById('memberForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const phoneValue = normalizeDigits(document.getElementById('phone').value.trim());
        const email = document.getElementById('email').value.trim();
        const birthDate = document.getElementById('birthDate').value;
        const source = document.getElementById('source').value;
        const sourceOther = document.getElementById('sourceOther').value.trim();
        const intro = document.getElementById('intro').value.trim();
        const hobbies = document.getElementById('hobbies').value.trim();
        const queries = document.getElementById('queries').value.trim();
        const photo = document.getElementById('photo').files[0];

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const today = new Date().toISOString().split('T')[0];

        if (!fullName) return alert('Please enter your full name.');
        if (phoneValue.length !== 10) return alert('Phone number must be exactly 10 digits.');
        if (!emailPattern.test(email)) return alert('Please enter a valid email address.');
        if (!birthDate) return alert('Please select your birth date.');
        if (birthDate > today) return alert('Birth date cannot be in the future.');
        if (!source) return alert('Please choose how you heard about us.');
        if (source === 'Others' && !sourceOther) return alert('Please specify how you heard about us.');
        if (!photo) return alert('Please upload a professional portrait photo.');
        if (photo.size > 5 * 1024 * 1024) return alert('Photo must be 5MB or smaller.');
        if (!intro) return alert('Please add your introduction.');
        if (!hobbies) return alert('Please add your hobbies.');

        const payload = new FormData();
        payload.append('full_name', fullName);
        payload.append('phone', phoneValue);
        payload.append('email', email);
        payload.append('birth_date', birthDate);
        payload.append('source', source);
        payload.append('source_other', source === 'Others' ? sourceOther : '');
        payload.append('introduction', intro);
        payload.append('hobbies', hobbies);
        payload.append('why_join', '');
        payload.append('queries', queries);
        payload.append('photo', photo);

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalLabel = submitBtn ? submitBtn.textContent : '';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            const response = await fetch(`${getApiBase()}/api/members/register`, {
                method: 'POST',
                body: payload
            });

            const result = await response.json();

            if (!response.ok) {
                alert('Error: ' + (result.error || 'Registration failed.'));
                return;
            }

            alert('Member registered successfully! All details have been saved.');
            form.reset();
            refreshFormState();
        } catch (err) {
            console.error(err);
            alert('Could not reach the server. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalLabel || 'Submit Form';
            }
        }
    });
});
