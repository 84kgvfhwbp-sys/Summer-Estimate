import {
  CREW_RATES,
  calculateEstimate,
  defaultEstimate,
  formatMoney,
  formatNumber,
  sectionSummaries,
} from './calculations.js';
import { localStore, makeId } from './store.js';
import { cloud } from './cloud.js';

const RATE_KEYS = [
  'fertSpringRate', 'fertSummerRate', 'fertFallRate',
  'limeSpringRate', 'limeSummerRate', 'limeFallRate',
  'fertLabourRate', 'springCleanupRate', 'fallCleanupRate',
  'mulchRate', 'springAerationRate', 'fallAerationRate',
  'litterRate', 'clippingsFee', 'springDisposalFee', 'fallDisposalFee',
  'springAerationDeliveryFee', 'fallAerationDeliveryFee', 'litterDisposalFee',
];

const app = document.getElementById('app');
const toast = document.getElementById('toast');
let toastTimer = null;

const state = {
  route: 'home',
  activeSection: null,
  savedSearch: '',
  current: restoreDraft(),
  lastSavedSnapshot: '',
  authReady: false,
  session: null,
  localMode: localStore.getLocalMode(),
  cloudEnabled: false,
  cloudError: '',
  savedItems: localStore.listCloudCache(),
  company: null,
  memberRole: null,
  syncStatus: 'checking',
};

function restoreDraft() {
  const draft = localStore.getDraft();
  if (draft && typeof draft === 'object') return defaultEstimate(draft);
  return newEstimateFromPreferences();
}

