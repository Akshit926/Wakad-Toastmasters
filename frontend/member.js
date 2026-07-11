// ── API Base URL — auto-switches between local dev and Cloud Run ──────────────
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001'
    : 'https://wakadtoastmasterclub-263491062829.asia-south1.run.app'
) + '/api/club-members';

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // If landed with ?auto=1 (future SSO hook), auto-fill could go here
    const stored = sessionStorage.getItem('tm_member');
    if (stored) {
        try {
            renderDashboard(JSON.parse(stored));
        } catch (_) {
            sessionStorage.removeItem('tm_member');
        }
    }

    // Focus the input on load
    const inp = document.getElementById('login-customer-id');
    if (inp) inp.focus();
});

// ── Login ─────────────────────────────────────────────────────────────────────
async function doLogin() {
    const customerId = document.getElementById('login-customer-id').value.trim().toUpperCase();
    const errEl      = document.getElementById('login-error');
    const btn        = document.getElementById('login-btn');

    if (!customerId) {
        showLoginError('Please enter your Member ID.');
        return;
    }

    errEl.style.display = 'none';
    btn.disabled        = true;
    btn.innerHTML       = `
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;animation:spin 1s linear infinite">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
        Signing in...`;

    try {
        const res  = await fetch(`${API}/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ customer_id: customerId })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            showLoginError(data.error || 'Login failed. Please check your Member ID.');
        } else {
            sessionStorage.setItem('tm_member', JSON.stringify(data.member));
            renderDashboard(data.member);
        }
    } catch (err) {
        showLoginError('Could not reach server. Please try again.');
        console.error(err);
    } finally {
        btn.disabled    = false;
        btn.innerHTML   = `
            <svg viewBox="0 0 24 24"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg>
            Sign In`;
    }
}

// ── Render Dashboard ──────────────────────────────────────────────────────────
function renderDashboard(member) {
    // Switch screens
    document.getElementById('login-screen').style.display    = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';

    // Profile card
    const initial = (member.member_name || '?')[0].toUpperCase();
    document.getElementById('member-avatar').textContent       = initial;
    document.getElementById('member-display-name').textContent = member.member_name;
    document.getElementById('member-display-id').textContent   = member.customer_id;
    document.getElementById('member-joined').textContent       = 'Member since ' + formatDate(member.created_at);

    // Roles
    const roles    = member.roles || [];
    const upcoming = roles.filter(r => r.date && new Date(r.date) >= new Date());

    document.getElementById('m-stat-roles').textContent    = roles.length;
    document.getElementById('m-stat-upcoming').textContent = upcoming.length;

    renderRolesTable(roles);
}

// ── Render Roles Table ────────────────────────────────────────────────────────
function renderRolesTable(roles) {
    const tbody = document.getElementById('member-roles-tbody');

    if (!roles || roles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading-row">No roles assigned yet. Contact your VP Education for scheduling.</td></tr>';
        return;
    }

    tbody.innerHTML = roles.map(r => {
        const statusClass = {
            'Assigned':            'status-assigned',
            'Pending_Allocation':  'status-pending',
            'Cancelled':           'status-cancelled'
        }[r.status] || 'status-pending';

        const statusLabel = {
            'Assigned':            'Assigned',
            'Pending_Allocation':  'Pending',
            'Cancelled':           'Cancelled'
        }[r.status] || r.status;

        return `<tr>
            <td><strong>${escHtml(r.role)}</strong></td>
            <td class="date-text">${r.date ? formatDate(r.date) : '-'}</td>
            <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
        </tr>`;
    }).join('');
}

// ── Logout ────────────────────────────────────────────────────────────────────
function doLogout() {
    sessionStorage.removeItem('tm_member');
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('login-screen').style.display     = 'grid';
    document.getElementById('login-customer-id').value        = '';
    document.getElementById('login-error').style.display      = 'none';
    setTimeout(() => document.getElementById('login-customer-id').focus(), 100);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showLoginError(msg) {
    const el = document.getElementById('login-error');
    el.textContent   = msg;
    el.style.display = 'block';
    // Shake animation
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.4s ease';
}

function formatDate(str) {
    if (!str) return '-';
    // Parse locally to avoid UTC midnight timezone shift (shows Friday instead of Saturday)
    const s = String(str).split('T')[0]; // yyyy-mm-dd
    const [y, m, d] = s.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d).padStart(2,'0')} ${months[m-1]} ${y}`;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Inline CSS for spin + shake animations ────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
}`;
document.head.appendChild(style);
