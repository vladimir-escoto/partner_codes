import { ensureSeed } from '../seed.js';
import { loadDB } from './db.js';
import { createSidebar } from '../components/sidebar.js';
import {
  registerRoutes,
  navigate,
  setContentContainer,
  getAvailableViews,
} from './router.js';
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

const ROUTE_DEFINITIONS = {
  admin: [
    { view: 'dashboard', label: 'Dashboard', render: renderAdminDashboard },
    { view: 'codes', label: 'Códigos', render: renderAdminCodes },
    { view: 'reports', label: 'Reportes', render: renderAdminReports },
    { view: 'payments', label: 'Pagos', render: renderAdminPayments },
  ],
  ejecutivo: [
    { view: 'dashboard', label: 'Dashboard', render: renderExecutiveDashboard },
    { view: 'payments', label: 'Pagos', render: renderExecutivePayments },
  ],
  finanzas: [
    { view: 'payments', label: 'Pagos', render: renderFinancePayments },
    { view: 'history', label: 'Historial', render: renderFinanceHistory },
  ],
  partner: [
    { view: 'dashboard', label: 'Dashboard', render: renderPartnerDashboard },
    { view: 'my-code', label: 'Mi código & afiliados', render: renderPartnerMyCode },
    { view: 'payments', label: 'Pagos', render: renderPartnerPayments },
  ],
};

const DEFAULT_ROLE = 'admin';
const DEFAULT_VIEW = 'dashboard';

const boot = () => {
  ensureSeed();
  loadDB();

  Object.entries(ROUTE_DEFINITIONS).forEach(([role, routes]) => {
    registerRoutes(role, routes);
  });

  const appRoot = document.querySelector('#app');
  if (!appRoot) {
    throw new Error('No se encontró el nodo raíz #app para montar la aplicación.');
  }

  appRoot.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'app';

  const header = document.createElement('header');
  header.className = 'content__header';

  const heading = document.createElement('h1');
  heading.textContent = 'Panel de referidos';
  header.appendChild(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'content__subtitle';
  header.appendChild(subtitle);

  const viewContainer = document.createElement('section');
  viewContainer.className = 'view-container';

  const content = document.createElement('main');
  content.id = 'content';
  content.className = 'content';
  content.appendChild(header);
  content.appendChild(viewContainer);

  setContentContainer(viewContainer);

  const sidebar = createSidebar({
    activeRole: DEFAULT_ROLE,
    activeView: DEFAULT_VIEW,
    getViewsForRole: getAvailableViews,
    onRoleChange: (nextRole) => {
      const availableViews = getAvailableViews(nextRole);
      const defaultView = availableViews[0]?.id;
      const nextRoute = navigate(nextRole, defaultView);
      syncSidebar(nextRoute);
      updateSubtitle(nextRoute);
    },
    onViewChange: (role, view) => {
      const nextRoute = navigate(role, view);
      syncSidebar(nextRoute);
      updateSubtitle(nextRoute);
    },
    title: 'Roles',
  });

  const sidebarElement = sidebar.element;
  sidebarElement.id = 'sidebar';
  sidebarElement.classList.add('sidebar');

  layout.appendChild(sidebarElement);
  layout.appendChild(content);
  appRoot.appendChild(layout);

  const updateSubtitle = ({ role, view }) => {
    const available = getAvailableViews(role);
    const current = available.find((item) => item.id === view);
    subtitle.textContent = current?.label ? `Vista: ${current.label}` : '';
  };

  const syncSidebar = ({ role, view }) => {
    sidebar.setActiveRole(role, { views: getAvailableViews(role) });
    sidebar.setActiveView(view);
  };

  const initialRoute = navigate(DEFAULT_ROLE, DEFAULT_VIEW);
  syncSidebar(initialRoute);
  updateSubtitle(initialRoute);
};

boot();
