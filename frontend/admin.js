// ── API Base URL — auto-switches between local dev and Cloud Run ──────────────
const BASE_URL  = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001'
    : 'https://wakadtoastmasterclub-263491062829.asia-south1.run.app';
const API       = `${BASE_URL}/api/club-members`;
const ROLES_API = `${BASE_URL}/api/roles`;

// ── State ─────────────────────────────────────────────────────────────────────
let allMembers = [];
let allRoles   = [];
let editingId  = null;
let roleTab    = 'all';

// ── Auth Fetch Interceptor ────────────────────────────────────────────────────
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (savedPassword) {
        options.headers = options.headers || {};
        options.headers['x-admin-password'] = savedPassword;
    }
    const res = await originalFetch(url, options);
    
    // If backend returns 401 Unauthorized, automatically trigger logout/re-auth
    if (res.status === 401 && !url.includes('/api/club-members/auth/login')) {
        sessionStorage.removeItem('adminPassword');
        document.getElementById('admin-login-overlay').style.display = 'flex';
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminPasswordInput').focus();
    }
    return res;
};

// ── Admin Login Logic ─────────────────────────────────────────────────────────
async function doAdminLogin() {
    const passwordInput = document.getElementById('adminPasswordInput');
    const password = passwordInput.value.trim();
    const errorDiv = document.getElementById('adminLoginError');

    if (!password) {
        errorDiv.textContent = 'Please enter the password.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const res = await originalFetch(`${API}`, {
            method: 'GET',
            headers: {
                'x-admin-password': password
            }
        });

        if (res.ok) {
            sessionStorage.setItem('adminPassword', password);
            document.getElementById('admin-login-overlay').style.display = 'none';
            errorDiv.style.display = 'none';
            loadMembers();
        } else if (res.status === 401) {
            errorDiv.textContent = 'Invalid password. Access denied.';
            errorDiv.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        } else {
            errorDiv.textContent = 'Server error. Please try again.';
            errorDiv.style.display = 'block';
        }
    } catch (e) {
        errorDiv.textContent = 'Cannot connect to server.';
        errorDiv.style.display = 'block';
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (savedPassword) {
        document.getElementById('admin-login-overlay').style.display = 'none';
        loadMembers();
    } else {
        document.getElementById('admin-login-overlay').style.display = 'flex';
        document.getElementById('adminPasswordInput').focus();
    }
});

// ── Section Navigation ────────────────────────────────────────────────────────
function showSection(name, el) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${name}`).classList.add('active');
    if (el) el.classList.add('active');
    const titles = { members: 'Member Management', roles: 'Role Requests & Approvals' };
    document.getElementById('page-title').textContent = titles[name] || 'Dashboard';
    if (name === 'roles') loadRoles();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ═════════════════════════════════════════════════════════════════════════════
//  MEMBERS TAB
// ═════════════════════════════════════════════════════════════════════════════

async function loadMembers() {
    const tbody = document.getElementById('members-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Loading…</td></tr>';
    try {
        const res  = await fetch(API);
        allMembers = await res.json();
        renderTable(allMembers);
        updateStats(allMembers);
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-row" style="color:var(--danger)">
            Could not connect to server. Is the backend running?</td></tr>`;
    }
}

function renderTable(members) {
    const tbody = document.getElementById('members-tbody');
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No members found.</td></tr>';
        return;
    }
    tbody.innerHTML = members.map((m, i) => `
        <tr>
            <td class="row-num">${i + 1}</td>
            <td><span class="cid-badge">${esc(m.customer_id)}</span></td>
            <td><strong>${esc(m.member_name)}</strong></td>
            <td class="date-text">${fmtDate(m.created_at)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-sm-edit" title="Edit" onclick="openEditModal(${m.id},'${esc(m.customer_id)}','${esc(m.member_name)}')">Edit</button>
                    <button class="btn-sm-del" title="Delete" onclick="deleteMember(${m.id},'${esc(m.member_name)}')">Delete</button>
                </div>
            </td>
        </tr>`).join('');
}

function updateStats(members) {
    document.getElementById('stat-total').textContent  = members.length;
    document.getElementById('stat-ids').textContent    = members.length;
    document.getElementById('member-chip').textContent = `${members.length} Members`;
    if (members.length > 0) {
        const newest = [...members].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        document.getElementById('stat-new').textContent = newest.member_name.split(' ')[0];
    }
}

