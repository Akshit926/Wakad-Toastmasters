/* roles.js — complete rewrite with login flow + backend-driven role board */

// ── API Base URL — auto-switches between local dev and Cloud Run ──────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'https://wakadtoastmasterclub-263491062829.asia-south1.run.app/api';

const ROLE_ICONS = {
    'Toastmaster of the Day': 'TM',
    'Table Topics Master':    'TT',
    'General Evaluator':      'GE',
    'Ah-Counter':             'AC',
    'Grammarian':             'GR',
    'Timer':                  'TI',
    'Speaker 1':              'S1',
    'Speaker 2':              'S2',
    'Speaker 3':              'S3',
    'Speaker 4':              'S4',
    'Evaluator 1':            'E1',
    'Evaluator 2':            'E2',
    'Evaluator 3':            'E3',
    'Evaluator 4':            'E4',
};

const DEFAULT_ROLE_NAMES = [
    'Toastmaster of the Day', 'Table Topics Master', 'General Evaluator',
    'Ah-Counter', 'Grammarian', 'Timer',
    'Speaker 1', 'Speaker 2', 'Speaker 3',
    'Evaluator 1', 'Evaluator 2', 'Evaluator 3'
];

// ── State ─────────────────────────────────────────────────────────────────────
let loggedInMember   = null;  // { id, customer_id, member_name }
let currentMeetingDate = '';
let allRoleData        = [];  // from backend

// ── Date utilities ────────────────────────────────────────────────────────────
function getNextFourSaturdays() {
    let dates = [];
    let d     = new Date();
    // advance to next Saturday
    const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSat);
    for (let i = 0; i < 4; i++) {
        dates.push(d.toLocaleDateString('en-CA')); // YYYY-MM-DD in local TZ
        d.setDate(d.getDate() + 7);
    }
    return dates;
}

