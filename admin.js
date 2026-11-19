(function () {
  'use strict';

  // 1. Check Admin Session Authentication
  const sessionRaw = sessionStorage.getItem('terragis_admin_session');
  if (!sessionRaw) {
    window.location.href = 'admin-login.html';
    return;
  }

  const session = JSON.parse(sessionRaw);
  const navAdminName = document.getElementById('navAdminName');
  const navAdminRole = document.getElementById('navAdminRole');
  if (navAdminName) navAdminName.textContent = session.name || 'M. Bahrudin';
  if (navAdminRole) navAdminRole.textContent = `${session.role} (${session.id || 'ADM-FIN-01'})`;

  // Real-time Header Clock
  const currentTimestamp = document.getElementById('currentTimestamp');
  function updateClock() {
    if (currentTimestamp) {
      const now = new Date();
      currentTimestamp.textContent = `${now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })} • ${now.toLocaleTimeString('id-ID')} WIB`;
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Logout Handler
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('terragis_admin_session');
      window.location.href = 'admin-login.html';
    });
  }

  // 2. Load Order Data from localStorage
  function getOrderData() {
    try {
      const saved = localStorage.getItem('terragis_order');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }

    // Default pending order matching user enterprise reference
    const defaultOrder = {
      accountId: '1200287697',
      name: 'mhmmd fdll',
      org: 'DISKOMINFO',
      email: 'mhmmadfdll09@gmail.com',
      phone: '0821-1388-2147',
      totalUsd: '$115.00 USD',
      totalIdr: 'Rp 2.097.947',
      method: 'QRIS / E-Wallet (Konversi USD)',
      status: 'PENDING_VERIFICATION',
      createdAt: '19/11/2026, 01.10.00 WIB',
      licenseKey: 'TGIS-2026-PRO-7398-9B2F'
    };
    localStorage.setItem('terragis_order', JSON.stringify(defaultOrder));
    return defaultOrder;
  }

  function saveOrderData(order) {
    localStorage.setItem('terragis_order', JSON.stringify(order));
  }

  const tableBody = document.getElementById('transactionTableBody');
  const kpiPendingCount = document.getElementById('kpiPendingCount');
  const kpiPendingSub = document.getElementById('kpiPendingSub');
  const toastNotice = document.getElementById('toastNotice');
  const toastMessage = document.getElementById('toastMessage');
  const auditTrailLog = document.getElementById('auditTrailLog');

  function showToast(msg) {
    if (!toastNotice) return;
    if (toastMessage) toastMessage.textContent = msg;
    toastNotice.classList.remove('hidden');
    setTimeout(() => {
      toastNotice.classList.add('hidden');
    }, 4000);
  }

  function appendAuditLog(text, color = '#10b981') {
    if (!auditTrailLog) return;
    const now = new Date();
    const row = document.createElement('div');
    row.style.marginTop = '0.35rem';
    row.innerHTML = `<span class="mono" style="color: ${color};">[${now.toLocaleTimeString('id-ID')} WIB]</span> ${text}`;
    auditTrailLog.appendChild(row);
  }

  function renderTable() {
    const order = getOrderData();
    if (!tableBody) return;

    tableBody.innerHTML = '';
    const isApproved = order.status === 'APPROVED';

    // Update KPI Counters
    if (kpiPendingCount) {
      kpiPendingCount.textContent = isApproved ? '0 Transaksi' : '1 Transaksi';
    }
    if (kpiPendingSub) {
      kpiPendingSub.textContent = isApproved ? 'Seluruh transaksi lunas' : 'Menunggu Verifikasi Admin';
      kpiPendingSub.style.color = isApproved ? '#10b981' : '#fbbf24';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono"><strong>${order.accountId}</strong></td>
      <td><strong>${order.name}</strong></td>
      <td><span class="badge-portal" style="font-size:0.78rem;">${order.org}</span></td>
      <td class="mono" style="font-size: 0.8rem; color: #94a3b8;">${order.email}</td>
      <td class="mono">
        <strong style="color: #34d399; font-size: 0.95rem;">${order.totalIdr}</strong>
        <small class="muted" style="display:block; font-size:0.75rem;">${order.totalUsd}</small>
      </td>
      <td><span style="font-size: 0.8rem;">${order.method || 'QRIS / VA'}</span></td>
      <td>
        ${
          isApproved
            ? '<span class="badge-approved">LUNAS / TERVERIFIKASI</span>'
            : '<span class="badge-pending">Menunggu Persetujuan Admin</span>'
        }
      </td>
      <td style="text-align: right; white-space: nowrap;">
        ${
          !isApproved
            ? `<button type="button" class="btn-approve" id="approveActionBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Setujui (LUNAS)</span>
              </button>
              <button type="button" class="btn-reject" id="rejectActionBtn">Tolak</button>`
            : '<span style="color: #10b981; font-weight: 700; font-size: 0.82rem; margin-right: 0.5rem;">✓ Disahkan</span>'
        }
        <a href="index.html?openCheckout=1" target="_blank" class="btn-view-receipt" title="Buka kuitansi di halaman utama">
          <span>Lihat Kuitansi</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </a>
      </td>
    `;

    tableBody.appendChild(tr);

    // Attach Action Handlers
    const approveBtn = document.getElementById('approveActionBtn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => {
        order.status = 'APPROVED';
        order.verifiedAt = new Date().toLocaleString('id-ID');
        order.verifiedBy = `${session.name} (${session.id || 'ADM-FIN-01'})`;
        saveOrderData(order);

        renderTable();
        showToast(`Pembayaran ${order.accountId} senilai ${order.totalIdr} Berhasil Disetujui!`);
        appendAuditLog(
          `<strong>OTORISASI SUKSES:</strong> Petugas ${session.name} menyetujui transaksi ${order.accountId} (${order.name} - ${order.org}). Lisensi ${order.licenseKey} resmi aktif.`,
          '#10b981'
        );
      });
    }

    const rejectBtn = document.getElementById('rejectActionBtn');
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        order.status = 'REJECTED';
        saveOrderData(order);
        renderTable();
        showToast('Transaksi ditolak. Notifikasi perbaikan dikirim ke pemesan.');
        appendAuditLog(
          `<strong>TRANSAKSI DITOLAK:</strong> Petugas ${session.name} menolak transaksi ${order.accountId}. Menunggu revisi bukti transfer pemesan.`,
          '#ef4444'
        );
      });
    }
  }

  renderTable();
  appendAuditLog('Konsol Keuangan siap. Sesi aktif diverifikasi atas nama M. Bahrudin (ADM-FIN-01).', '#38bdf8');
})();
