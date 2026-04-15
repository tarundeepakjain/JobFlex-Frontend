// JobFlex Popup Script

const STATUS_COLORS = {
  Applied:     '#6366f1',
  Shortlisted: '#22d3ee',
  Interview:   '#f59e0b',
  Offer:       '#10b981',
  Hired:       '#10b981',
  Rejected:    '#ef4444',
};

// ─── State ───
let currentTab = 'detect';
let currentPageData = null;
let selectedStatus = 'Applied';
let editingAppId = null;
let editSelectedStatus = 'Applied';
let allApplications = [];
let isManualMode = false;

document.getElementById('btn-google').addEventListener('click', async () => {
  const redirectUri = chrome.identity.getRedirectURL();

  const authUrl = `http://localhost:8000/user/auth/google/start/?redirect_uri=${encodeURIComponent(redirectUri)}`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    async (redirectedTo) => {
      if (chrome.runtime.lastError || !redirectedTo) {
        console.error(chrome.runtime.lastError);
        alert("Google login failed ❌");
        return;
      }

      console.log("Redirect URL:", redirectedTo);

      const url = new URL(redirectedTo);
      const token = url.searchParams.get("token");

      if (!token) {
        alert("No token received ❌");
        return;
      }

      console.log("✅ Token:", token);

      // store token
      await chrome.storage.local.set({ token });

      // OPTIONAL: fetch user from backend
      const res = await fetch("http://localhost:8000/user/me/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const user = await res.json();

      showMain(user);
    }
  );
});
// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupEventListeners();
});

async function checkAuth() {
  const user = await sendMessage({ type: 'GET_USER' });
  if (user) {
    showMain(user);
  } else {
    showAuth();
  }
}

function showAuth() {
  document.getElementById('screen-auth').classList.remove('hidden');
  document.getElementById('screen-main').classList.add('hidden');
}

function showMain(user) {
  document.getElementById('screen-auth').classList.add('hidden');
  document.getElementById('screen-main').classList.remove('hidden');

  // Run page detection
  detectCurrentPage();
  loadApplications();
  loadStats();
  loadSettings();
}

// ─── Auth ───
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('auth-error');
  const btn = document.getElementById('btn-login');
  const spinner = btn.querySelector('.btn-spinner');
  const text = btn.querySelector('.btn-text');

  if (!email || !password) {
    showError(errorEl, 'Please fill in all fields');
    return;
  }

  text.classList.add('hidden');
  spinner.classList.remove('hidden');
  btn.disabled = true;
  errorEl.classList.add('hidden');

  const result = await sendMessage({ type: 'LOGIN', credentials: { email, password } });

  text.classList.remove('hidden');
  spinner.classList.add('hidden');
  btn.disabled = false;

  if (result?.success) {
    showMain(result.user);
  } else {
    showError(errorEl, result?.error || 'Login failed');
  }
});

document.getElementById('btn-guest').addEventListener('click', () => {
  showMain({ guest: true, name: 'Guest' });
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await sendMessage({ type: 'LOGOUT' });
  showAuth();
});

// ─── Page Detection ───
async function detectCurrentPage() {
  const detectIcon = document.getElementById('detect-icon');
  const detectLabel = document.getElementById('detect-label');
  const jobCard = document.getElementById('job-card');
  const saveBtn = document.getElementById('btn-save');

  // Scanning state
  detectIcon.className = 'detect-icon scanning';
  detectLabel.textContent = 'Scanning page...';
  jobCard.classList.add('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setNotJobPage(detectIcon, detectLabel);
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DATA' });

    if (response?.isJobPage && response.data) {
      currentPageData = response.data;
      setJobFound(detectIcon, detectLabel, response.data);
    } else {
      setNotJobPage(detectIcon, detectLabel);
    }
  } catch (e) {
    setNotJobPage(detectIcon, detectLabel);
  }
}

function setJobFound(icon, label, data) {
  icon.className = 'detect-icon found';
  icon.querySelector('.detect-emoji').textContent = '✅';
  label.textContent = 'Job page detected!';
  label.style.color = 'var(--success)';

  document.getElementById('job-title').textContent = data.jobrole || 'Unknown Role';
  document.getElementById('job-company').textContent = data.company || 'Unknown Company';
  document.getElementById('job-location').textContent = data.location || 'Location N/A';
  document.getElementById('job-platform').textContent = data.platform || 'Web';

  const salaryEl = document.getElementById('job-salary');
  if (data.salary) {
    salaryEl.textContent = '💰 ' + data.salary;
    salaryEl.classList.remove('hidden');
  } else {
    salaryEl.classList.add('hidden');
  }

  const formBadge = document.getElementById('job-form-indicator');
  if (data.hasApplicationForm) formBadge.classList.remove('hidden');

  document.getElementById('job-card').classList.remove('hidden');
}

