/* ─── Finance page ────────────────────────────────────────────────────────── */

const formatAmount = (n) => {
  const abs = Math.abs(n);
  return '₱' + abs.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (ts) => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ── Hero ──────────────────────────────────────────────────────────────────── */
function renderHero() {
  const total = Store.finances.getTotal();
  document.getElementById('hero-total').textContent =
    total.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const txs = Store.finances.getAll();
  const updated = txs.length > 0
    ? 'updated ' + formatTime(txs[0].createdAt)
    : 'no transactions yet';
  document.getElementById('hero-updated').textContent = updated;
}

/* ── Account Cards ─────────────────────────────────────────────────────────── */
function renderAccounts() {
  const accounts = Store.finances.getAccounts();
  const total = Store.finances.getTotal();

  const keys = ['gcash', 'card', 'cash'];
  keys.forEach(key => {
    const amount = accounts[key] ?? 0;
    const pct = total > 0 ? Math.max(0, (amount / total) * 100) : 0;

    const amtEl = document.getElementById('amt-' + key);
    const barEl = document.getElementById('bar-' + key);

    if (amtEl) {
      amtEl.textContent = formatAmount(amount);
      amtEl.style.color = amount < 0 ? '#E05A5A' : '#7CB98A';
    }
    if (barEl) barEl.style.width = pct.toFixed(1) + '%';
  });
}

/* ── Recurring ─────────────────────────────────────────────────────────────── */
function renderRecurring() {
  const list = document.getElementById('recurring-list');
  if (!list) return;

  const items = Store.recurring.getAll();

  if (items.length === 0) {
    list.innerHTML = '<div style="font-family:var(--font-mono);font-size:var(--font-size-xs);color:var(--text-dim);padding:var(--space-sm) 0">no recurring income set up</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="recurring-item" data-id="${item.id}">
      <div class="recurring-item__name">${escHtml(item.name)}</div>
      <div class="recurring-item__amount">${formatAmount(item.amount)}</div>
      <div class="recurring-item__freq">${item.frequency}</div>
      <div class="recurring-item__account">${item.account}</div>
      <button class="btn-icon btn-delete-recurring" data-id="${item.id}" aria-label="Delete" style="
        background:none;border:none;cursor:pointer;color:var(--text-dim);
        font-size:14px;padding:4px 6px;border-radius:4px;
        opacity:0;transition:opacity 0.15s;margin-left:auto;
      ">✕</button>
    </div>
  `).join('');

  // Hover reveal delete buttons
  list.querySelectorAll('.recurring-item').forEach(row => {
    const btn = row.querySelector('.btn-delete-recurring');
    row.addEventListener('mouseenter', () => btn.style.opacity = '1');
    row.addEventListener('mouseleave', () => btn.style.opacity = '0');
  });

  list.querySelectorAll('.btn-delete-recurring').forEach(btn => {
    btn.addEventListener('click', () => {
      Store.recurring.delete(btn.dataset.id);
      renderAll();
    });
  });
}

/* ── Transactions ──────────────────────────────────────────────────────────── */
function renderTransactions() {
  const txList = document.getElementById('tx-list');
  const txCount = document.getElementById('tx-count');
  if (!txList) return;

  const txs = Store.finances.getAll().slice(0, 20);

  if (txCount) txCount.textContent = txs.length + ' entr' + (txs.length === 1 ? 'y' : 'ies');

  if (txs.length === 0) {
    txList.innerHTML = '<div style="font-family:var(--font-mono);font-size:var(--font-size-xs);color:var(--text-dim);padding:var(--space-md) 0;text-align:center">no transactions yet — add or spend some money above</div>';
    return;
  }

  txList.innerHTML = txs.map(tx => `
    <div class="tx-item">
      <div class="tx-item__desc">${escHtml(tx.description || '—')}</div>
      <div class="tx-item__account">${tx.account}</div>
      <div class="tx-item__amount tx-item__amount--${tx.type === 'in' ? 'in' : 'out'}">
        ${tx.type === 'in' ? '+' : '-'}${formatAmount(tx.amount)}
      </div>
      <div class="tx-item__date">${formatDate(tx.createdAt)}</div>
    </div>
  `).join('');
}

/* ── Render All ────────────────────────────────────────────────────────────── */
function renderAll() {
  renderHero();
  renderAccounts();
  renderRecurring();
  renderTransactions();
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInputs(prefix) {
  return {
    amount: document.getElementById(prefix + '-amount'),
    desc: document.getElementById(prefix + '-desc'),
    account: document.getElementById(prefix + '-account'),
  };
}

function clearInputs(...els) {
  els.forEach(el => { if (el) el.value = ''; });
}

/* ── Event Bindings ────────────────────────────────────────────────────────── */
function bindEvents() {
  // Add Money
  document.getElementById('btn-add')?.addEventListener('click', () => {
    const { amount, desc, account } = getInputs('add');
    const val = parseFloat(amount?.value);
    if (!val || val <= 0) { amount?.focus(); return; }
    Store.finances.addTransaction('in', val, desc?.value.trim() || 'income', account?.value || 'gcash');
    clearInputs(amount, desc);
    renderAll();
  });

  // Spend Money
  document.getElementById('btn-spend')?.addEventListener('click', () => {
    const { amount, desc, account } = getInputs('spend');
    const val = parseFloat(amount?.value);
    if (!val || val <= 0) { amount?.focus(); return; }
    Store.finances.addTransaction('out', val, desc?.value.trim() || 'expense', account?.value || 'gcash');
    clearInputs(amount, desc);
    renderAll();
  });

  // Enter key for add/spend amount fields
  ['add-amount', 'add-desc'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-add')?.click();
    });
  });
  ['spend-amount', 'spend-desc'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-spend')?.click();
    });
  });

  // Add Recurring
  document.getElementById('btn-add-recurring')?.addEventListener('click', () => {
    const name = document.getElementById('rec-name');
    const amount = document.getElementById('rec-amount');
    const freq = document.getElementById('rec-freq');
    const account = document.getElementById('rec-account');

    const nameVal = name?.value.trim();
    const amtVal = parseFloat(amount?.value);

    if (!nameVal) { name?.focus(); return; }
    if (!amtVal || amtVal <= 0) { amount?.focus(); return; }

    Store.recurring.add(nameVal, amtVal, freq?.value || 'monthly', account?.value || 'gcash');
    clearInputs(name, amount);
    renderAll();
  });

  document.getElementById('rec-name')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-add-recurring')?.click();
  });

  // Listen for store updates from other sources (assistant, etc.)
  window.addEventListener('nocual:update', () => renderAll());
}

/* ── Sidebar date ──────────────────────────────────────────────────────────── */
function initSidebarDate() {
  const el = document.getElementById('sidebar-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ── Init ──────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSidebarDate();
  bindEvents();
  renderAll();
});
