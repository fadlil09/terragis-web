(() => {
  'use strict';

  const MODULES = [
    {
      id: 'core',
      name: 'Lisensi Core Web GIS Platform',
      price: 65,
      priceIdr: 1185796
    },
    {
      id: 'spatial',
      name: 'Modul Integrasi Data Spasial & Basemap HD',
      price: 25,
      priceIdr: 456075
    },
    {
      id: 'deploy',
      name: 'Konfigurasi Server Cloud, Domain & SSL/TLS',
      price: 15,
      priceIdr: 273645
    },
    {
      id: 'support',
      name: 'Dukungan Teknis & Dokumentasi API (12 Bulan)',
      price: 10,
      priceIdr: 182431
    }
  ];

  const USD_TO_IDR = 2097947 / 115;

  const state = {
    selectedIds: new Set(MODULES.map((m) => m.id)),
    showIdr: false,
    paymentMethod: 'Kartu Kredit / Debit (Visa & Mastercard)',
    zoom: 1,
    currentUser: null
  };

  // DOM References
  const htmlEl = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const currencyBtns = document.querySelectorAll('.currency-btn');
  const moduleCards = document.querySelectorAll('.module-card');
  const moduleCheckboxes = document.querySelectorAll('.module-checkbox');
  const selectAllBundleBtn = document.getElementById('selectAllBundleBtn');
  const summaryItemsEl = document.getElementById('summaryItems');
  const selectedCountEl = document.getElementById('selectedCount');
  const subtotalDisplayEl = document.getElementById('subtotalDisplay');
  const totalDisplayEl = document.getElementById('totalDisplay');
  const totalIdrEstimateEl = document.getElementById('totalIdrEstimate');
  const checkoutBtnTextEl = document.getElementById('checkoutBtnText');
  const openCheckoutBtn = document.getElementById('openCheckoutBtn');
  const paymentBtns = document.querySelectorAll('.payment-btn');

  // Modal Elements
  const checkoutModal = document.getElementById('checkoutModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const checkoutStepForm = document.getElementById('checkoutStepForm');
  const checkoutStepInvoice = document.getElementById('checkoutStepInvoice');
  const checkoutForm = document.getElementById('checkoutForm');
  const formError = document.getElementById('formError');
  const modalTotalAmount = document.getElementById('modalTotalAmount');
  const modalSelectedMethod = document.getElementById('modalSelectedMethod');
  const confirmPayBtn = document.getElementById('confirmPayBtn');

  // Auth / User Corner Elements
  const navLoginBtn = document.getElementById('navLoginBtn');
  const navUserMenu = document.getElementById('navUserMenu');
  const navUserTrigger = document.getElementById('navUserTrigger');
  const navUserDropdown = document.getElementById('navUserDropdown');
  const navUserAvatar = document.getElementById('navUserAvatar');
  const navUserName = document.getElementById('navUserName');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const dropdownUserProvider = document.getElementById('dropdownUserProvider');
  const logoutBtn = document.getElementById('logoutBtn');

  const summaryUserBadge = document.getElementById('summaryUserBadge');
  const summaryUserAvatar = document.getElementById('summaryUserAvatar');
  const summaryUserName = document.getElementById('summaryUserName');
  const summaryLoginLink = document.getElementById('summaryLoginLink');

  const modalUserBadge = document.getElementById('modalUserBadge');
  const modalUserAvatar = document.getElementById('modalUserAvatar');
  const modalUserName = document.getElementById('modalUserName');
  const modalUserEmail = document.getElementById('modalUserEmail');
  const modalLoginLink = document.getElementById('modalLoginLink');
  const modalAuthPrompt = document.getElementById('modalAuthPrompt');

  // Geospatial Map Elements
  const layerToggles = document.querySelectorAll('[data-layer]');
  const gisInteractiveSvg = document.getElementById('gisInteractiveSvg');
  const mapViewport = document.getElementById('mapViewport');
  const liveCoords = document.getElementById('liveCoords');
  const featureInspector = document.getElementById('featureInspector');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomReadout = document.getElementById('zoomReadout');

  const formatUSD = (value) => `$${value.toFixed(2)}`;
  const formatIDR = (usdValue) => {
    if (usdValue === 115) return '≈ Rp 2.097.947';
    if (usdValue === 65) return '≈ Rp 1.185.796';
    if (usdValue === 25) return '≈ Rp 456.075';
    if (usdValue === 15) return '≈ Rp 273.645';
    if (usdValue === 10) return '≈ Rp 182.431';
    const idr = Math.round(usdValue * USD_TO_IDR);
    return `≈ Rp ${idr.toLocaleString('id-ID')}`;
  };

  function getSelectedModules() {
    return MODULES.filter((m) => state.selectedIds.has(m.id));
  }

  function getTotalUSD() {
    return getSelectedModules().reduce((sum, m) => sum + m.price, 0);
  }

  // Theme Initialization (Executive Light default, saved preference respected)
  const savedTheme = localStorage.getItem('terragis-enterprise-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    htmlEl.setAttribute('data-theme', savedTheme);
  }

  themeToggle.addEventListener('click', () => {
    const nextTheme = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', nextTheme);
    localStorage.setItem('terragis-enterprise-theme', nextTheme);
  });

  // Render Pricing & Summary
  function renderPricing() {
    const selected = getSelectedModules();
    const total = getTotalUSD();

    moduleCards.forEach((card) => {
      const id = card.dataset.id;
      const isSelected = state.selectedIds.has(id);
      card.classList.toggle('selected', isSelected);
      const cb = card.querySelector('.module-checkbox');
      if (cb) cb.checked = isSelected;

      const idrLabel = card.querySelector('[data-idr-for]');
      if (idrLabel) {
        const usd = Number(idrLabel.dataset.idrFor);
        idrLabel.textContent = state.showIdr ? formatIDR(usd) : '';
      }
    });

    summaryItemsEl.innerHTML = '';
    if (selected.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'summary-empty';
      emptyEl.textContent = 'Pilih minimal 1 komponen GIS atau klik "Pilih Semua Komponen ($115)".';
      summaryItemsEl.appendChild(emptyEl);
    } else {
      selected.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'summary-item-line';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;

        const priceSpan = document.createElement('span');
        priceSpan.className = 'mono';
        priceSpan.textContent = formatUSD(item.price);

        row.appendChild(nameSpan);
        row.appendChild(priceSpan);
        summaryItemsEl.appendChild(row);
      });
    }

    selectedCountEl.textContent = String(selected.length);
    subtotalDisplayEl.textContent = `${formatUSD(total)} USD`;
    totalDisplayEl.textContent = formatUSD(total);
    totalIdrEstimateEl.textContent = state.showIdr && total > 0 ? formatIDR(total) : '';

    checkoutBtnTextEl.textContent =
      total > 0
        ? `Lanjutkan Pembayaran — ${formatUSD(total)} USD`
        : 'Pilih Komponen Terlebih Dahulu';
    openCheckoutBtn.disabled = total === 0;
  }

  moduleCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        state.selectedIds.add(id);
      } else {
        state.selectedIds.delete(id);
      }
      renderPricing();
    });
  });

  moduleCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('label.checkbox-wrap')) return;
      const id = card.dataset.id;
      if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
      } else {
        state.selectedIds.add(id);
      }
      renderPricing();
    });
  });

  selectAllBundleBtn.addEventListener('click', () => {
    state.selectedIds = new Set(MODULES.map((m) => m.id));
    syncOrderState();
  renderPricing();
  });

  currencyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currencyBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.showIdr = btn.dataset.currency === 'BOTH';
      renderPricing();
    });
  });

  paymentBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      paymentBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.paymentMethod = btn.dataset.method;
    });
  });

  // Server-Verified Google Auth Session Helpers
  function getInitials(name) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function renderUserAvatar(containerEl, user) {
    containerEl.innerHTML = '';
    if (user.picture) {
      const img = document.createElement('img');
      img.src = user.picture;
      img.alt = user.name;
      img.referrerPolicy = 'no-referrer';
      img.className = 'user-avatar-img';
      img.onerror = () => {
        containerEl.textContent = getInitials(user.name);
      };
      containerEl.appendChild(img);
    } else {
      containerEl.textContent = getInitials(user.name);
    }
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) {
        state.currentUser = null;
      } else {
        const data = await res.json();
        state.currentUser = data.authenticated && data.user ? data.user : null;
      }
    } catch {
      state.currentUser = null;
    }
    renderAuthUI();
    return state.currentUser;
  }

  function renderAuthUI() {
    const user = state.currentUser;
    const isSignedIn = Boolean(user);

    // 1. Navbar Corner
    navLoginBtn.classList.toggle('hidden', isSignedIn);
    navUserMenu.classList.toggle('hidden', !isSignedIn);

    // 2. Payment Order Summary Corner
    summaryUserBadge.classList.toggle('hidden', !isSignedIn);
    summaryLoginLink.classList.toggle('hidden', isSignedIn);

    // 3. Payment Modal Corner
    modalUserBadge.classList.toggle('hidden', !isSignedIn);
    modalLoginLink.classList.toggle('hidden', isSignedIn);
    modalAuthPrompt.classList.toggle('hidden', isSignedIn);

    if (isSignedIn) {
      renderUserAvatar(navUserAvatar, user);
      navUserName.textContent = user.name;
      dropdownUserName.textContent = user.name;
      dropdownUserEmail.textContent = user.email || '';
      dropdownUserProvider.textContent = 'Akun Google Terverifikasi';

      renderUserAvatar(summaryUserAvatar, user);
      summaryUserName.textContent = user.name;
      summaryUserBadge.title = `${user.name} (${user.email || ''})`;

      renderUserAvatar(modalUserAvatar, user);
      modalUserName.textContent = user.name;
      modalUserEmail.textContent = user.email || '';
    }
  }

  navUserTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !navUserDropdown.classList.contains('hidden');
    navUserDropdown.classList.toggle('hidden', isOpen);
    navUserTrigger.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!navUserMenu.contains(e.target)) {
      navUserDropdown.classList.add('hidden');
      navUserTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // ignore
    }
    state.currentUser = null;
    navUserDropdown.classList.add('hidden');
    renderAuthUI();
  });

  // Checkout Modal Logic
  function openModal() {
    const total = getTotalUSD();
    if (total === 0) return;

    renderAuthUI();

    const user = state.currentUser;
    const nameInput = document.getElementById('buyerName');
    const orgInput = document.getElementById('buyerOrg');
    const emailInput = document.getElementById('buyerEmail');
    const phoneInput = document.getElementById('buyerPhone');

    if (nameInput && !nameInput.value.trim()) {
      nameInput.value = user?.name || 'M Bahrudin';
    }
    if (emailInput && !emailInput.value.trim()) {
      emailInput.value = user?.email || 'muhammadbahrudin1409@gmail.com';
    }
    if (orgInput && !orgInput.value.trim()) {
      orgInput.value = 'DISKOMINFO';
    }
    if (phoneInput && !phoneInput.value.trim()) {
      phoneInput.value = '0821-1388-2147';
    }

    modalTotalAmount.textContent = `${formatUSD(total)} USD`;
    modalSelectedMethod.textContent = state.paymentMethod;
    confirmPayBtn.textContent = `Terbitkan Invoice (${formatUSD(total)} USD)`;
    formError.textContent = '';

    checkoutStepForm.classList.remove('hidden');
    checkoutStepInvoice.classList.add('hidden');

    checkoutModal.classList.add('open');
    checkoutModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    checkoutModal.classList.remove('open');
    checkoutModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openCheckoutBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModal.classList.contains('open')) {
      closeModal();
    }
  });

  // Cloud Billing & Bukti Bayar Elements
  const bTopAccountId = document.getElementById('bTopAccountId');
  const bTopBalanceIdr = document.getElementById('bTopBalanceIdr');
  const bTopBalanceUsd = document.getElementById('bTopBalanceUsd');
  const billingAccountName = document.getElementById('billingAccountName');
  const bAccountId = document.getElementById('bAccountId');
  const bAccountName = document.getElementById('bAccountName');
  const bCompanyName = document.getElementById('bCompanyName');
  const bInvoiceEmail = document.getElementById('bInvoiceEmail');
  const bContactName = document.getElementById('bContactName');
  const bContactPhone = document.getElementById('bContactPhone');
  const bPaymentMethod = document.getElementById('bPaymentMethod');
  const bCreatedDate = document.getElementById('bCreatedDate');
  const bBalanceIdr = document.getElementById('bBalanceIdr');
  const bBalanceUsd = document.getElementById('bBalanceUsd');
  const billingTableBody = document.getElementById('billingTableBody');
  const billingGrandTotalUsd = document.getElementById('billingGrandTotalUsd');
  const billingGrandTotalIdr = document.getElementById('billingGrandTotalIdr');
  const paymentInstructionBox = document.getElementById('paymentInstructionBox');
  const printBillingBtn = document.getElementById('printBillingBtn');
  const confirmPrintBtn = document.getElementById('confirmPrintBtn');
  const backToFormBtn = document.getElementById('backToFormBtn');
  const closeBillingModalBtn = document.getElementById('closeBillingModalBtn');
  const paidSuccessBanner = document.getElementById('paidSuccessBanner');
  const balanceTitle = document.getElementById('balanceTitle');
  const bStatusBadge = document.getElementById('bStatusBadge');
  const tabReceiptBtn = document.getElementById('tabReceiptBtn');
  const rKuitansiNo = document.getElementById('rKuitansiNo');
  const rStampDate = document.getElementById('rStampDate');
  const rPayerName = document.getElementById('rPayerName');
  const rPayerOrg = document.getElementById('rPayerOrg');
  const rPayerEmail = document.getElementById('rPayerEmail');
  const rPaidMethod = document.getElementById('rPaidMethod');
  const rPaidTimestamp = document.getElementById('rPaidTimestamp');
  const rTotalIdr = document.getElementById('rTotalIdr');
  const rLicenseKey = document.getElementById('rLicenseKey');
  const rWatermark = document.getElementById('rWatermark');
  const rCircleStamp = document.getElementById('rCircleStamp');
  const rStampPaidText = document.getElementById('rStampPaidText');
  const rPaidStatusBadge = document.getElementById('rPaidStatusBadge');
  const rLicenseNote = document.getElementById('rLicenseNote');
  const rVerifierFootnote = document.getElementById('rVerifierFootnote');

  // Buyer Proof Elements
  const buyerSubmitProofBtn = document.getElementById('buyerSubmitProofBtn');
  const proofAmountDisplay = document.getElementById('proofAmountDisplay');
  const proofSenderInput = document.getElementById('proofSenderInput');
  const proofRefInput = document.getElementById('proofRefInput');
  const proofSubmittedNotice = document.getElementById('proofSubmittedNotice');

  // Customer Modal Status Pill
  const footerStatusDot = document.getElementById('footerStatusDot');
  const footerStatusText = document.getElementById('footerStatusText');

  const billingTabs = document.querySelectorAll('.b-tab');

  function getSavedOrder() {
    try {
      const saved = localStorage.getItem('terragis_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  function saveOrder(order) {
    try {
      localStorage.setItem('terragis_order', JSON.stringify(order));
    } catch {
      // ignore
    }
  }

  function applyApprovedUI(order) {
    if (!order) return;
    if (paidSuccessBanner) paidSuccessBanner.classList.remove('hidden');
    if (bStatusBadge) {
      bStatusBadge.textContent = 'LUNAS / TERVERIFIKASI RESMI';
      bStatusBadge.className = 'badge-status-paid';
    }
    if (balanceTitle) balanceTitle.textContent = 'Status Tagihan:';
    if (rWatermark) rWatermark.classList.add('hidden');
    if (rCircleStamp) rCircleStamp.className = 'official-circle-stamp';
    if (rStampPaidText) rStampPaidText.textContent = 'LUNAS';
    if (rPaidStatusBadge) {
      rPaidStatusBadge.textContent = 'Status: LUNAS / Diverifikasi Tim Finance';
      rPaidStatusBadge.className = 'badge-status-paid';
    }
    if (rLicenseKey) rLicenseKey.textContent = order.licenseKey || 'TGIS-2026-PRO-9812-44E1';
    if (rLicenseNote) {
      rLicenseNote.textContent = 'Lisensi komersial ini telah aktif sepenuhnya dan diverifikasi sah oleh Tim Keuangan TerraGIS untuk instansi pemesan.';
    }
    if (rVerifierFootnote) {
      rVerifierFootnote.innerHTML = `<strong>Otorisasi Resmi Sah:</strong> Disetujui &amp; diverifikasi oleh Tim Keuangan TerraGIS (ID: ADM-FIN-01) pada ${order.verifiedAt || 'Hari ini'}. Dokumen Sah.`;
    }
    if (footerStatusDot) footerAdminDotClass(footerStatusDot, 'pulse-dot-green');
    if (footerStatusText) {
      footerStatusText.innerHTML = '<strong style="color: #16a34a;">LUNAS — Telah Diverifikasi Resmi oleh Tim Finance TerraGIS</strong>';
    }
  }

  function footerAdminDotClass(el, cls) {
    if (el) el.className = cls;
  }

  function syncOrderState() {
    const order = getSavedOrder();
    if (order && order.status === 'APPROVED') {
      applyApprovedUI(order);
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'terragis_order') {
      syncOrderState();
    }
  });

  function renderPaymentInstructions(method, idrFormatted, accountId) {
    if (!paymentInstructionBox) return;

    if (method.includes('QRIS')) {
      paymentInstructionBox.innerHTML = `
        <div class="pay-card-head">
          <h4>Pembayaran Instan via QRIS Nasional</h4>
          <span class="badge-status-ready">Kode QR Aktif</span>
        </div>
        <div class="qris-display-box">
          <div class="qris-qr-frame">
            <svg class="qris-qr-svg" viewBox="0 0 100 100" fill="#0f172a">
              <rect width="100" height="100" fill="#ffffff" />
              <!-- Finder Patterns -->
              <rect x="6" y="6" width="26" height="26" fill="#0f172a" />
              <rect x="10" y="10" width="18" height="18" fill="#ffffff" />
              <rect x="14" y="14" width="10" height="10" fill="#0f172a" />

              <rect x="68" y="6" width="26" height="26" fill="#0f172a" />
              <rect x="72" y="10" width="18" height="18" fill="#ffffff" />
              <rect x="76" y="14" width="10" height="10" fill="#0f172a" />

              <rect x="6" y="68" width="26" height="26" fill="#0f172a" />
              <rect x="10" y="72" width="18" height="18" fill="#ffffff" />
              <rect x="14" y="76" width="10" height="10" fill="#0f172a" />

              <!-- Data Matrix Elements -->
              <rect x="38" y="10" width="6" height="6" />
              <rect x="50" y="12" width="6" height="6" />
              <rect x="38" y="24" width="8" height="6" />
              <rect x="52" y="26" width="6" height="6" />
              <rect x="10" y="38" width="6" height="8" />
              <rect x="22" y="42" width="8" height="6" />
              <rect x="36" y="38" width="14" height="14" fill="#047857" />
              <rect x="56" y="40" width="8" height="6" />
              <rect x="72" y="38" width="6" height="8" />
              <rect x="84" y="44" width="6" height="6" />
              <rect x="38" y="60" width="8" height="8" />
              <rect x="54" y="56" width="6" height="12" />
              <rect x="68" y="62" width="8" height="6" />
              <rect x="80" y="58" width="10" height="6" />
              <rect x="42" y="76" width="8" height="6" />
              <rect x="56" y="74" width="10" height="8" />
              <rect x="72" y="78" width="6" height="12" />
              <rect x="84" y="74" width="8" height="6" />
            </svg>
          </div>
          <div class="qris-info">
            <span class="qris-amount-pill mono">${idrFormatted}</span>
            <p style="margin: 0 0 0.35rem; font-size: 0.86rem; color: var(--text-secondary);">
              Scan QRIS di atas menggunakan aplikasi mobile banking atau dompet digital Anda:
            </p>
            <div class="qris-apps-list">
              <span>BCA Mobile</span>
              <span>Livin' Mandiri</span>
              <span>BRImo</span>
              <span>BNI Mobile</span>
              <span>GoPay</span>
              <span>OVO</span>
              <span>DANA</span>
              <span>ShopeePay</span>
            </div>
            <p style="margin: 0.75rem 0 0; font-size: 0.78rem; color: var(--text-muted);">
              ID Billing: <strong class="mono">${accountId}</strong> • Verifikasi pembayaran otomatis dalam 1–3 menit.
            </p>
          </div>
        </div>
      `;
    } else if (method.includes('Transfer Bank')) {
      const vaBca = `8801${accountId}`;
      const vaMandiri = `8902${accountId}`;
      paymentInstructionBox.innerHTML = `
        <div class="pay-card-head">
          <h4>Nomor Virtual Account &amp; Transfer Bank</h4>
          <span class="badge-status-ready">VA Aktif</span>
        </div>
        <p style="margin: 0 0 0.85rem; font-size: 0.86rem; color: var(--text-secondary);">
          Transfer tepat sejumlah <strong>${idrFormatted}</strong> ke salah satu rekening Virtual Account di bawah:
        </p>
        <div class="va-item">
          <div>
            <strong style="display: block; font-size: 0.88rem;">BCA Virtual Account</strong>
            <span class="mono" style="font-size: 1.05rem; font-weight: 700; color: var(--text);">${vaBca}</span>
          </div>
          <button type="button" class="btn btn-outline va-copy-btn" onclick="navigator.clipboard.writeText('${vaBca}'); this.textContent='Tersalin!'; setTimeout(()=>this.textContent='Salin VA', 1500);">Salin VA</button>
        </div>
        <div class="va-item">
          <div>
            <strong style="display: block; font-size: 0.88rem;">Mandiri Virtual Account</strong>
            <span class="mono" style="font-size: 1.05rem; font-weight: 700; color: var(--text);">${vaMandiri}</span>
          </div>
          <button type="button" class="btn btn-outline va-copy-btn" onclick="navigator.clipboard.writeText('${vaMandiri}'); this.textContent='Tersalin!'; setTimeout(()=>this.textContent='Salin VA', 1500);">Salin VA</button>
        </div>
        <p style="margin: 0.65rem 0 0; font-size: 0.78rem; color: var(--text-muted);">
          Atas Nama: <strong>TerraGIS Enterprise Solutions</strong> • Konfirmasi otomatis 24 jam.
        </p>
      `;
    } else {
      paymentInstructionBox.innerHTML = `
        <div class="pay-card-head">
          <h4>Metode Pembayaran: ${method}</h4>
          <span class="badge-status-ready">Siap Otorisasi</span>
        </div>
        <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">
          <p style="margin: 0 0 0.5rem;">
            Total tagihan lisensi: <strong class="mono" style="color: #16a34a; font-size: 1.1rem;">${idrFormatted}</strong> <span class="mono muted">($115.00 USD)</span>.
          </p>
          <p style="margin: 0;">
            Koneksi gateway pembayaran terenkripsi TLS 1.3 aman. Tanda terima dan lisensi komersial diterbitkan instan ke email terdaftar setelah konfirmasi.
          </p>
        </div>
      `;
    }
  }

  // Tabs Switcher
  billingTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      billingTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.dataset.tab;
      document.querySelectorAll('.b-tab-content').forEach((pane) => {
        pane.classList.toggle('hidden', pane.id !== targetId);
      });
    });
  });

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('buyerName');
    const orgInput = document.getElementById('buyerOrg');
    const emailInput = document.getElementById('buyerEmail');
    const phoneInput = document.getElementById('buyerPhone');

    const name = (nameInput?.value || '').trim() || state.currentUser?.name || 'M Bahrudin';
    const org = (orgInput?.value || '').trim() || 'DISKOMINFO';
    const email = (emailInput?.value || '').trim() || state.currentUser?.email || 'muhammadbahrudin1409@gmail.com';
    const phone = (phoneInput?.value || '').trim() || '0821-1388-2147';

    formError.textContent = '';

    const selected = getSelectedModules();
    const total = getTotalUSD();
    const totalIdr = formatIDR(total).replace('≈ ', '');
    const now = new Date();
    const formattedCreated = `${now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB`;

    const accountId = '12002' + String(Math.floor(10000 + Math.random() * 90000));

    // Populate Cloud Billing Header & Fields (matches user screenshot!)
    if (bTopAccountId) bTopAccountId.textContent = accountId;
    if (bTopBalanceIdr) bTopBalanceIdr.textContent = totalIdr;
    if (bTopBalanceUsd) bTopBalanceUsd.textContent = `(${formatUSD(total)} USD)`;

    if (billingAccountName) billingAccountName.textContent = name;
    if (bAccountId) bAccountId.textContent = accountId;
    if (bAccountName) bAccountName.textContent = name;
    if (bCompanyName) bCompanyName.textContent = org;
    if (bInvoiceEmail) bInvoiceEmail.textContent = email;
    if (bContactName) bContactName.textContent = name;
    if (bContactPhone) bContactPhone.textContent = phone;
    if (bPaymentMethod) bPaymentMethod.textContent = state.paymentMethod;
    if (bCreatedDate) bCreatedDate.textContent = formattedCreated;
    if (bBalanceIdr) bBalanceIdr.textContent = totalIdr;
    if (bBalanceUsd) bBalanceUsd.textContent = `(${formatUSD(total)} USD)`;

    // Populate Component Table with both USD and Rupiah
    if (billingTableBody) {
      billingTableBody.innerHTML = '';
      selected.forEach((item) => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = item.name;

        const tdPriceUsd = document.createElement('td');
        tdPriceUsd.className = 'align-right mono';
        tdPriceUsd.textContent = formatUSD(item.price);

        const tdPriceIdr = document.createElement('td');
        tdPriceIdr.className = 'align-right mono';
        tdPriceIdr.textContent = formatIDR(item.price).replace('≈ ', '');

        tr.appendChild(tdName);
        tr.appendChild(tdPriceUsd);
        tr.appendChild(tdPriceIdr);
        billingTableBody.appendChild(tr);
      });
    }

    if (billingGrandTotalUsd) billingGrandTotalUsd.textContent = `${formatUSD(total)} USD`;
    if (billingGrandTotalIdr) billingGrandTotalIdr.textContent = totalIdr;

    // Render payment method instructions (QRIS / Bank VA / Card)
    renderPaymentInstructions(state.paymentMethod, totalIdr, accountId);

    // Reset tabs to first tab
    if (billingTabs.length > 0) {
      billingTabs[0].click();
    }

    const randomTrx = String(Math.floor(1000 + Math.random() * 9000));
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const licenseKey = `TGIS-2026-PRO-${randomTrx}-${randomCode}`;

    const orderData = {
      accountId,
      name,
      org,
      email,
      phone,
      method: state.paymentMethod,
      totalUsd: formatUSD(total),
      totalIdr,
      createdAt: formattedCreated,
      status: 'PENDING_VERIFICATION',
      licenseKey,
      items: selected.map((s) => ({ name: s.name, price: s.price }))
    };
    saveOrder(orderData);

    // Reset tabs to first tab
    if (billingTabs.length > 0) {
      billingTabs[0].click();
    }

    // Set initial pending UI
    if (paidSuccessBanner) paidSuccessBanner.classList.add('hidden');
    if (bStatusBadge) {
      bStatusBadge.textContent = 'Menunggu Pembayaran / Verifikasi Tim Finance';
      bStatusBadge.className = 'badge-status-pending';
    }
    if (balanceTitle) balanceTitle.textContent = 'Total Tagihan:';

    if (proofAmountDisplay) proofAmountDisplay.textContent = totalIdr;
    if (proofSubmittedNotice) proofSubmittedNotice.classList.add('hidden');
    if (buyerSubmitProofBtn) {
      buyerSubmitProofBtn.disabled = false;
      buyerSubmitProofBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <span>Konfirmasi Pembayaran Telah Dilakukan</span>
      `;
    }

    if (rKuitansiNo) rKuitansiNo.textContent = `KWT-TGIS-${now.getFullYear()}-${randomTrx}`;
    if (rStampDate) rStampDate.textContent = formattedCreated.split(',')[0];
    if (rPayerName) rPayerName.textContent = name;
    if (rPayerOrg) rPayerOrg.textContent = org;
    if (rPayerEmail) rPayerEmail.textContent = email;
    if (rPaidMethod) rPaidMethod.textContent = state.paymentMethod;
    if (rPaidTimestamp) rPaidTimestamp.textContent = formattedCreated;
    if (rTotalIdr) rTotalIdr.textContent = totalIdr;
    if (rWatermark) rWatermark.classList.remove('hidden');
    if (rCircleStamp) rCircleStamp.className = 'official-circle-stamp pending-stamp';
    if (rStampPaidText) rStampPaidText.textContent = 'MENUNGGU VERIFIKASI';
    if (rPaidStatusBadge) {
      rPaidStatusBadge.textContent = 'Status: Menunggu Verifikasi Tim Finance';
      rPaidStatusBadge.className = 'badge-status-pending';
    }
    if (rLicenseKey) rLicenseKey.textContent = 'TERKUNCI — Diterbitkan Setelah Verifikasi';
    if (rLicenseNote) {
      rLicenseNote.textContent = 'Kredensial lisensi komersial resmi ini akan diaktifkan secara otomatis setelah pembayaran diverifikasi oleh Tim Keuangan TerraGIS.';
    }
    if (rVerifierFootnote) {
      rVerifierFootnote.textContent = 'Otorisasi Dokumen: Menunggu proses verifikasi penerimaan dana oleh Tim Keuangan TerraGIS.';
    }

    if (footerStatusDot) footerAdminDotClass(footerStatusDot, 'pulse-dot-amber');
    if (footerStatusText) {
      footerStatusText.textContent = 'Status: Menunggu Verifikasi Pembayaran oleh Tim Finance TerraGIS';
    }

    checkoutStepForm.classList.add('hidden');
    checkoutStepInvoice.classList.remove('hidden');

    const dialog = checkoutModal.querySelector('.modal-dialog');
    if (dialog) dialog.scrollTop = 0;
  });

  // Buyer Submit Proof Handler
  if (buyerSubmitProofBtn) {
    buyerSubmitProofBtn.addEventListener('click', () => {
      if (proofSubmittedNotice) proofSubmittedNotice.classList.remove('hidden');
      buyerSubmitProofBtn.disabled = true;
      buyerSubmitProofBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Konfirmasi Diterima — Dalam Antrean Verifikasi Tim Finance</span>
      `;
      if (bStatusBadge) {
        bStatusBadge.textContent = 'Sedang Diverifikasi Tim Finance TerraGIS';
        bStatusBadge.className = 'badge-status-pending';
      }
      if (footerStatusText) {
        footerStatusText.textContent = 'Status: Konfirmasi Pembayaran Sedang Diverifikasi oleh Tim Finance (1x24 Jam)';
      }
      const currentOrder = getSavedOrder() || {};
      currentOrder.proofSender = proofSenderInput?.value?.trim() || '';
      currentOrder.proofRef = proofRefInput?.value?.trim() || '';
      currentOrder.proofSubmittedAt = new Date().toLocaleString('id-ID');
      saveOrder(currentOrder);
    });
  }

  if (backToFormBtn) {
    backToFormBtn.addEventListener('click', () => {
      checkoutStepInvoice.classList.add('hidden');
      checkoutStepForm.classList.remove('hidden');
    });
  }

  if (closeBillingModalBtn) {
    closeBillingModalBtn.addEventListener('click', closeModal);
  }

  if (printBillingBtn) {
    printBillingBtn.addEventListener('click', () => window.print());
  }

  if (confirmPrintBtn) {
    confirmPrintBtn.addEventListener('click', () => window.print());
  }

  // Geospatial Map Controls
  layerToggles.forEach((toggle) => {
    toggle.addEventListener('change', (e) => {
      const targetLayer = document.getElementById(e.target.dataset.layer);
      if (targetLayer) {
        targetLayer.classList.toggle('layer-hidden', !e.target.checked);
      }
    });
  });

  gisInteractiveSvg.addEventListener('mousemove', (e) => {
    const rect = gisInteractiveSvg.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;

    const lat = (-6.86 - ry * 0.14).toFixed(4);
    const lng = (107.52 + rx * 0.24).toFixed(4);
    liveCoords.textContent = `LAT: ${lat} | LNG: ${lng}`;
  });

  document.querySelectorAll('.interactive-feature').forEach((feature) => {
    feature.addEventListener('click', () => {
      const title = feature.dataset.title || 'Objek Spasial';
      const type = feature.dataset.type || '-';
      const area = feature.dataset.area || '-';
      const coord = feature.dataset.coord || '-';

      featureInspector.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = title;

      const kv = document.createElement('div');
      kv.className = 'inspector-kv';
      kv.innerHTML = `
        <div><span class="muted">Tipe</span><span class="mono">${type}</span></div>
        <div><span class="muted">Metrik</span><span class="mono">${area}</span></div>
        <div><span class="muted">Koordinat</span><span class="mono">${coord}</span></div>
      `;

      featureInspector.appendChild(strong);
      featureInspector.appendChild(kv);
    });
  });

  function applyZoom() {
    const cx = 400;
    const cy = 235;
    const tx = cx - cx * state.zoom;
    const ty = cy - cy * state.zoom;
    mapViewport.setAttribute(
      'transform',
      `translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${state.zoom.toFixed(2)})`
    );
    zoomReadout.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  zoomInBtn.addEventListener('click', () => {
    state.zoom = Math.min(2.0, +(state.zoom + 0.2).toFixed(2));
    applyZoom();
  });

  zoomOutBtn.addEventListener('click', () => {
    state.zoom = Math.max(0.8, +(state.zoom - 0.2).toFixed(2));
    applyZoom();
  });

  zoomResetBtn.addEventListener('click', () => {
    state.zoom = 1;
    applyZoom();
  });

  syncOrderState();
  renderPricing();
  fetchCurrentUser().then(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openCheckout') === '1') {
      openModal();
      window.history.replaceState({}, '', `${window.location.pathname}#pricing`);
    }
  });
})();