function formatDate(dateStr) {
    const [y, m, day] = String(dateStr).split('T')[0].split('-').map(Number);
    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dt = new Date(y, m - 1, day);
    return `${days[dt.getDay()]}, ${String(day).padStart(2,'0')} ${months[m-1]} ${y}`;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
async function handleLogin() {
    const input = document.getElementById('customerIdInput');
    const cid   = input.value.trim();
    const btn   = document.getElementById('loginBtn');
    const err   = document.getElementById('loginError');

    if (!cid) { showLoginError('Please enter your Member ID.'); return; }

    btn.disabled   = true;
    btn.innerHTML  = '<div class="btn-spinner"></div> Verifying…';
    err.style.display = 'none';

    try {
        const res  = await fetch(`${API_BASE}/club-members/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: cid })
        });
        const data = await res.json();

        if (!res.ok) {
            showLoginError(data.error || 'Invalid Member ID. Please check and try again.');
            return;
        }

        loggedInMember = data.member;
        showRoleBoard();
    } catch (e) {
        showLoginError('Cannot connect to server. Please try again.');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<span>Access Role Board</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('customerIdInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });
    populateDateDropdown();

    // Check if the member is already logged in via Member Portal
    const storedMember = sessionStorage.getItem('tm_member');
    if (storedMember) {
        try {
            loggedInMember = JSON.parse(storedMember);
            showRoleBoard();
        } catch (_) {
            sessionStorage.removeItem('tm_member');
        }
    }
});

function showLoginError(msg) {
    const err = document.getElementById('loginError');
    err.textContent  = msg;
    err.style.display = 'block';
}

function handleLogout() {
    loggedInMember = null;
    allRoleData    = [];
    sessionStorage.removeItem('tm_member');
    document.getElementById('login-panel').style.display = '';
    document.getElementById('role-board').style.display  = 'none';
    document.getElementById('customerIdInput').value     = '';
    document.getElementById('loginError').style.display  = 'none';
}

// ── SHOW ROLE BOARD ───────────────────────────────────────────────────────────
function showRoleBoard() {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('role-board').style.display  = '';

    // Populate member bar
    const name = loggedInMember.member_name;
    document.getElementById('memberNameDisplay').textContent = name;
    document.getElementById('memberIdDisplay').textContent   = loggedInMember.customer_id;
    document.getElementById('memberAvatarLg').textContent    = name.charAt(0).toUpperCase();

    loadRolesForMeeting();
}

// ── DATE DROPDOWN ─────────────────────────────────────────────────────────────
function populateDateDropdown() {
    const dropdown = document.getElementById('meetingDate');
    dropdown.innerHTML = '';
    const dates = getNextFourSaturdays();
    dates.forEach((date, i) => {
        const opt     = document.createElement('option');
        opt.value     = date;
        opt.textContent = formatDate(date);
        dropdown.appendChild(opt);
    });
    currentMeetingDate = dates[0];
}

async function loadRolesForMeeting() {
    currentMeetingDate = document.getElementById('meetingDate').value;
    const dashboard = document.getElementById('rolesDashboard');
    dashboard.innerHTML = '<div class="loading-roles"><div class="spinner"></div><p>Loading roles…</p></div>';

    try {
        const res  = await fetch(`${API_BASE}/roles/all`);
        allRoleData = await res.json();
    } catch (e) {
        dashboard.innerHTML = '<p class="roles-error">Cannot connect to backend. Please try again.</p>';
        return;
    }

    renderRoleBoard();
}

// ── RENDER ROLE CARDS ─────────────────────────────────────────────────────────
function renderRoleBoard() {
    const dashboard = document.getElementById('rolesDashboard');
    dashboard.innerHTML = '';

    // Filter backend data for current date
    const forDate = allRoleData.filter(r =>
        String(r.meeting_date).split('T')[0] === currentMeetingDate &&
        (r.status === 'Pending_Allocation' || r.status === 'Assigned')
    );

    // Build map: role_name to assignment
    const takenMap = {};
    forDate.forEach(r => {
        if (!takenMap[r.role_name]) takenMap[r.role_name] = r;
    });

    let available = 0, taken = 0, pending = 0;

    DEFAULT_ROLE_NAMES.forEach(roleName => {
        const assignment = takenMap[roleName] || null;
        const icon       = ROLE_ICONS[roleName] || '🎯';

        let status, badgeText, badgeClass, memberHTML, actionsHTML;
        const myName = loggedInMember?.member_name || '';

        if (!assignment) {
            status     = 'available';
            badgeText  = 'Available';
            badgeClass = 'badge-available';
            available++;
            memberHTML = `<div class="empty-slot">No one assigned yet</div>`;
            actionsHTML = `<button class="btn-card btn-claim" onclick="openClaim('${escQ(roleName)}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Claim Role
            </button>`;
        } else if (assignment.status === 'Pending_Allocation') {
            status     = 'pending';
            badgeText  = 'Pending Approval';
            badgeClass = 'badge-pending';
            pending++;
            const isMe = assignment.member_name === myName;
            memberHTML = `
                <div class="taken-by">
                    <div class="member-av">${(assignment.member_name||'?').charAt(0)}</div>
                    <div>
                        <div class="taken-name">${esc(assignment.member_name)}</div>
                        <div class="taken-status">Awaiting admin approval</div>
                    </div>
                </div>`;
            actionsHTML = isMe
                ? `<button class="btn-card btn-cancel-sm" onclick="openCancelRequest('${escQ(roleName)}','${escQ(assignment.member_name)}')">
                     Request Cancellation
                   </button>`
                : `<div class="role-locked">Pending approval</div>`;
        } else {
            // Assigned
            status     = 'taken';
            badgeText  = 'Assigned';
            badgeClass = 'badge-taken';
            taken++;
            const isMe = assignment.member_name === myName;
            memberHTML = `
                <div class="taken-by">
                    <div class="member-av member-av-taken">${(assignment.member_name||'?').charAt(0)}</div>
                    <div>
                        <div class="taken-name">${esc(assignment.member_name)}</div>
                        <div class="taken-status taken-confirmed">Confirmed</div>
                    </div>
                </div>`;
            actionsHTML = isMe
                ? `<button class="btn-card btn-cancel-sm" onclick="openCancelRequest('${escQ(roleName)}','${escQ(assignment.member_name)}')">
                     Request Cancellation
                   </button>`
                : `<div class="role-locked">Role taken</div>`;
        }

        const card = document.createElement('div');
        card.className = `role-card role-${status}`;
        card.innerHTML = `
            <div class="role-top">
                <div class="role-icon-wrap">${icon}</div>
                <span class="role-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="role-name">${roleName}</div>
            <div class="role-member">${memberHTML}</div>
            <div class="role-actions">${actionsHTML}</div>
        `;
        dashboard.appendChild(card);
    });

    document.getElementById('stat-available').textContent = available;
    document.getElementById('stat-taken').textContent     = taken;
    document.getElementById('stat-pending').textContent   = pending;
}

// ── MODAL — CLAIM ─────────────────────────────────────────────────────────────
let _claimRole = '';

function openClaim(roleName) {
    _claimRole = roleName;
    showModalView('claim');
    document.getElementById('modalTitle').textContent     = 'Claim This Role';
    document.getElementById('modalRoleName').textContent  = roleName;
    document.getElementById('modalMeetingDate').textContent = '📅 ' + formatDate(currentMeetingDate);

    const name = loggedInMember.member_name;
    document.getElementById('confAvatar').textContent   = name.charAt(0).toUpperCase();
    document.getElementById('confName').textContent     = name;
    document.getElementById('confId').textContent       = loggedInMember.customer_id;

    openModal();
}

async function submitClaim() {
    const btn = document.getElementById('claimSubmitBtn');
    btn.disabled = true;
    showModalView('loading');

    try {
        const res  = await fetch(`${API_BASE}/roles/allocate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                member_name:  loggedInMember.member_name,
                role_name:    _claimRole,
                meeting_date: currentMeetingDate
            })
        });
        const data = await res.json();

        if (!res.ok) {
            showModalView('claim');
            btn.disabled = false;
            showInlineError(data.error || 'Could not submit request.');
            return;
        }

        showModalView('success');
        document.getElementById('successTitle').textContent = 'Request Submitted!';
        document.getElementById('successMsg').textContent   =
            `Your claim for "${_claimRole}" has been sent to the admin for approval. You'll see it as Pending until confirmed.`;

        await loadRolesForMeeting();
    } catch (e) {
        showModalView('claim');
        btn.disabled = false;
        showInlineError('Network error — could not reach the server.');
    }
}

