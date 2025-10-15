const ROLE_PRESETS = [
  { id: 'admin', label: 'Admin' },
  { id: 'ejecutivo', label: 'Ejecutivo' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'partner', label: 'Partner' },
];

const BASE_CLASS = 'ui-sidebar';

const formatRole = (role) => (role || '').toString().trim().toLowerCase();

const normaliseViewId = (view) => (view ?? '').toString().trim();

const createRoleOption = (option) => {
  if (typeof option === 'string') {
    return { id: formatRole(option), label: option };
  }
  const id = formatRole(option?.id ?? option?.value ?? option?.role);
  const label = option?.label || option?.name || option?.title || option?.id || option?.value || 'Rol';
  return { id, label };
};

export function createSidebar({
  roles = ROLE_PRESETS,
  activeRole = ROLE_PRESETS[0].id,
  activeView = null,
  title = 'Menú de navegación',
  onRoleChange,
  onViewChange,
  getViewsForRole,
} = {}) {
  const resolvedRoles = Array.from(new Map(roles.map((role) => {
    const option = createRoleOption(role);
    return [option.id, option];
  })).values());

  let state = {
    role: formatRole(activeRole) || resolvedRoles[0]?.id || 'admin',
    view: normaliseViewId(activeView),
  };

  const roleButtons = new Map();
  const viewButtons = new Map();

  const container = document.createElement('aside');
  container.className = BASE_CLASS;
  container.setAttribute('data-role', state.role);

  const heading = document.createElement('h2');
  heading.className = `${BASE_CLASS}__title`;
  heading.textContent = title;
  container.appendChild(heading);

  const rolesWrapper = document.createElement('div');
  rolesWrapper.className = `${BASE_CLASS}__roles`;
  resolvedRoles.forEach((role) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${BASE_CLASS}__role`;
    button.textContent = role.label;
    button.dataset.role = role.id;
    button.addEventListener('click', () => {
      if (state.role === role.id) {
        return;
      }
      setActiveRole(role.id);
      if (typeof onRoleChange === 'function') {
        onRoleChange(role.id);
      }
    });
    roleButtons.set(role.id, button);
    rolesWrapper.appendChild(button);
  });
  container.appendChild(rolesWrapper);

  const nav = document.createElement('nav');
  nav.className = `${BASE_CLASS}__nav`;
  nav.setAttribute('aria-label', 'Menú contextual de vistas');
  const list = document.createElement('ul');
  list.className = `${BASE_CLASS}__list`;
  nav.appendChild(list);
  container.appendChild(nav);

  const emptyState = () => {
    list.innerHTML = '';
    const item = document.createElement('li');
    item.className = `${BASE_CLASS}__item ${BASE_CLASS}__item--empty`;
    item.textContent = 'Sin vistas disponibles.';
    list.appendChild(item);
  };

  const setActiveView = (viewId) => {
    const normalized = normaliseViewId(viewId);
    state = { ...state, view: normalized };
    viewButtons.forEach((button, id) => {
      if (id === normalized) {
        button.classList.add('is-active');
        button.setAttribute('aria-current', 'page');
      } else {
        button.classList.remove('is-active');
        button.removeAttribute('aria-current');
      }
    });
  };

  const refreshViewButtons = (views) => {
    list.innerHTML = '';
    viewButtons.clear();

    if (!Array.isArray(views) || views.length === 0) {
      emptyState();
      return;
    }

    views.forEach(({ id, label }) => {
      const normalizedId = normaliseViewId(id);
      const item = document.createElement('li');
      item.className = `${BASE_CLASS}__item`;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${BASE_CLASS}__link`;
      button.textContent = label ?? normalizedId;
      button.dataset.view = normalizedId;
      button.addEventListener('click', () => {
        setActiveView(normalizedId);
        if (typeof onViewChange === 'function') {
          onViewChange(state.role, normalizedId);
        }
      });

      item.appendChild(button);
      list.appendChild(item);
      viewButtons.set(normalizedId, button);
    });

    if (state.view && viewButtons.has(state.view)) {
      setActiveView(state.view);
    } else {
      const firstView = viewButtons.keys().next().value;
      if (firstView) {
        setActiveView(firstView);
      }
    }
  };

  const setActiveRole = (roleId, { views } = {}) => {
    const normalized = formatRole(roleId);
    if (!normalized) {
      return;
    }
    state = { ...state, role: normalized };
    container.setAttribute('data-role', normalized);
    roleButtons.forEach((button, id) => {
      if (id === normalized) {
        button.classList.add('is-active');
        button.setAttribute('aria-current', 'true');
      } else {
        button.classList.remove('is-active');
        button.removeAttribute('aria-current');
      }
    });

    const nextViews = Array.isArray(views)
      ? views
      : typeof getViewsForRole === 'function'
        ? getViewsForRole(normalized)
        : [];
    refreshViewButtons(nextViews);
  };

  const refreshViews = () => {
    setActiveRole(state.role);
  };

  setActiveRole(state.role, { views: typeof getViewsForRole === 'function' ? getViewsForRole(state.role) : [] });
  if (state.view) {
    setActiveView(state.view);
  }

  return {
    element: container,
    setActiveRole,
    setActiveView,
    refreshViews,
  };
}