function filterMembers() {
    const q = document.getElementById('search-input').value.toLowerCase().trim();
    renderTable(q ? allMembers.filter(m =>
        m.member_name.toLowerCase().includes(q) || m.customer_id.toLowerCase().includes(q)
    ) : allMembers);
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
function openAddModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Add New Member';
    document.getElementById('save-btn').textContent    = 'Add Member';
    document.getElementById('input-cid').value         = '';
    document.getElementById('input-name').value        = '';
    document.getElementById('edit-id').value           = '';
    hideModalError();
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('input-cid').focus(), 100);
}

function openEditModal(id, customerId, memberName) {
    editingId = id;
    document.getElementById('modal-title').textContent = 'Edit Member';
    document.getElementById('save-btn').textContent    = 'Save Changes';
    document.getElementById('edit-id').value           = id;
    document.getElementById('input-cid').value         = customerId;
    document.getElementById('input-name').value        = memberName;
    hideModalError();
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('input-name').focus(), 100);
}

function closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').classList.remove('open');
}

function hideModalError() {
    const el = document.getElementById('modal-err');
    el.style.display = 'none'; el.textContent = '';
}
function showModalError(msg) {
    const el = document.getElementById('modal-err');
    el.textContent = msg; el.style.display = 'block';
}

async function saveMember() {
    const customerId = document.getElementById('input-cid').value.trim();
    const memberName = document.getElementById('input-name').value.trim();
    const id         = document.getElementById('edit-id').value;
    const btn        = document.getElementById('save-btn');

    if (!customerId || !memberName) { showModalError('Both fields are required.'); return; }

    btn.disabled = true; btn.textContent = 'Saving…';
    hideModalError();

    try {
        const res  = await fetch(editingId ? `${API}/${id}` : API, {
            method:  editingId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ customer_id: customerId, member_name: memberName })
        });
        const data = await res.json();
        if (!res.ok) { showModalError(data.error || 'An error occurred.'); }
        else { closeModal(null); showToast(editingId ? 'Member updated.' : 'Member added.', 'ok'); loadMembers(); }
    } catch { showModalError('Network error — is the server running?'); }
    finally { btn.disabled = false; btn.textContent = editingId ? 'Save Changes' : 'Add Member'; }
}

async function deleteMember(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
        const res  = await fetch(`${API}/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) showToast(data.error || 'Delete failed.', 'error');
        else { showToast(`${name} removed.`, 'success'); loadMembers(); }
    } catch { showToast('Network error.', 'error'); }
}

// ═════════════════════════════════════════════════════════════════════════════
//  ROLES TAB
// ═════════════════════════════════════════════════════════════════════════════

async function loadRoles() {
    const tbody = document.getElementById('roles-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Loading roles…</td></tr>';
    try {
        const res = await fetch(`${ROLES_API}/all`);
        allRoles  = await res.json();

        const pending = allRoles.filter(r =>
            r.status === 'Pending_Allocation' || r.status === 'Pending_Cancel'
        ).length;

        const dot  = document.getElementById('pending-dot');
        const chip = document.getElementById('pending-chip');
        dot.style.display  = pending > 0 ? 'block'      : 'none';
        chip.textContent   = pending;
        chip.style.display = pending > 0 ? 'inline-flex' : 'none';

        renderRolesTable();
    } catch {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:var(--danger)">Could not load roles. Is the server running?</td></tr>`;
    }
}

function switchTab(tab) {
    roleTab = tab;
    document.getElementById('tab-all').classList.toggle('active',     tab === 'all');
    document.getElementById('tab-pending').classList.toggle('active', tab === 'pending');
    renderRolesTable();
}

function filterRoles() { renderRolesTable(); }

