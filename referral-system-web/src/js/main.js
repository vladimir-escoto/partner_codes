import { ensureSeed } from '../seed.js';
import { loadDB } from './db.js';
import { createSidebar, registerSidebarRole } from '../components/sidebar.js';
import { renderAdminDashboard } from './views/admin/admin.dashboard.js';
import { renderAdminCodes } from './views/admin/admin.codes.js';
import { renderAdminReports } from './views/admin/admin.reports.js';
import { renderAdminPayments } from './views/admin/admin.payments.js';
import { renderExecutiveDashboard } from './views/executive/executive.dashboard.js';
import { renderExecutivePayments } from './views/executive/executive.payments.js';
import { renderFinancePayments } from './views/finance/finance.payments.js';
import { renderFinanceHistory } from './views/finance/finance.history.js';
import { renderPartnerDashboard } from './views/partner/partner.dashboard.js';
import { renderPartnerMyCode } from './views/partner/partner.myCode.js';
import { renderPartnerPayments } from './views/partner/partner.payments.js';

ensureSeed();
loadDB();

const ROLE_CONFIG = {
  admin: {
    title: 'Administración',
    routes: [
      { id: 'admin-dashboard', label: 'Dashboard', render: renderAdminDashboard },
      { id: 'admin-codes', label: 'Códigos', render: renderAdminCodes },
      { id: 'admin-reports', label: 'Reportes', render: renderAdminReports },
      { id: 'admin-payments', label: 'Pagos', render: renderAdminPayments },
    ],
  },
  ejecutivo: {
    title: 'Ejecutivo',
    routes: [
      { id: 'executive-dashboard', label: 'Dashboard', render: renderExecutiveDashboard },
      { id: 'executive-payments', label: 'Pagos', render: renderExecutivePayments },
    ],
  },
  finanzas: {
    title: 'Finanzas',
    routes: [
      { id: 'finance-payments', label: 'Pagos', render: renderFinancePayments },
      { id: 'finance-history', label: 'Historial', render: renderFinanceHistory },
    ],
  },
  partner: {
    title: 'Partner',
    routes: [
      { id: 'partner-dashboard', label: 'Dashboard', render: renderPartnerDashboard },
      { id: 'partner-my-code', label: 'Mi código & afiliados', render: renderPartnerMyCode },
      { id: 'partner-payments', label: 'Pagos', render: renderPartnerPayments },
    ],
  },
};

const state = {
  role: 'admin',
  routeId: 'admin-dashboard',
  sidebarLinks: [],
  viewContainer: null,
};

function decorateMenuLinks(sidebar, roleConfig) {
  state.sidebarLinks = [];
  const anchors = sidebar.querySelectorAll('a');
  anchors.forEach((anchor, index) => {
    const route = roleConfig.routes[index];
    if (!route) return;
    anchor.dataset.routeId = route.id;
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(state.role, route.id);
    });
    state.sidebarLinks.push({ id: route.id, anchor });
  });
  updateActiveLink();
}

function updateActiveLink() {
  state.sidebarLinks.forEach(({ id, anchor }) => {
    if (!anchor) return;
    if (id === state.routeId) {
      anchor.classList.add('is-active');
    } else {
      anchor.classList.remove('is-active');
    }
  });
}

function renderView(role, routeId) {
  const roleConfig = ROLE_CONFIG[role];
  if (!roleConfig) return;
  const route = roleConfig.routes.find((item) => item.id === routeId) ?? roleConfig.routes[0];
  if (!route || !state.viewContainer) return;

  state.viewContainer.innerHTML = '';
  route.render(state.viewContainer, {
    role,
    routeId: route.id,
    refresh: () => renderView(role, route.id),
  });
}

function navigate(role, routeId) {
  state.role = role;
  state.routeId = routeId;
  updateActiveLink();
  renderView(role, routeId);
}

function buildRoleSelector(onChange) {
  const wrapper = document.createElement('label');
  wrapper.className = 'role-selector';
  wrapper.textContent = 'Rol: ';

  const select = document.createElement('select');
  Object.entries(ROLE_CONFIG).forEach(([key, config]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = config.title;
    select.appendChild(option);
  });
  select.value = state.role;
  select.addEventListener('change', (event) => {
    const nextRole = event.target.value;
    const nextConfig = ROLE_CONFIG[nextRole];
    if (!nextConfig) return;
    onChange(nextRole, nextConfig);
  });

  wrapper.appendChild(select);
  return { wrapper, select };
}

function renderLayout() {
  const appRoot = document.querySelector('#app');
  if (!appRoot) {
    throw new Error('No se encontró el nodo raíz #app');
  }

  appRoot.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'app';

  const sidebarContainer = document.createElement('aside');
  sidebarContainer.className = 'sidebar';

  const content = document.createElement('main');
  content.className = 'content';

  const header = document.createElement('header');
  header.className = 'content__header';
  const title = document.createElement('h1');
  title.textContent = 'Panel de referidos';
  header.appendChild(title);

  const { wrapper: roleSelector, select } = buildRoleSelector((nextRole) => {
    const nextConfig = ROLE_CONFIG[nextRole];
    if (!nextConfig) return;
    state.role = nextRole;
    state.routeId = nextConfig.routes[0]?.id ?? null;
    const sidebar = buildSidebar(nextRole);
    sidebarContainer.innerHTML = '';
    sidebarContainer.appendChild(sidebar);
    updateActiveLink();
    renderView(state.role, state.routeId);
  });

  header.appendChild(roleSelector);

  const viewContainer = document.createElement('section');
  viewContainer.className = 'view-container';

  content.appendChild(header);
  content.appendChild(viewContainer);

  layout.appendChild(sidebarContainer);
  layout.appendChild(content);

  appRoot.appendChild(layout);

  state.viewContainer = viewContainer;

  function buildSidebar(role) {
    const config = ROLE_CONFIG[role];
    registerSidebarRole(role, config.routes.map((item) => ({ label: item.label, href: `#${item.id}` })));
    const sidebar = createSidebar(role, { title: config.title });
    decorateMenuLinks(sidebar, config);
    return sidebar;
  }

  const initialSidebar = buildSidebar(state.role);
  sidebarContainer.appendChild(initialSidebar);
  select.value = state.role;
  state.routeId = ROLE_CONFIG[state.role].routes[0].id;
  updateActiveLink();
  renderView(state.role, state.routeId);
}

renderLayout();