// ── MODAL — CANCEL REQUEST ────────────────────────────────────────────────────
let _cancelRole = '', _cancelMember = '';

function openCancelRequest(roleName, memberName) {
    _cancelRole   = roleName;
    _cancelMember = memberName;
    showModalView('cancel');
    document.getElementById('cancelRoleName').textContent   = roleName;
    document.getElementById('cancelMeetingDate').textContent = '📅 ' + formatDate(currentMeetingDate);
    document.getElementById('cancelReasonInput').value      = '';
    document.getElementById('charCount').textContent        = '0';
    openModal();
}

async function submitCancel() {
    const reason = document.getElementById('cancelReasonInput').value.trim();
    if (!reason) { alert('Please provide a reason for cancellation.'); return; }

    const btn = document.getElementById('cancelSubmitBtn');
    btn.disabled = true;
    showModalView('loading');

    try {
        const res  = await fetch(`${API_BASE}/roles/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                member_name:   _cancelMember,
                role_name:     _cancelRole,
                meeting_date:  currentMeetingDate,
                cancel_reason: reason
            })
        });
        const data = await res.json();

        if (!res.ok) {
            showModalView('cancel');
            btn.disabled = false;
            alert(data.error || 'Could not submit cancellation.');
            return;
        }

        showModalView('success');
        document.getElementById('successTitle').textContent = 'Cancellation Requested!';
        document.getElementById('successMsg').textContent   =
            `Your cancellation request for "${_cancelRole}" has been sent to the admin. It will be reviewed shortly.`;

        await loadRolesForMeeting();
    } catch (e) {
        showModalView('cancel');
        btn.disabled = false;
        alert('Network error — could not reach the server.');
    }
}

// char counter for cancel reason
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cancelReasonInput').addEventListener('input', function() {
        document.getElementById('charCount').textContent = this.value.length;
    });
});

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function openModal() {
    document.getElementById('roleModal').classList.add('active');
}
function closeModal() {
    document.getElementById('roleModal').classList.remove('active');
    document.getElementById('claimSubmitBtn').disabled  = false;
    document.getElementById('cancelSubmitBtn').disabled = false;
}
function showModalView(view) {
    ['modal-claim-view','modal-cancel-view','modal-loading','modal-success-view']
        .forEach(id => document.getElementById(id).style.display = 'none');
    const map = {
        claim:   'modal-claim-view',
        cancel:  'modal-cancel-view',
        loading: 'modal-loading',
        success: 'modal-success-view'
    };
    if (map[view]) document.getElementById(map[view]).style.display = '';
}
function showInlineError(msg) {
    let el = document.getElementById('claimInlineError');
    if (!el) {
        el = document.createElement('p');
        el.id = 'claimInlineError';
        el.style.cssText = 'color:#991b1b;font-size:.875rem;margin-top:8px;text-align:center';
        document.getElementById('modal-claim-view').appendChild(el);
    }
    el.textContent = msg;
}

document.getElementById('roleModal').addEventListener('click', e => {
    if (e.target.id === 'roleModal') closeModal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

// ── ESCAPE HELPERS ────────────────────────────────────────────────────────────
function esc(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escQ(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