function renderRolesTable() {
    const tbody = document.getElementById('roles-tbody');
    const q     = (document.getElementById('roles-search')?.value || '').toLowerCase().trim();
    let rows    = roleTab === 'pending'
        ? allRoles.filter(r => r.status === 'Pending_Allocation' || r.status === 'Pending_Cancel')
        : allRoles;
    if (q) rows = rows.filter(r =>
        (r.member_name || '').toLowerCase().includes(q) ||
        (r.role_name   || '').toLowerCase().includes(q) ||
        (r.customer_id || '').toLowerCase().includes(q)
    );
    if (rows.length === 0) {
        const msg = roleTab === 'pending' ? 'No pending requests.' : 'No role assignments found.';
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row">${msg}</td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const { cls, lbl } = statusInfo(r.status);
        const reasonHtml   = r.cancel_reason
            ? `<div class="cancel-reason-pill" title="${esc(r.cancel_reason)}">Reason: ${esc(r.cancel_reason).substring(0,40)}${r.cancel_reason.length > 40 ? '…' : ''}</div>`
            : '';
        return `<tr>
            <td><strong>${esc(r.member_name || '—')}</strong></td>
            <td>${r.customer_id ? `<span class="cid-pill">${esc(r.customer_id)}</span>` : '<span style="color:var(--muted)">—</span>'}</td>
            <td>${esc(r.role_name || '—')}</td>
            <td class="date-txt">${r.meeting_date ? fmtDateSat(r.meeting_date) : '—'}</td>
            <td><span class="status-pill ${cls}">${lbl}</span>${reasonHtml}</td>
            <td><div class="act-cell">${buildRoleActions(r)}</div></td>
        </tr>`;
    }).join('');
}

function buildRoleActions(r) {
    const d = encodeDate(r.meeting_date);
    if (r.status === 'Pending_Allocation') return `
        <button class="btn-approve" onclick="approveAllocation(${r.member_id},${r.role_id},'${d}',this)">Approve</button>
        <button class="btn-reject"  onclick="openRejectModal(${r.id},${r.member_id},${r.role_id},'${d}','${esc(r.member_name)}','allocation')">Reject</button>`;
    if (r.status === 'Pending_Cancel') return `
        <button class="btn-approve" onclick="approveCancel(${r.member_id},${r.role_id},'${d}',this)">Confirm Cancel</button>
        <button class="btn-reject"  onclick="denyCancel(${r.member_id},${r.role_id},'${d}','${esc(r.member_name)}',this)">Keep Role</button>`;
    if (r.status === 'Assigned') return `
        <button class="btn-reject"  onclick="openRejectModal(${r.id},${r.member_id},${r.role_id},'${d}','${esc(r.member_name)}','force')">Force Cancel</button>
        <button class="btn-delete-role" onclick="deleteRoleRow(${r.id},'${esc(r.member_name)}','${esc(r.role_name)}')">Delete</button>`;
    if (r.status === 'Cancelled') return `
        <button class="btn-delete-role" onclick="deleteRoleRow(${r.id},'${esc(r.member_name)}','${esc(r.role_name)}')">Delete</button>`;
    return '—';
}

// ── Approve allocation ────────────────────────────────────────────────────────
async function approveAllocation(memberId, roleId, date, btn) {
    btn.disabled = true; btn.textContent = '…';
    try {
        const res  = await fetch(`${ROLES_API}/approve-allocate`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId, role_id: roleId, meeting_date: date })
        });
        const data = await res.json();
        if (res.ok) { showToast('Role allocation approved.', 'success'); loadRoles(); }
        else        { showToast(data.error || 'Approval failed.', 'error'); btn.disabled = false; btn.textContent = 'Approve'; }
    } catch { showToast('Network error.', 'error'); btn.disabled = false; btn.textContent = 'Approve'; }
}

// ── Approve cancellation ──────────────────────────────────────────────────────
async function approveCancel(memberId, roleId, date, btn) {
    btn.disabled = true; btn.textContent = '…';
    try {
        const res  = await fetch(`${ROLES_API}/approve-cancel`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId, role_id: roleId, meeting_date: date })
        });
        const data = await res.json();
        if (res.ok) { showToast('Cancellation confirmed.', 'success'); loadRoles(); }
        else        { showToast(data.error || 'Failed.', 'error'); btn.disabled = false; btn.textContent = 'Confirm Cancel'; }
    } catch { showToast('Network error.', 'error'); btn.disabled = false; btn.textContent = 'Confirm Cancel'; }
}

// ── Deny cancellation (keep role as Assigned) ─────────────────────────────────
async function denyCancel(memberId, roleId, date, name, btn) {
    btn.disabled = true; btn.textContent = '…';
    try {
        const res = await fetch(`${ROLES_API}/approve-allocate`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId, role_id: roleId, meeting_date: date })
        });
        if (res.ok) { showToast(`Cancellation denied - ${name} keeps the role.`, 'success'); loadRoles(); }
        else        { showToast('Failed.', 'error'); btn.disabled = false; btn.textContent = 'Keep Role'; }
    } catch { showToast('Network error.', 'error'); btn.disabled = false; btn.textContent = 'Keep Role'; }
}