function newEstimateFromPreferences() {
  const prefs = localStore.getPreferences();
  return defaultEstimate({
    ...prefs,
    crewType: 'two',
    crewRate: Number(prefs.twoPersonRate ?? CREW_RATES.two),
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeText(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[char]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function icon(name) {
  const icons = {
    home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h2m4 0h2"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    cloud: '<path d="M17.5 19H6a4 4 0 0 1-.5-7.97A6 6 0 0 1 17 8.5h.5a5.25 5.25 0 0 1 0 10.5Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 16H6L5 6m4 4v8m6-8v8"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
}

function currentTitle() {
  if (state.route === 'section') {
    return sectionSummaries(state.current).find((item) => item.id === state.activeSection)?.title || 'Estimate';
  }
  if (state.route === 'project') return 'Project Information';
  if (state.route === 'estimate') return 'Summer Estimate';
  if (state.route === 'saved') return 'Saved Estimates';
  if (state.route === 'settings') return 'Settings';
  return 'Summer Estimate';
}

function headerSubtitle() {
  if (['estimate', 'section', 'project'].includes(state.route)) {
    return state.current.estimateNumber || 'Current estimate';
  }
  return state.route === 'home' ? 'Quote smarter' : '';
}

function renderLoading() {
  return `<main class="auth-page"><section class="auth-card loading-card">
    <img src="./assets/southeastern-logo.png" alt="" class="auth-logo" />
    <div class="loading-spinner" aria-hidden="true"></div>
    <h1>Summer Estimate</h1><p>Checking your secure workspace…</p>
  </section></main>`;
}

function renderAuth() {
  return `<main class="auth-page">
    <section class="auth-card">
      <img src="./assets/southeastern-logo.png" alt="" class="auth-logo" />
      <div class="auth-heading"><span class="auth-eyebrow">R2R Property Care</span><h1>Summer Estimate</h1><p>Sign in to access the same estimates from your computer and phone.</p></div>
      <form id="sign-in-form" class="auth-form">
        <div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></div>
        <div class="field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="10" required placeholder="Your password" /></div>
        <button class="primary-btn full-btn" type="submit">Sign In</button>
      </form>
      <button class="text-btn auth-link" data-action="magic-link">Email me a sign-in link</button>
      <div class="auth-divider"><span>or</span></div>
      <button class="secondary-btn full-btn" data-action="continue-local">Continue in Local Mode</button>
      <p class="auth-note">Local mode keeps estimates only on this device. Cloud mode shares them securely across devices.</p>
      ${state.cloudError ? `<div class="auth-error">${safeText(state.cloudError)}</div>` : ''}
    </section>
  </main>`;
}

function render() {
  if (!state.authReady) {
    app.innerHTML = renderLoading();
    return;
  }
  if (!state.session && !state.localMode) {
    app.innerHTML = renderAuth();
    return;
  }

  const showBack = ['section', 'project'].includes(state.route);
  const canSave = ['estimate', 'section', 'project'].includes(state.route);
  app.innerHTML = `
    ${renderDesktopSidebar()}
    <div class="app-content">
      <header class="mobile-header">
        <button class="icon-btn" data-action="${showBack ? 'back-to-estimate' : 'new-estimate'}" aria-label="${showBack ? 'Back to estimate' : 'New estimate'}">
          ${icon(showBack ? 'back' : 'plus')}
        </button>
        <div class="header-title">
          <strong>${safeText(currentTitle())}</strong>
          <small>${safeText(headerSubtitle())}</small>
        </div>
        <button class="icon-btn" data-action="${canSave ? 'save' : 'go-saved'}" aria-label="${canSave ? 'Save estimate' : 'Saved estimates'}">
          ${icon(canSave ? 'save' : 'folder')}
        </button>
      </header>
      <main class="app-main ${state.route === 'estimate' ? 'wide' : ''}">
        ${renderRoute()}
      </main>
      ${renderBottomNav()}
      ${['estimate', 'section', 'project'].includes(state.route) ? renderStickyTotal() : ''}
    </div>
  `;
  refreshVisibleTotals();
}

function renderDesktopSidebar() {
  const routes = [
    ['home', 'home', 'Home'],
    ['estimate', 'calculator', 'Current Estimate'],
    ['saved', 'folder', 'Saved Estimates'],
    ['settings', 'settings', 'Settings'],
  ];
  return `
    <aside class="desktop-sidebar">
      <div class="desktop-brand">
        <img src="./assets/southeastern-logo.png" alt="" />
        <div><strong>Summer Estimate</strong><small>Plug-and-play quoting</small></div>
      </div>
      <nav class="desktop-nav">
        ${routes.map(([route, iconName, label]) => `
          <button class="${state.route === route || (route === 'estimate' && ['section', 'project'].includes(state.route)) ? 'active' : ''}" data-route="${route}">
            ${icon(iconName)} <span>${label}</span>
          </button>`).join('')}
      </nav>
      <div class="desktop-sync ${state.cloudEnabled ? 'connected' : ''}">
        <strong>${state.cloudEnabled ? 'Cloud connected' : 'Local mode'}</strong>
        ${state.cloudEnabled ? `Signed in as ${safeText(state.session?.user?.email || '')}. Estimates sync across your devices.` : 'Estimates are stored only on this device.'}
      </div>
    </aside>`;
}

function renderBottomNav() {
  const items = [
    ['home', 'home', 'Home'],
    ['estimate', 'calculator', 'Estimate'],
    ['saved', 'folder', 'Saved'],
    ['settings', 'settings', 'Settings'],
  ];
  return `<nav class="bottom-nav" aria-label="Main navigation">
    ${items.map(([route, iconName, label]) => {
      const active = state.route === route || (route === 'estimate' && ['section', 'project'].includes(state.route));
      return `<button class="nav-btn ${active ? 'active' : ''}" data-route="${route}">${icon(iconName)}<span>${label}</span></button>`;
    }).join('')}
  </nav>`;
}

function renderRoute() {
  if (state.route === 'home') return renderHome();
  if (state.route === 'saved') return renderSaved();
  if (state.route === 'settings') return renderSettings();
  if (state.route === 'project') return renderProjectForm();
  if (state.route === 'section') return renderSection();
  return renderEstimateOverview();
}

function savedEstimates() {
  const source = state.cloudEnabled ? state.savedItems : localStore.listEstimates();
  return source.slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function renderHome() {
  const items = savedEstimates();
  const savedTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  return `
    <section class="page-title"><h1>Summer Estimate</h1><p>Build a quote without working through the math yourself.</p></section>
    <section class="hero-card">
      <div class="hero-eyebrow">Saved estimate value</div>
      <div class="hero-total">${formatMoney(savedTotal)}</div>
      <div class="hero-sub">${items.length} saved estimate${items.length === 1 ? '' : 's'} ${state.cloudEnabled ? 'in your shared workspace' : 'on this device'}</div>
    </section>
    <button class="primary-btn full-btn" data-action="new-estimate">${icon('plus')} New Estimate</button>
    ${hasDraftData() ? `<button class="secondary-btn full-btn" style="margin-top:10px" data-route="estimate">Continue Current Estimate · ${formatMoney(calculateEstimate(state.current).grandTotal)}</button>` : ''}
    <div class="section-heading"><h2>Recent Estimates</h2><button class="text-btn" data-route="saved">View all</button></div>
    ${items.length ? `<div class="estimate-list">${items.slice(0, 5).map(renderEstimateCard).join('')}</div>` : renderEmpty('No saved estimates yet', 'Create your first estimate and it will appear here.')}
  `;
}

function renderEstimateCard(item) {
  const date = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  return `<article class="estimate-card" data-id="${safeText(item.id)}">
    <div class="file-icon">${icon('file')}</div>
    <div>
      <h3>${safeText(item.estimateName || item.siteAddress || 'Untitled Estimate')}</h3>
      <p>${safeText(item.siteAddress || item.season || 'No address')}</p>
    </div>
    <div class="estimate-amount"><strong>${formatMoney(item.total)}</strong><small>${safeText(date)}</small></div>
    <div class="estimate-actions no-print">
      <button class="mini-btn" data-action="open-estimate" data-id="${safeText(item.id)}">Open</button>
      <button class="mini-btn" data-action="duplicate-saved" data-id="${safeText(item.id)}">Duplicate</button>
      ${!state.cloudEnabled || ['owner', 'admin'].includes(state.memberRole) ? `<button class="mini-btn delete" data-action="delete-saved" data-id="${safeText(item.id)}">Delete</button>` : ''}
    </div>
  </article>`;
}

function renderEstimateOverview() {
  const totals = calculateEstimate(state.current);
  const sections = sectionSummaries(state.current);
  return `
    <div class="desktop-editor-grid">
      <div>
        <section class="project-card card">
          <div class="project-card-top"><h2>Project Information</h2><button class="text-btn" data-action="edit-project">${icon('edit')} Edit</button></div>
          <p class="project-name">${safeText(state.current.estimateName || 'New Estimate')}</p>
          <p class="project-address">${safeText(state.current.siteAddress || 'Add the property address')}</p>
          <div class="meta-grid">
            <div><span class="meta-label">Square Footage</span><span class="meta-value" data-square-footage>${formatNumber(state.current.squareFootage)}</span></div>
            <div><span class="meta-label">Season</span><span class="meta-value">${safeText(state.current.season || 'Not set')}</span></div>
            <div><span class="meta-label">Prepared By</span><span class="meta-value">${safeText(state.current.preparedBy || 'Not set')}</span></div>
            <div><span class="meta-label">Estimate #</span><span class="meta-value">${safeText(state.current.estimateNumber || 'Assigned on save')}</span></div>
          </div>
        </section>

        <div class="section-heading"><h2>Quote Sections</h2><small>Tap a section to enter numbers</small></div>
        <section class="service-list">
          ${sections.map((section) => `
            <button class="service-row" data-action="open-section" data-section="${section.id}">
              <span class="service-number">${section.number}</span>
              <span class="service-copy"><strong>${section.title}</strong><small>${section.description}</small></span>
              <span class="service-money"><strong data-total="${section.id}">${formatMoney(section.total)}</strong><small>${section.enabledCount ? `${section.enabledCount} selected` : 'Not added'}</small></span>
              <span class="chevron">${icon('chevron')}</span>
            </button>`).join('')}
        </section>

        <div class="button-row stack-small no-print" style="margin-top:16px">
          <button class="secondary-btn" data-action="print">${icon('print')} Print</button>
          <button class="secondary-btn" data-action="duplicate-current">${icon('copy')} Duplicate</button>
          <button class="primary-btn" data-action="save">${icon('save')} Save Estimate</button>
        </div>
      </div>

      <aside class="desktop-summary">
        <section class="card card-pad">
          <div class="section-heading" style="margin:0 0 12px"><h2>Estimate Summary</h2></div>
          ${sections.map((section) => `<div class="summary-line"><span>${section.title}</span><strong data-total="${section.id}">${formatMoney(section.total)}</strong></div>`).join('')}
          <div class="summary-line total"><span>Total Contract Value</span><strong data-total="grand">${formatMoney(totals.grandTotal)}</strong></div>
        </section>
        <div class="notice">The formulas are the same as the original calculator. Only the layout has changed for easier phone use.</div>
      </aside>
    </div>`;
}

function renderProjectForm() {
  return `
    <section class="page-title"><h1>Project Information</h1><p>These details identify the saved estimate.</p></section>
    <section class="card form-card">
      ${textField('estimateName', 'Estimate Name', 'Example: Pine Glen Summer 2027')}
      ${textField('siteAddress', 'Site Address', 'Enter the property address')}
      ${numberField('squareFootage', 'Total Square Footage', '0', 1)}
      <div class="field-grid two">
        ${textField('season', 'Contract Season', 'Summer 2027')}
        ${textField('preparedBy', 'Prepared By', 'Name')}
      </div>
    </section>
    <button class="primary-btn full-btn" data-action="back-to-estimate">Done</button>`;
}

function renderSection() {
  const sections = {
    lawn: renderLawnSection,
    fertilizer: renderFertilizerSection,
    cleanup: renderCleanupSection,
    maintenance: renderMaintenanceSection,
    litter: renderLitterSection,
  };
  const renderer = sections[state.activeSection] || renderLawnSection;
  return renderer();
}

function renderLawnSection() {
  const t = calculateEstimate(state.current);
  return `
    <section class="section-total-card"><span>Section Total</span><strong data-total="lawn">${formatMoney(t.lawnTotal)}</strong></section>
    <section class="card form-card">
      <div class="form-card-title"><div><h2>Crew Type</h2><p>Selecting a crew automatically changes the hourly rate.</p></div></div>
      <div class="segmented">
        <button class="${state.current.crewType === 'one' ? 'active' : ''}" data-action="set-crew" data-value="one">1 Person</button>
        <button class="${state.current.crewType === 'two' ? 'active' : ''}" data-action="set-crew" data-value="two">2 Person</button>
      </div>
      <div style="margin-top:14px">${numberField('crewRate', 'Hourly Crew Rate', '0.00', 0.01, 'decimal', '$')}</div>
    </section>
    ${renderWorkSubservice({ title: 'Weekly Mowing', enabled: 'weeklyEnabled', time: 'weeklyTime', visits: 'weeklyVisits', charge: 'weekly', defaultVisits: 22 })}
    ${renderWorkSubservice({ title: 'Bi-Weekly Gardens', enabled: 'gardensEnabled', time: 'gardensTime', visits: 'gardensVisits', charge: 'gardens', defaultVisits: 10 })}
    <section class="card form-card">
      ${toggleRow('clippingsEnabled', 'Clipping Disposal', 'Add a one-time disposal allowance')}
      ${state.current.clippingsEnabled ? `<div style="margin-top:14px">${numberField('clippingsFee', 'Disposal Charge', '0.00', 0.01, 'decimal', '$')}</div>` : ''}
      <div class="inline-summary"><div class="summary-line total"><span>Disposal</span><strong data-output="clippings">${formatMoney(t.clippingsCharge)}</strong></div></div>
    </section>`;
}

function renderWorkSubservice({ title, enabled, time, visits, charge }) {
  const t = calculateEstimate(state.current);
  const chargeValue = charge === 'weekly' ? t.weeklyCharge : t.gardensCharge;
  const hoursValue = charge === 'weekly' ? t.weeklyHours : t.gardensHours;
  return `<section class="card form-card">
    ${toggleRow(enabled, title, 'Enable this service for the estimate')}
    ${state.current[enabled] ? `
      <div class="field-grid two" style="margin-top:14px">
        ${numberField(time, 'Time Per Visit (hours)', '0.00', 0.01)}
        ${numberField(visits, 'Total Visits', '0', 1, 'numeric')}
      </div>
      <div class="inline-summary">
        <div class="summary-line"><span>Total hours</span><strong data-output="${charge}-hours">${formatNumber(hoursValue, 2)}</strong></div>
        <div class="summary-line"><span>Crew rate</span><strong data-output="crew-rate">${formatMoney(state.current.crewRate)}</strong></div>
        <div class="summary-line total"><span>Charge</span><strong data-output="${charge}">${formatMoney(chargeValue)}</strong></div>
      </div>` : ''}
  </section>`;
}

function renderFertilizerSection() {
  const t = calculateEstimate(state.current);
  return `
    <section class="section-total-card"><span>Section Total</span><strong data-total="fertilizer">${formatMoney(t.fertTotal)}</strong></section>
    <section class="card form-card">
      <div class="form-card-title"><div><h2>Fertilizer Applications</h2><p>Uses the ${formatNumber(state.current.squareFootage)} sq. ft. entered for the property.</p></div></div>
      <div class="application-list">
        ${applicationRow('fertSpringEnabled', 'Spring', 'fertSpringRate', 'fert-spring')}
        ${applicationRow('fertSummerEnabled', 'Summer', 'fertSummerRate', 'fert-summer')}
        ${applicationRow('fertFallEnabled', 'Fall', 'fertFallRate', 'fert-fall')}
      </div>
    </section>
    <section class="card form-card">
      <div class="form-card-title"><div><h2>Lime Applications</h2><p>Turn on only the seasons included in the quote.</p></div></div>
      <div class="application-list">
        ${applicationRow('limeSpringEnabled', 'Spring', 'limeSpringRate', 'lime-spring')}
        ${applicationRow('limeSummerEnabled', 'Summer', 'limeSummerRate', 'lime-summer')}
        ${applicationRow('limeFallEnabled', 'Fall', 'limeFallRate', 'lime-fall')}
      </div>
    </section>
    <section class="card form-card">
      <div class="form-card-title"><div><h2>Application Labour</h2><p>The number of selected applications is counted automatically.</p></div></div>
      <div class="field-grid two">
        ${numberField('fertLabourTime', 'Time Per Application', '0.00', 0.01)}
        ${numberField('fertLabourRate', 'Hourly Rate', '0.00', 0.01, 'decimal', '$')}
      </div>
      <div class="inline-summary">
        <div class="summary-line"><span>Selected applications</span><strong data-output="application-count">${t.applicationCount}</strong></div>
        <div class="summary-line"><span>Materials</span><strong data-output="fert-materials">${formatMoney(t.fertilizerMaterialTotal)}</strong></div>
        <div class="summary-line total"><span>Labour charge</span><strong data-output="fert-labour">${formatMoney(t.fertLabourCharge)}</strong></div>
      </div>
    </section>`;
}

function applicationRow(enabledKey, label, rateKey, outputKey) {
  const t = calculateEstimate(state.current);
  const map = {
    'fert-spring': 0, 'fert-summer': 1, 'fert-fall': 2,
    'lime-spring': 3, 'lime-summer': 4, 'lime-fall': 5,
  };
  const charge = t.applicationCharges[map[outputKey]]?.charge || 0;
  return `<div class="application-row">
    <div class="application-top">
      <div class="toggle-copy"><strong>${label}</strong><small>${formatNumber(state.current.squareFootage)} sq. ft.</small></div>
      ${switchControl(enabledKey)}
    </div>
    ${state.current[enabledKey] ? `<div class="application-bottom">
      ${numberField(rateKey, 'Rate / Sq. Ft.', '0.000', 0.001, 'decimal', '$')}
      <div class="field"><label>Charge</label><div class="output-box" data-output="${outputKey}">${formatMoney(charge)}</div></div>
    </div>` : ''}
  </div>`;
}

function renderCleanupSection() {
  const t = calculateEstimate(state.current);
  return `
    <section class="section-total-card"><span>Section Total</span><strong data-total="cleanup">${formatMoney(t.cleanupTotal)}</strong></section>
    ${cleanupCard('Spring Clean Up', 'springCleanupEnabled', 'springCleanupTime', 'springCleanupRate', 'springDisposalEnabled', 'springDisposalFee', 'spring-cleanup')}
    ${cleanupCard('Fall Clean Up', 'fallCleanupEnabled', 'fallCleanupTime', 'fallCleanupRate', 'fallDisposalEnabled', 'fallDisposalFee', 'fall-cleanup')}`;
}

function cleanupCard(title, enabled, time, rate, disposalEnabled, disposalFee, output) {
  const t = calculateEstimate(state.current);
  const charge = output === 'spring-cleanup' ? t.springCleanupCharge : t.fallCleanupCharge;
  return `<section class="card form-card">
    ${toggleRow(enabled, title, 'Include this seasonal cleanup')}
    ${state.current[enabled] ? `
      <div class="field-grid two" style="margin-top:14px">
        ${numberField(time, 'Time Allotted (hours)', '0.00', 0.01)}
        ${numberField(rate, 'Hourly Crew Rate', '0.00', 0.01, 'decimal', '$')}
      </div>
      <div class="subservice">
        ${toggleRow(disposalEnabled, 'Disposal Charge', 'Include the disposal allowance')}
        ${state.current[disposalEnabled] ? `<div style="margin-top:12px">${numberField(disposalFee, 'Disposal Fee', '0.00', 0.01, 'decimal', '$')}</div>` : ''}
      </div>
      <div class="inline-summary"><div class="summary-line total"><span>Cleanup charge</span><strong data-output="${output}">${formatMoney(charge)}</strong></div></div>` : ''}
  </section>`;
}

function renderMaintenanceSection() {
  const t = calculateEstimate(state.current);
  return `
    <section class="section-total-card"><span>Section Total</span><strong data-total="maintenance">${formatMoney(t.maintenanceTotal)}</strong></section>
    <section class="card form-card">
      ${toggleRow('mulchEnabled', 'Mulch', 'Calculate material cost by cubic yard')}
      ${state.current.mulchEnabled ? `<div class="field-grid two" style="margin-top:14px">
        ${numberField('mulchYards', 'Cubic Yards', '0.00', 0.01)}
        ${numberField('mulchRate', 'Rate Per Yard', '0.00', 0.01, 'decimal', '$')}
      </div><div class="inline-summary"><div class="summary-line total"><span>Mulch charge</span><strong data-output="mulch">${formatMoney(t.mulchCharge)}</strong></div></div>` : ''}
    </section>
    ${aerationCard('Spring Aeration', 'springAerationEnabled', 'springAerationRate', 'springAerationDeliveryEnabled', 'springAerationDeliveryFee', 'spring-aeration')}
    ${aerationCard('Fall Aeration', 'fallAerationEnabled', 'fallAerationRate', 'fallAerationDeliveryEnabled', 'fallAerationDeliveryFee', 'fall-aeration')}`;
}

function aerationCard(title, enabled, rate, deliveryEnabled, deliveryFee, output) {
  const t = calculateEstimate(state.current);
  const charge = output === 'spring-aeration' ? t.springAerationCharge : t.fallAerationCharge;
  return `<section class="card form-card">
    ${toggleRow(enabled, title, `Uses ${formatNumber(state.current.squareFootage)} sq. ft.`)}
    ${state.current[enabled] ? `
      <div style="margin-top:14px">${numberField(rate, 'Rate / Sq. Ft.', '0.000', 0.001, 'decimal', '$')}</div>
      <div class="subservice">
        ${toggleRow(deliveryEnabled, 'Delivery Fee', 'Add a delivery allowance')}
        ${state.current[deliveryEnabled] ? `<div style="margin-top:12px">${numberField(deliveryFee, 'Delivery Fee', '0.00', 0.01, 'decimal', '$')}</div>` : ''}
      </div>
      <div class="inline-summary"><div class="summary-line total"><span>Aeration charge</span><strong data-output="${output}">${formatMoney(charge)}</strong></div></div>` : ''}
  </section>`;
}

function renderLitterSection() {
  const t = calculateEstimate(state.current);
  return `
    <section class="section-total-card"><span>Section Total</span><strong data-total="litter">${formatMoney(t.litterCharge)}</strong></section>
    <section class="card form-card">
      ${toggleRow('litterEnabled', 'Litter Pickup', 'Calculate labour and disposal for each visit')}
      ${state.current.litterEnabled ? `
        <div class="field-grid two" style="margin-top:14px">
          ${numberField('litterTime', 'Time Per Visit (hours)', '0.00', 0.01)}
          ${numberField('litterVisits', 'Visits Per Year', '0', 1, 'numeric')}
          ${numberField('litterRate', 'Hourly Labour Rate', '0.00', 0.01, 'decimal', '$')}
          ${numberField('litterDisposalFee', 'Disposal Per Visit', '0.00', 0.01, 'decimal', '$')}
        </div>
        <div class="inline-summary"><div class="summary-line total"><span>Litter pickup charge</span><strong data-output="litter">${formatMoney(t.litterCharge)}</strong></div></div>` : ''}
    </section>`;
}

function renderSaved() {
  const items = filterSaved();
  return `
    <section class="page-title page-title-actions"><div><h1>Saved Estimates</h1><p>Open, duplicate or delete any completed calculator.</p></div>${state.cloudEnabled ? `<button class="secondary-btn compact-btn" data-action="refresh-cloud">Refresh</button>` : ''}</section>
    <div class="search-wrap">${icon('search')}<input type="search" data-search="saved" value="${safeText(state.savedSearch)}" placeholder="Search name or address" autocomplete="off" /></div>
    <div id="saved-list-container">${items.length ? `<div class="estimate-list">${items.map(renderEstimateCard).join('')}</div>` : renderEmpty(state.savedSearch ? 'No matches found' : 'No saved estimates', state.savedSearch ? 'Try another search.' : 'Save an estimate and it will appear here.')}</div>
  `;
}

function filterSaved() {
  const query = state.savedSearch.trim().toLowerCase();
  return savedEstimates().filter((item) => `${item.estimateName || ''} ${item.siteAddress || ''} ${item.estimateNumber || ''}`.toLowerCase().includes(query));
}

function renderSettings() {
  const prefs = localStore.getPreferences();
  const currentDefaults = defaultEstimate(prefs);
  const localCount = localStore.listEstimates().length;
  const cloudLabel = state.syncStatus === 'saving' ? 'Saving…' : state.syncStatus === 'offline' ? 'Offline draft protected' : 'Up to date';
  return `
    <section class="page-title"><h1>Settings</h1><p>Keep future estimates consistent and manage shared access.</p></section>
    <section class="card form-card">
      <div class="form-card-title"><div><h2>Default Crew Rates</h2><p>These rates are used when starting a new estimate.</p></div></div>
      <div class="field-grid two">
        ${settingsNumberField('onePersonRate', '1-Person Crew', prefs.onePersonRate ?? CREW_RATES.one)}
        ${settingsNumberField('twoPersonRate', '2-Person Crew', prefs.twoPersonRate ?? CREW_RATES.two)}
      </div>
      <button class="secondary-btn full-btn" data-action="use-current-rates" style="margin-top:14px">Use Current Estimate Rates as Defaults</button>
    </section>
    <section class="card form-card">
      <div class="form-card-title"><div><h2>Cloud Sync</h2><p>Website and installed app use the same secure workspace.</p></div></div>
      <div class="sync-card ${state.cloudEnabled ? 'connected' : ''}">
        <div class="sync-icon">${icon('cloud')}</div>
        <div><h3>${state.cloudEnabled ? 'Connected' : 'Local mode'}</h3><p>${state.cloudEnabled ? `${safeText(state.company?.name || 'R2R Property Care')} · ${safeText(state.session?.user?.email || '')}<br>${safeText(cloudLabel)}` : 'Estimates currently save only on this device.'}</p></div>
      </div>
      ${state.cloudEnabled ? `
        ${localCount ? `<button class="secondary-btn full-btn" data-action="import-local" style="margin-top:14px">Import ${localCount} Local Estimate${localCount === 1 ? '' : 's'} to Cloud</button>` : ''}
        <button class="danger-btn full-btn" data-action="sign-out" style="margin-top:10px">Sign Out</button>
      ` : `<button class="primary-btn full-btn" data-action="show-sign-in" style="margin-top:14px">Sign In for Shared Saving</button>`}
      ${state.cloudError ? `<div class="notice error" style="margin-top:13px">${safeText(state.cloudError)}</div>` : ''}
    </section>
    <section class="card form-card">
      <div class="form-card-title"><div><h2>App Tools</h2><p>Useful while testing the calculator.</p></div></div>
      <div class="button-row stack-small">
        <button class="secondary-btn" data-action="load-example">Load Example</button>
        <button class="danger-btn" data-action="clear-draft">Clear Current Draft</button>
      </div>
    </section>
    <div class="sr-only">${safeText(JSON.stringify(currentDefaults))}</div>`;
}

function settingsNumberField(key, label, value) {
  return `<div class="field"><label for="pref-${key}">${label}</label><input id="pref-${key}" data-preference="${key}" type="number" min="0" step="0.01" value="${safeText(value)}" inputmode="decimal" /></div>`;
}

function renderStickyTotal() {
  const total = calculateEstimate(state.current).grandTotal;
  return `<div class="sticky-total"><div><span>Total Contract Value</span><strong data-total="grand">${formatMoney(total)}</strong></div><button data-action="${state.route === 'estimate' ? 'save' : 'back-to-estimate'}">${state.route === 'estimate' ? 'Save' : 'Done'}</button></div>`;
}

function textField(key, label, placeholder) {
  return `<div class="field"><label for="field-${key}">${label}</label><input id="field-${key}" data-field="${key}" type="text" value="${safeText(state.current[key])}" placeholder="${safeText(placeholder)}" autocomplete="off" /></div>`;
}

function numberField(key, label, placeholder = '0', step = 0.01, inputmode = 'decimal', prefix = '') {
  return `<div class="field"><label for="field-${key}">${label}</label><div style="position:relative">${prefix ? `<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#6c786f;z-index:1">${prefix}</span>` : ''}<input id="field-${key}" data-field="${key}" type="number" min="0" step="${step}" inputmode="${inputmode}" value="${safeText(state.current[key])}" placeholder="${safeText(placeholder)}" style="${prefix ? 'padding-left:31px' : ''}" /></div></div>`;
}

function switchControl(key) {
  return `<label class="switch"><input data-field="${key}" type="checkbox" ${state.current[key] ? 'checked' : ''}/><span></span></label>`;
}

function toggleRow(key, title, subtitle) {
  return `<div class="toggle-row"><div class="toggle-copy"><strong>${title}</strong><small>${subtitle}</small></div>${switchControl(key)}</div>`;
}

function renderEmpty(title, message) {
  return `<div class="empty-state">${icon('file')}<h2>${safeText(title)}</h2><p>${safeText(message)}</p></div>`;
}

function hasDraftData() {
  const c = state.current;
  return Boolean(c.estimateName || c.siteAddress || c.squareFootage || calculateEstimate(c).grandTotal);
}

function updateFieldFromElement(element) {
  const key = element.dataset.field;
  if (!key) return;
  const value = element.type === 'checkbox' ? element.checked : element.value;
  state.current[key] = value;
  if (key === 'crewType') {
    state.current.crewRate = CREW_RATES[value] ?? state.current.crewRate;
  }
  state.current.updatedAt = new Date().toISOString();
  localStore.saveDraft(state.current);
}

function refreshVisibleTotals() {
  const t = calculateEstimate(state.current);
  const totalMap = {
    grand: t.grandTotal,
    lawn: t.lawnTotal,
    fertilizer: t.fertTotal,
    cleanup: t.cleanupTotal,
    maintenance: t.maintenanceTotal,
    litter: t.litterCharge,
  };
  document.querySelectorAll('[data-total]').forEach((el) => {
    const value = totalMap[el.dataset.total];
    if (value !== undefined) el.textContent = formatMoney(value);
  });

  const outputMap = {
    weekly: formatMoney(t.weeklyCharge),
    'weekly-hours': formatNumber(t.weeklyHours, 2),
    gardens: formatMoney(t.gardensCharge),
    'gardens-hours': formatNumber(t.gardensHours, 2),
    'crew-rate': formatMoney(t.crewRate),
    clippings: formatMoney(t.clippingsCharge),
    'fert-spring': formatMoney(t.applicationCharges[0]?.charge || 0),
    'fert-summer': formatMoney(t.applicationCharges[1]?.charge || 0),
    'fert-fall': formatMoney(t.applicationCharges[2]?.charge || 0),
    'lime-spring': formatMoney(t.applicationCharges[3]?.charge || 0),
    'lime-summer': formatMoney(t.applicationCharges[4]?.charge || 0),
    'lime-fall': formatMoney(t.applicationCharges[5]?.charge || 0),
    'application-count': String(t.applicationCount),
    'fert-materials': formatMoney(t.fertilizerMaterialTotal),
    'fert-labour': formatMoney(t.fertLabourCharge),
    'spring-cleanup': formatMoney(t.springCleanupCharge),
    'fall-cleanup': formatMoney(t.fallCleanupCharge),
    mulch: formatMoney(t.mulchCharge),
    'spring-aeration': formatMoney(t.springAerationCharge),
    'fall-aeration': formatMoney(t.fallAerationCharge),
    litter: formatMoney(t.litterCharge),
  };
  document.querySelectorAll('[data-output]').forEach((el) => {
    const value = outputMap[el.dataset.output];
    if (value !== undefined) el.textContent = value;
  });
}

function setRoute(route) {
  if (route === 'estimate' && !state.current) state.current = newEstimateFromPreferences();
  state.route = route;
  state.activeSection = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function openSection(section) {
  state.activeSection = section;
  state.route = 'section';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function startNewEstimate() {
  if (hasDraftData() && !confirm('Start a new estimate? The current draft will be replaced.')) return;
  state.current = newEstimateFromPreferences();
  state.lastSavedSnapshot = '';
  localStore.saveDraft(state.current);
  setRoute('project');
}

function generateEstimateNumber(items) {
  const year = new Date().getFullYear();
  const sequence = items.reduce((max, item) => {
    const match = String(item.estimateNumber || '').match(/(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
  return `EST-${year}-${String(sequence).padStart(4, '0')}`;
}

async function saveCurrent() {
  if (!state.current.estimateName.trim() && !state.current.siteAddress.trim()) {
    showToast('Add an estimate name or address before saving.');
    state.route = 'project';
    state.activeSection = null;
    render();
    return;
  }
  const items = savedEstimates();
  const now = new Date().toISOString();
  if (!state.current.id) {
    state.current.id = makeId();
    state.current.estimateNumber = generateEstimateNumber(items);
    state.current.createdAt = now;
  }
  state.current.updatedAt = now;
  const total = calculateEstimate(state.current).grandTotal;
  const item = { ...clone(state.current), total };
  localStore.saveDraft(state.current);

  if (state.cloudEnabled) {
    try {
      state.syncStatus = 'saving';
      showToast('Saving to cloud…');
      const saved = await cloud.saveEstimate(state.company.id, item, total);
      const existingIndex = state.savedItems.findIndex((entry) => entry.id === saved.id);
      if (existingIndex >= 0) state.savedItems[existingIndex] = saved;
      else state.savedItems.unshift(saved);
      state.current = defaultEstimate(saved);
      localStore.saveCloudCache(state.savedItems);
      localStore.saveDraft(state.current);
      state.syncStatus = 'saved';
      state.cloudError = '';
      state.lastSavedSnapshot = JSON.stringify(state.current);
      showToast(`Saved ${state.current.estimateName || state.current.siteAddress} to cloud.`);
      render();
      return;
    } catch (error) {
      state.syncStatus = 'offline';
      state.cloudError = error?.message || 'Cloud saving is temporarily unavailable.';
      showToast('Cloud save failed. Your draft is safe on this device.');
      render();
      return;
    }
  }

  const existingIndex = items.findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) items[existingIndex] = item;
  else items.unshift(item);
  localStore.saveEstimates(items);
  state.lastSavedSnapshot = JSON.stringify(state.current);
  showToast(`Saved ${state.current.estimateName || state.current.siteAddress} on this device.`);
  refreshVisibleTotals();
}

function openSaved(id) {
  const item = savedEstimates().find((entry) => entry.id === id);
  if (!item) return;
  state.current = defaultEstimate(item);
  localStore.saveDraft(state.current);
  state.lastSavedSnapshot = JSON.stringify(state.current);
  setRoute('estimate');
  showToast(`Opened ${item.estimateName || item.siteAddress}.`);
}

function duplicateEstimate(item = state.current) {
  const copy = defaultEstimate(clone(item));
  copy.id = null;
  copy.estimateNumber = '';
  copy.estimateName = `${copy.estimateName || copy.siteAddress || 'Estimate'} - Copy`;
  copy.createdAt = null;
  copy.updatedAt = new Date().toISOString();
  state.current = copy;
  state.lastSavedSnapshot = '';
  localStore.saveDraft(copy);
  setRoute('estimate');
  showToast('Duplicate created. Save it when ready.');
}

async function deleteSaved(id) {
  const items = savedEstimates();
  const item = items.find((entry) => entry.id === id);
  if (!item || !confirm(`Delete “${item.estimateName || item.siteAddress}”?`)) return;
  if (state.cloudEnabled) {
    try {
      await cloud.deleteEstimate(id);
      state.savedItems = state.savedItems.filter((entry) => entry.id !== id);
      localStore.saveCloudCache(state.savedItems);
    } catch (error) {
      state.cloudError = error?.message || 'Could not delete the estimate.';
      showToast('Cloud delete failed.');
      render();
      return;
    }
  } else {
    localStore.saveEstimates(items.filter((entry) => entry.id !== id));
  }
  if (state.current.id === id) {
    state.current = newEstimateFromPreferences();
    localStore.saveDraft(state.current);
  }
  render();
  showToast('Estimate deleted.');
}

function loadExample() {
  state.current = defaultEstimate({
    estimateName: 'Pine Glen Summer 2027',
    siteAddress: '123 Pine Glen Road, Moncton, NB',
    squareFootage: 87120,
    season: 'Summer 2027',
    preparedBy: 'Devlen Lowden',
    weeklyEnabled: true,
    weeklyTime: 1.25,
    weeklyVisits: 22,
    gardensEnabled: true,
    gardensTime: 0.5,
    gardensVisits: 10,
    clippingsEnabled: true,
    clippingsFee: 330,
    fertSpringEnabled: true,
    fertSummerEnabled: true,
    fertFallEnabled: true,
    limeFallEnabled: true,
    fertLabourTime: 0.5,
    springCleanupEnabled: true,
    springCleanupTime: 3,
    springCleanupRate: 120,
    springDisposalFee: 180,
    fallCleanupEnabled: true,
    fallCleanupTime: 3,
    fallCleanupRate: 120,
    fallDisposalFee: 180,
    mulchEnabled: true,
    mulchYards: 10,
    mulchRate: 146,
    springAerationEnabled: true,
    springAerationRate: 0.00822,
    springAerationDeliveryFee: 40,
    fallAerationEnabled: true,
    fallAerationRate: 0.00822,
    fallAerationDeliveryEnabled: false,
    litterEnabled: true,
    litterTime: 0,
    litterVisits: 12,
    litterRate: 75,
    litterDisposalFee: 26,
  });
  localStore.saveDraft(state.current);
  state.lastSavedSnapshot = '';
  setRoute('estimate');
  showToast('Example estimate loaded.');
}

async function savePreferenceField(element) {
  const prefs = localStore.getPreferences();
  prefs[element.dataset.preference] = Number(element.value || 0);
  localStore.savePreferences(prefs);
  if (state.cloudEnabled) {
    try {
      await cloud.saveRateSettings(state.company.id, prefs);
      showToast('Shared default rate saved.');
      return;
    } catch (error) {
      state.cloudError = error?.message || 'Could not update shared rates.';
    }
  }
  showToast('Default rate saved on this device.');
}

async function useCurrentRatesAsDefaults() {
  const prefs = localStore.getPreferences();
  RATE_KEYS.forEach((key) => { prefs[key] = state.current[key]; });
  prefs.onePersonRate = CREW_RATES.one;
  prefs.twoPersonRate = state.current.crewType === 'two' ? Number(state.current.crewRate) : CREW_RATES.two;
  localStore.savePreferences(prefs);
  if (state.cloudEnabled) {
    try {
      await cloud.saveRateSettings(state.company.id, prefs);
      showToast('Current rates saved as shared defaults.');
      return;
    } catch (error) {
      state.cloudError = error?.message || 'Could not update shared defaults.';
    }
  }
  showToast('Current rates saved as local defaults.');
}

async function loadCloudWorkspace() {
  state.syncStatus = 'checking';
  state.cloudError = '';
  try {
    const workspace = await cloud.bootstrapWorkspace();
    state.company = workspace.company;
    state.memberRole = workspace.role;
    state.savedItems = await cloud.listEstimates(workspace.company.id);
    localStore.saveCloudCache(state.savedItems);
    const sharedPrefs = await cloud.loadRateSettings(workspace.company.id);
    if (sharedPrefs && Object.keys(sharedPrefs).length) localStore.savePreferences(sharedPrefs);
    state.cloudEnabled = true;
    state.localMode = false;
    localStore.setLocalMode(false);
    state.syncStatus = 'saved';
  } catch (error) {
    state.cloudError = error?.message || 'Could not load the shared workspace.';
    state.savedItems = localStore.listCloudCache();
    state.cloudEnabled = Boolean(state.session);
    state.syncStatus = 'offline';
  }
}

async function handleSignIn(form) {
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '');
  state.cloudError = '';
  try {
    const session = await cloud.signIn(email, password);
    state.session = session;
    await loadCloudWorkspace();
    state.authReady = true;
    render();
    showToast('Signed in.');
  } catch (error) {
    state.cloudError = error?.message || 'Could not sign in.';
    state.authReady = true;
    render();
  }
}

async function sendMagicLink() {
  const emailInput = document.getElementById('auth-email');
  const email = String(emailInput?.value || '').trim();
  if (!email) {
    state.cloudError = 'Enter your email address first.';
    render();
    return;
  }
  try {
    await cloud.sendMagicLink(email);
    state.cloudError = '';
    showToast('Sign-in link sent. Check your email.');
  } catch (error) {
    state.cloudError = error?.message || 'Could not send a sign-in link.';
    render();
  }
}

async function signOut() {
  try {
    await cloud.signOut();
  } catch (error) {
    state.cloudError = error?.message || 'Could not sign out cleanly.';
  }
  state.session = null;
  state.cloudEnabled = false;
  state.company = null;
  state.memberRole = null;
  state.localMode = false;
  localStore.setLocalMode(false);
  state.route = 'home';
  render();
}

async function refreshCloudEstimates() {
  if (!state.cloudEnabled || !state.company?.id) return;
  try {
    state.syncStatus = 'checking';
    state.savedItems = await cloud.listEstimates(state.company.id);
    localStore.saveCloudCache(state.savedItems);
    state.syncStatus = 'saved';
    state.cloudError = '';
    render();
    showToast('Cloud estimates refreshed.');
  } catch (error) {
    state.syncStatus = 'offline';
    state.cloudError = error?.message || 'Could not refresh cloud estimates.';
    render();
  }
}

async function importLocalEstimates() {
  if (!state.cloudEnabled) return;
  const localItems = localStore.listEstimates();
  if (!localItems.length) {
    showToast('No local estimates to import.');
    return;
  }
  let imported = 0;
  try {
    for (const localItem of localItems) {
      const item = { ...clone(localItem) };
      if (!item.id) item.id = makeId();
      if (!item.estimateNumber) item.estimateNumber = generateEstimateNumber([...state.savedItems, ...localItems]);
      const total = Number(item.total ?? calculateEstimate(item).grandTotal);
      const saved = await cloud.saveEstimate(state.company.id, item, total);
      const index = state.savedItems.findIndex((entry) => entry.id === saved.id);
      if (index >= 0) state.savedItems[index] = saved;
      else state.savedItems.unshift(saved);
      imported += 1;
    }
    localStore.saveCloudCache(state.savedItems);
    localStore.saveEstimates([]);
    render();
    showToast(`Imported ${imported} estimate${imported === 1 ? '' : 's'} to cloud.`);
  } catch (error) {
    state.cloudError = error?.message || 'The import did not finish.';
    render();
    showToast(`Imported ${imported} before an error occurred.`);
  }
}

async function initApp() {
  render();
  try {
    state.session = await cloud.init();
    if (state.session) await loadCloudWorkspace();
    await cloud.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && session.access_token !== state.session?.access_token) {
        state.session = session;
        await loadCloudWorkspace();
        state.authReady = true;
        render();
      }
      if (event === 'SIGNED_OUT') {
        state.session = null;
        state.cloudEnabled = false;
        state.company = null;
        state.memberRole = null;
        state.authReady = true;
        render();
      }
    });
  } catch (error) {
    state.cloudError = error?.message || 'Cloud connection is unavailable. You can continue locally.';
    state.cloudEnabled = false;
  }
  state.authReady = true;
  render();
}

function printEstimate() {
  if (state.route !== 'estimate') {
    state.route = 'estimate';
    state.activeSection = null;
    render();
    setTimeout(() => window.print(), 50);
  } else {
    window.print();
  }
}

app.addEventListener('submit', (event) => {
  if (event.target.matches('#sign-in-form')) {
    event.preventDefault();
    handleSignIn(event.target);
  }
});

app.addEventListener('input', (event) => {
  const element = event.target;
  if (element.matches('[data-field]')) {
    updateFieldFromElement(element);
    refreshVisibleTotals();
  }
  if (element.matches('[data-search="saved"]')) {
    state.savedSearch = element.value;
    const container = document.getElementById('saved-list-container');
    const items = filterSaved();
    if (container) container.innerHTML = items.length ? `<div class="estimate-list">${items.map(renderEstimateCard).join('')}</div>` : renderEmpty('No matches found', 'Try another search.');
  }
});

app.addEventListener('change', (event) => {
  const element = event.target;
  if (element.matches('[data-field]')) {
    updateFieldFromElement(element);
    if (element.type === 'checkbox') render();
    else refreshVisibleTotals();
  }
  if (element.matches('[data-preference]')) savePreferenceField(element);
});

app.addEventListener('click', (event) => {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) {
    setRoute(routeButton.dataset.route);
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === 'new-estimate') startNewEstimate();
  if (action === 'continue-local') {
    state.localMode = true;
    state.cloudEnabled = false;
    localStore.setLocalMode(true);
    render();
  }
  if (action === 'show-sign-in') {
    state.localMode = false;
    localStore.setLocalMode(false);
    render();
  }
  if (action === 'magic-link') sendMagicLink();
  if (action === 'sign-out') signOut();
  if (action === 'import-local') importLocalEstimates();
  if (action === 'refresh-cloud') refreshCloudEstimates();
  if (action === 'go-saved') setRoute('saved');
  if (action === 'back-to-estimate') setRoute('estimate');
  if (action === 'edit-project') setRoute('project');
  if (action === 'open-section') openSection(actionButton.dataset.section);
  if (action === 'save') saveCurrent();
  if (action === 'open-estimate') openSaved(actionButton.dataset.id);
  if (action === 'duplicate-saved') {
    const item = savedEstimates().find((entry) => entry.id === actionButton.dataset.id);
    if (item) duplicateEstimate(item);
  }
  if (action === 'delete-saved') deleteSaved(actionButton.dataset.id);
  if (action === 'duplicate-current') duplicateEstimate();
  if (action === 'print') printEstimate();
  if (action === 'load-example') loadExample();
  if (action === 'clear-draft') {
    if (confirm('Clear the current draft? Saved estimates will not be deleted.')) {
      state.current = newEstimateFromPreferences();
      localStore.saveDraft(state.current);
      showToast('Current draft cleared.');
      render();
    }
  }
  if (action === 'use-current-rates') useCurrentRatesAsDefaults();
  if (action === 'set-crew') {
    state.current.crewType = actionButton.dataset.value;
    const prefs = localStore.getPreferences();
    state.current.crewRate = actionButton.dataset.value === 'one'
      ? Number(prefs.onePersonRate ?? CREW_RATES.one)
      : Number(prefs.twoPersonRate ?? CREW_RATES.two);
    localStore.saveDraft(state.current);
    render();
  }
});

window.addEventListener('beforeunload', () => localStore.saveDraft(state.current));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => console.warn('Service worker registration failed', error));
  });
}

initApp();

// Exposed for quick automated verification in a browser console.
window.SummerEstimateApp = {
  calculateEstimate,
  getCurrentEstimate: () => clone(state.current),
  getSavedEstimates: savedEstimates,
};