function setNotJobPage(icon, label) {
  icon.className = 'detect-icon not-found';
  icon.querySelector('.detect-emoji').textContent = '🔎';
  label.textContent = 'No job listing detected';
  label.style.color = 'var(--text-muted)';
  document.getElementById('job-card').classList.add('hidden');
}

// ─── Save Application ───
document.getElementById('btn-save').addEventListener('click', async () => {
  let appData;

  if (isManualMode) {
    const title = document.getElementById('m-title').value.trim();
    const company = document.getElementById('m-company').value.trim();
    if (!title || !company) {
      alert('Job title and company are required');
      return;
    }
    appData = {
      jobTitle: title,
      company,
      location: document.getElementById('m-location').value.trim(),
      url: document.getElementById('m-url').value.trim(),
      platform: 'Manual',
      appliedDate: new Date().toISOString().split('T')[0],
    };
  } else {
    if (!currentPageData) {
      alert('No job data available. Use manual entry.');
      return;
    }
    appData = { ...currentPageData };
  }

  appData.status = selectedStatus;
  appData.notes = document.getElementById('detect-notes').value.trim();

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.innerHTML = '<div class="btn-spinner"></div>';

  const result = await sendMessage({ type: 'SAVE_APPLICATION', data: appData });

  btn.disabled = false;
  btn.innerHTML = '<span>💾</span> Save Application';

  if (result?.success) {
    document.getElementById('save-success').classList.remove('hidden');
    document.getElementById('detect-notes').value = '';
    setTimeout(() => document.getElementById('save-success').classList.add('hidden'), 2500);

    allApplications.unshift(result.application);
    loadStats();
  }
});

// ─── Manual Toggle ───
document.getElementById('btn-manual-toggle').addEventListener('click', () => {
  isManualMode = !isManualMode;
  const form = document.getElementById('manual-form');
  const btn = document.getElementById('btn-manual-toggle');

  if (isManualMode) {
    form.classList.remove('hidden');
    btn.textContent = '← Back to detected';
    // Pre-fill with detected data if any
    if (currentPageData) {
      document.getElementById('m-title').value = currentPageData.jobTitle || '';
      document.getElementById('m-company').value = currentPageData.company || '';
      document.getElementById('m-location').value = currentPageData.location || '';
      document.getElementById('m-url').value = currentPageData.url || '';
    }
  } else {
    form.classList.add('hidden');
    btn.textContent = '✏️ Enter manually';
  }
});

// ─── Status Chips (Detect Tab) ───
document.getElementById('status-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#status-chips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  selectedStatus = chip.dataset.status;
});

// ─── Tab Navigation ───
function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Settings
  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('panel-settings').classList.remove('hidden');
  });
  document.getElementById('btn-close-settings').addEventListener('click', () => {
    document.getElementById('panel-settings').classList.add('hidden');
  });

  // Search & filter
  document.getElementById('search-input').addEventListener('input', filterApplications);
  document.getElementById('filter-status').addEventListener('change', filterApplications);

  // Modal
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('modal-edit').querySelector('.modal-backdrop').addEventListener('click', closeModal);

  // Edit status chips
  document.getElementById('edit-status-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#edit-status-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    editSelectedStatus = chip.dataset.status;
  });

  document.getElementById('btn-save-edit').addEventListener('click', saveEdit);
  document.getElementById('btn-delete-app').addEventListener('click', deleteApp);

  // Settings save
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-clear-data').addEventListener('click', clearData);
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('hidden', c.id !== `tab-${tab}`));

  if (tab === 'detect') detectCurrentPage();
  if (tab === 'applications') loadApplications();
  if (tab === 'analytics') loadStats();
}

// ─── Applications ───
async function loadApplications(filters = {}) {
  const search = document.getElementById('search-input')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';

  allApplications = await sendMessage({ type: 'GET_APPLICATIONS', filters: { search, status } });
  renderApplications(allApplications);
}

function filterApplications() {
  loadApplications();
}