// ── Hard-delete a role row ────────────────────────────────────────────────────
async function deleteRoleRow(id, name, roleName) {
    openConfirm(
        `Delete Record`,
        `Permanently delete <strong>${roleName}</strong> for <strong>${name}</strong>? This cannot be undone.`,
        null,  // no reason field needed
        async () => {
            const res = await fetch(`${ROLES_API}/${id}`, { method: 'DELETE' });
            if (res.ok) { showToast('Record deleted.', 'success'); loadRoles(); }
            else        { showToast('Delete failed.', 'error'); }
        }
    );
}

// ═════════════════════════════════════════════════════════════════════════════
//  REJECT / FORCE-CANCEL MODAL  (with reason)
// ═════════════════════════════════════════════════════════════════════════════
let _rejectCallback = null;

function openRejectModal(rowId, memberId, roleId, date, name, mode) {
    // mode: 'allocation' = reject pending claim | 'force' = force-cancel an assigned role
    const isForce   = mode === 'force';
    const titleText = isForce ? `Force Cancel Role` : `Reject Allocation`;
    const msgText   = isForce
        ? `Force-cancel the role for <strong>${name}</strong>? Provide a reason.`
        : `Reject allocation request from <strong>${name}</strong>? Provide a reason.`;

    _rejectCallback = async (reason) => {
        let res;
        if (isForce) {
            res = await fetch(`${ROLES_API}/reject-allocate`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: memberId, role_id: roleId, meeting_date: date, reason })
            });
        } else {
            res = await fetch(`${ROLES_API}/reject-allocate`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: memberId, role_id: roleId, meeting_date: date, reason })
            });
        }
        if (res.ok) {
            showToast(isForce ? 'Role force-cancelled.' : 'Allocation rejected.', 'success');
            loadRoles();
        } else {
            showToast('Action failed.', 'error');
        }
    };

    openConfirm(titleText, msgText, 'Enter reason (required):', null, true);
}

// ── Confirm / Action Modal ────────────────────────────────────────────────────
// openConfirm(title, msg, reasonPlaceholder|null, onConfirmNoReason, requireReason)
function openConfirm(title, msg, reasonPlaceholder, directCallback, requireReason = false) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-msg').innerHTML     = msg;

    const reasonWrap = document.getElementById('confirm-reason-wrap');
    const reasonInp  = document.getElementById('confirm-reason-input');

    if (requireReason || reasonPlaceholder) {
        reasonWrap.style.display = '';
        reasonInp.value          = '';
        reasonInp.placeholder    = reasonPlaceholder || 'Enter reason…';
    } else {
        reasonWrap.style.display = 'none';
    }

    document.getElementById('confirm-ok').onclick = async () => {
        const reason = reasonInp ? reasonInp.value.trim() : '';
        if (requireReason && !reason) {
            reasonInp.style.borderColor = '#dc2626';
            reasonInp.focus();
            return;
        }
        closeConfirm(null);
        if (_rejectCallback) { await _rejectCallback(reason); _rejectCallback = null; }
        else if (directCallback) await directCallback();
    };

    document.getElementById('confirm-overlay').classList.add('open');
    if (requireReason) setTimeout(() => reasonInp?.focus(), 150);
}

function closeConfirm(e) {
    if (e && e.target !== document.getElementById('confirm-overlay')) return;
    document.getElementById('confirm-overlay').classList.remove('open');
    _rejectCallback = null;
    const inp = document.getElementById('confirm-reason-input');
    if (inp) { inp.value = ''; inp.style.borderColor = ''; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusInfo(status) {
    const map = {
        'Assigned':           { cls: 's-assigned',  lbl: 'Assigned' },
        'Pending_Allocation': { cls: 's-pending',   lbl: 'Pending Approval' },
        'Pending_Cancel':     { cls: 's-pending',   lbl: 'Cancel Requested' },
        'Cancelled':          { cls: 's-cancelled', lbl: 'Cancelled' },
    };
    return map[status] || { cls: 's-pending', lbl: status || '—' };
}

function encodeDate(dateStr) {
    if (!dateStr) return '';
    return String(dateStr).split('T')[0];
}

function fmtDate(str) {
    if (!str) return '—';
    const s   = String(str).split('T')[0];
    const [y, m, d] = s.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d).padStart(2,'0')} ${months[m-1]} ${y}`;
}
function fmtDateSat(str) { return fmtDate(str); }

function esc(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(null); closeConfirm(null); }
});
