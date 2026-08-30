// dotenv is loaded once in server.js - no need to load here
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const safeText = (value) => String(value ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Role notification email (sent to admin)
const sendRoleNotificationEmail = async (
    memberName,
    roleName,
    action,
    meetingDate,
    memberId = null,
    roleId = null,
    rowId = null,
    cancelReason = null
) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const baseUrl = (process.env.BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

    const isAllocation = action === 'Allocated';
    const isCancellation = action === 'Cancelled';

    const subject = isAllocation
        ? `[Action Required] Role Claim by ${memberName} - ${roleName}`
        : `[Action Required] Role Cancel Request by ${memberName} - ${roleName}`;

    let approveLink = '';
    let rejectLink = '';
    if (memberId && roleId) {
        const qs = `member_id=${memberId}&role_id=${roleId}&meeting_date=${meetingDate}`;
        if (isAllocation) {
            approveLink = `${baseUrl}/api/roles/approve-allocate?${qs}`;
            rejectLink = `${baseUrl}/api/roles/reject-allocate?${qs}&reason=Role+already+filled+or+admin+decision`;
        } else if (isCancellation) {
            approveLink = `${baseUrl}/api/roles/approve-cancel?${qs}`;
            rejectLink = `${baseUrl}/api/roles/approve-allocate?${qs}`;
        }
    }

    const actionLabel = isAllocation ? 'Role Claim Request' : 'Role Cancellation Request';
    const statusLabel = isAllocation ? 'Pending Approval' : 'Cancellation Pending';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 24px; }
    .wrap { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .header { background: #004165; color: white; padding: 32px 40px; }
    .header h1 { margin: 0 0 4px; font-size: 22px; }
    .header p { margin: 0; font-size: 13px; opacity: .85; }
    .body { padding: 36px 40px; }
    .info-box { background: #f8fafc; border-left: 4px solid #004165; border-radius: 6px; padding: 16px 20px; margin: 24px 0; }
    .info-row { display: flex; margin-bottom: 6px; font-size: 14px; }
    .info-lbl { font-weight: 600; color: #374151; width: 130px; flex-shrink: 0; }
    .info-val { color: #6b7280; }
    .actions { display: flex; gap: 16px; margin-top: 32px; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; text-align: center; }
    .btn-approve { background: #004165; color: #fff; }
    .btn-reject { background: #fff; color: #991b1b; border: 2px solid #991b1b; }
    .footer { background: #f8fafc; padding: 20px 40px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Wakad Toastmasters</h1>
      <p>Admin Action Required - ${actionLabel}</p>
    </div>
    <div class="body">
      <p style="color:#374151">Hello Admin,<br><br>
      A member has submitted a <strong>${safeText(actionLabel).toLowerCase()}</strong> that requires your approval.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-lbl">Member</span><span class="info-val">${safeText(memberName)}</span></div>
        <div class="info-row"><span class="info-lbl">Role</span><span class="info-val">${safeText(roleName)}</span></div>
        <div class="info-row"><span class="info-lbl">Meeting Date</span><span class="info-val">${safeText(meetingDate)}</span></div>
        <div class="info-row"><span class="info-lbl">Status</span><span class="info-val"><span class="badge">${statusLabel}</span></span></div>
        ${cancelReason ? `<div class="info-row"><span class="info-lbl">Reason</span><span class="info-val">${safeText(cancelReason)}</span></div>` : ''}
        <div class="info-row"><span class="info-lbl">Timestamp</span><span class="info-val">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
      </div>
      ${approveLink ? `
      <p style="color:#374151;font-weight:600;margin-top:28px">One-click action from email:</p>
      <div class="actions">
        <a class="btn btn-approve" href="${approveLink}">${isAllocation ? 'Approve Allocation' : 'Confirm Cancellation'}</a>
        <a class="btn btn-reject" href="${rejectLink}">${isAllocation ? 'Reject Request' : 'Keep Role Assigned'}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      Wakad Toastmasters Club - Division E, District 226 - This is an automated notification.
    </div>
  </div>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"Wakad TM System" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject,
            html
        });
    } catch (error) {
        console.error('Error sending role email:', error);
    }
};

const sendContactNotificationEmail = async (name, email, message) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const subject = `New Contact Form: ${name}`;
    const html = `<div style="font-family:sans-serif;max-width:500px;padding:24px">
      <h2 style="color:#004165">New Contact Message</h2>
      <p><strong>Name:</strong> ${safeText(name)}</p>
      <p><strong>Email:</strong> ${safeText(email)}</p>
      <p><strong>Message:</strong><br>${safeText(message)}</p>
      <p style="color:#9ca3af;font-size:12px">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>`;
    try {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: adminEmail, subject, html });
    } catch (e) {
        console.error('Contact email error:', e);
    }
};

const sendMemberNotificationEmail = async (member) => {
    const {
        full_name,
        first_name,
        last_name,
        email,
        phone,
        birth_date,
        source,
        source_other,
        photo_url,
        introduction,
        hobbies,
        why_join,
        queries
    } = member;

    const adminEmail = process.env.ADMIN_EMAIL;
    const displayName = full_name || `${first_name || ''} ${last_name || ''}`.trim();
    const sourceLabel = source === 'Others'
        ? `Others${source_other ? ` (${source_other})` : ''}`
        : source;
    const subject = `New Member Registration: ${displayName}`;

    const html = `<div style="font-family:sans-serif;max-width:600px;padding:24px">
      <h2 style="color:#004165">New Member Registration</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;font-weight:600;width:160px">Name</td><td>${safeText(displayName)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Email</td><td>${safeText(email)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Phone</td><td>${safeText(phone || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Birth Date</td><td>${safeText(birth_date || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Source</td><td>${safeText(sourceLabel || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Photo</td><td>${photo_url ? `<a href="${photo_url}" target="_blank" rel="noopener">View uploaded portrait</a>` : '—'}</td></tr>
      </table>
      <h3 style="color:#004165;margin-top:20px">Introduction</h3><p>${safeText(introduction || '—')}</p>
      <h3 style="color:#004165">Hobbies</h3><p>${safeText(hobbies || '—')}</p>
      <h3 style="color:#004165">Why Join</h3><p>${safeText(why_join || '—')}</p>
      <h3 style="color:#004165">Additional Info</h3><p>${safeText(queries || '—')}</p>
      <p style="color:#9ca3af;font-size:12px">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>`;

    try {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: adminEmail, subject, html });
    } catch (e) {
        console.error('Member email error:', e);
    }
};

module.exports = { sendRoleNotificationEmail, sendContactNotificationEmail, sendMemberNotificationEmail };
