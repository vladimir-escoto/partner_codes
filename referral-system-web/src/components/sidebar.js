const MENU_BY_ROLE = {
  admin: [
    { label: 'Panel', href: '#admin-dashboard' },
    { label: 'Usuarios', href: '#admin-users' },
    { label: 'Reportes', href: '#admin-reports' },
    { label: 'Configuración', href: '#admin-settings' }
  ],
  ejecutivo: [
    { label: 'Resumen', href: '#exec-summary' },
    { label: 'Campañas', href: '#exec-campaigns' },
    { label: 'Clientes', href: '#exec-clients' },
    { label: 'Seguimiento', href: '#exec-tracking' }
  ],
  finanzas: [
    { label: 'Dashboard', href: '#finance-dashboard' },
    { label: 'Pagos', href: '#finance-payments' },
    { label: 'Facturación', href: '#finance-billing' },
    { label: 'Compliance', href: '#finance-compliance' }
  ],
  partner: [
    { label: 'Inicio', href: '#partner-home' },
    { label: 'Referidos', href: '#partner-referrals' },
    { label: 'Bonificaciones', href: '#partner-bonuses' },
    { label: 'Centro de ayuda', href: '#partner-help' }
  ]
};

const DEFAULT_MENU = [
  { label: 'Inicio', href: '#home' },
  { label: 'Soporte', href: '#support' }
];

const BASE_CLASS = 'ui-sidebar';

const formatRole = (role) => (role || '').toString().trim().toLowerCase();

function buildMenuItem({ label, href }) {
  const item = document.createElement('li');
  item.className = `${BASE_CLASS}__item`;

  const anchor = document.createElement('a');
  anchor.className = `${BASE_CLASS}__link`;
  anchor.href = href || '#';
  anchor.textContent = label;

  item.appendChild(anchor);
  return item;
}

/**
 * Crea un sidebar basado en el rol proporcionado.
 * @param {string} role - Rol del usuario (admin/ejecutivo/finanzas/partner)
 * @param {object} [options]
 * @param {string} [options.title] - Título que se muestra en la parte superior del menú.
 * @returns {HTMLElement}
 */
export function createSidebar(role, { title = 'Menú' } = {}) {
  const normalizedRole = formatRole(role);
  const menu = MENU_BY_ROLE[normalizedRole] || DEFAULT_MENU;

  const container = document.createElement('aside');
  container.className = BASE_CLASS;
  container.setAttribute('data-role', normalizedRole || 'default');

  const heading = document.createElement('h2');
  heading.className = `${BASE_CLASS}__title`;
  heading.textContent = title;

  const nav = document.createElement('nav');
  nav.className = `${BASE_CLASS}__nav`;
  nav.setAttribute('aria-label', `Menú lateral ${normalizedRole || 'general'}`);

  const list = document.createElement('ul');
  list.className = `${BASE_CLASS}__list`;

  menu.forEach((menuItem) => list.appendChild(buildMenuItem(menuItem)));

  nav.appendChild(list);
  container.appendChild(heading);
  container.appendChild(nav);

  if (!MENU_BY_ROLE[normalizedRole]) {
    const info = document.createElement('p');
    info.className = `${BASE_CLASS}__info`;
    info.textContent = 'Rol sin configuración específica. Mostrando menú genérico.';
    container.appendChild(info);
  }

  return container;
}

export function registerSidebarRole(role, items) {
  MENU_BY_ROLE[formatRole(role)] = Array.isArray(items) && items.length ? items : DEFAULT_MENU;
}