function renderApplications(apps) {
  const list = document.getElementById('apps-list');

  if (!apps || apps.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No applications yet.<br/>Start browsing job listings!</div>
      </div>`;
    return;
  }

  list.innerHTML = apps.map(app => `
    <div class="app-item" data-id="${app.id || app.APP_ID}">
      <div class="app-item-header">
        <div class="app-item-title">${escHtml(app.jobrole || 'Unknown Role')}</div>
        <div class="app-item-status status-${app.status}">${app.status}</div>
      </div>
      <div class="app-item-meta">
        <span>${escHtml(app.company || '—')}</span>
        ${app.location ? `<span>·</span><span>${escHtml(app.location)}</span>` : ''}
      </div>
      <div class="app-item-date">${formatDate(app.createdAt || app.changed_at)}</div>
    </div>
  `).join('');

  list.querySelectorAll('.app-item').forEach(item => {
    item.addEventListener('click', () => openEditModal(item.dataset.id));
  });
}

// ─── Edit Modal ───
function openEditModal(id) {
  const app = allApplications.find(a => (a.id === id || String(a.APP_ID) === String(id)));
  if (!app) return;

  editingAppId = id;
  editSelectedStatus = app.status;

  document.getElementById('e-title').value = app.jobrole || '';
  document.getElementById('e-company').value = app.company || '';
  document.getElementById('e-location').value = app.location || '';
  document.getElementById('e-notes').value = app.notes || '';

  document.querySelectorAll('#edit-status-chips .chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.status === app.status);
  });

  document.getElementById('modal-edit').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-edit').classList.add('hidden');
  editingAppId = null;
}

async function saveEdit() {
  if (!editingAppId) return;
  const data = {
    jobrole: document.getElementById('e-title').value.trim(),
    company: document.getElementById('e-company').value.trim(),
    location: document.getElementById('e-location').value.trim(),
    notes: document.getElementById('e-notes').value.trim(),
    status: editSelectedStatus,
  };

  const result = await sendMessage({ type: 'UPDATE_APPLICATION', id: editingAppId, data });
  if (result?.success) {
    closeModal();
    loadApplications();
    loadStats();
  }
}

async function deleteApp() {
  if (!editingAppId) return;
  if (!confirm('Delete this application?')) return;

  const result = await sendMessage({ type: 'DELETE_APPLICATION', id: editingAppId });
  if (result?.success) {
    closeModal();
    loadApplications();
    loadStats();
  }
}

// ─── Analytics ───
async function loadStats() {
  const stats = await sendMessage({ type: 'GET_STATS' });
  if (!stats) return;

  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-response').textContent = stats.responseRate + '%';
  document.getElementById('stat-recent').textContent = stats.recentCount;
  document.getElementById('stat-avg-days').textContent = stats.avgResponseDays !== null ? stats.avgResponseDays + 'd' : '—';

  // Status bars
  const statusBarsEl = document.getElementById('status-bars');
  const total = stats.total || 1;
  const statuses = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired', 'Rejected'];
  statusBarsEl.innerHTML = statuses
    .filter(s => (stats.byStatus[s] || 0) > 0)
    .map(s => {
      const count = stats.byStatus[s] || 0;
      const pct = Math.round((count / total) * 100);
      return `
        <div class="status-bar-row">
          <div class="status-bar-label">${s}</div>
          <div class="status-bar-track">
            <div class="status-bar-fill" style="width:${pct}%; background:${STATUS_COLORS[s]};"></div>
          </div>
          <div class="status-bar-count">${count}</div>
        </div>`;
    }).join('') || '<div style="color:var(--text-dim);font-size:12px">No data yet</div>';

  // Top companies
  const topEl = document.getElementById('top-companies');
  if (stats.topCompanies?.length) {
    topEl.innerHTML = stats.topCompanies.map(c => `
      <div class="company-row">
        <span class="company-name">${escHtml(c.name)}</span>
        <span class="company-count">${c.count}</span>
      </div>`).join('');
  } else {
    topEl.innerHTML = '<div style="color:var(--text-dim);font-size:12px">No data yet</div>';
  }
}

// ─── Settings ───
async function loadSettings() {
  const settings = await sendMessage({ type: 'GET_SETTINGS' });
  if (!settings) return;

  document.getElementById('s-autodetect').checked = settings.autoDetect !== false;
  document.getElementById('s-notifications').checked = settings.showNotifications !== false;
  document.getElementById('s-sync').checked = !!settings.syncWithBackend;
  document.getElementById('s-api-url').value = settings.apiUrl || '';
}

async function saveSettings() {
  const settings = {
    autoDetect: document.getElementById('s-autodetect').checked,
    showNotifications: document.getElementById('s-notifications').checked,
    syncWithBackend: document.getElementById('s-sync').checked,
    apiUrl: document.getElementById('s-api-url').value.trim(),
  };
  await sendMessage({ type: 'UPDATE_SETTINGS', settings });
  document.getElementById('panel-settings').classList.add('hidden');
}

async function exportData() {
  const apps = await sendMessage({ type: 'GET_APPLICATIONS', filters: {} });
  const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jobflex_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function clearData() {
  if (!confirm('This will delete ALL saved applications. Are you sure?')) return;
  await new Promise(r => chrome.storage.local.set({ applications: [] }, r));
  allApplications = [];
  renderApplications([]);
  loadStats();
}

// ─── Utilities ───
function sendMessage(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(response);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}
