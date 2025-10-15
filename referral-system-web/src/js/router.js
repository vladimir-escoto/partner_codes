const normalize = (value) => (value ?? '').toString().trim().toLowerCase();

const buildViewKey = (value) => (value ?? '').toString().trim();

const routes = new Map();
let contentContainer = null;
let currentRoute = { role: null, view: null };

const ensureRoleBucket = (role) => {
  const normalizedRole = normalize(role);
  if (!routes.has(normalizedRole)) {
    routes.set(normalizedRole, { order: [], views: new Map() });
  }
  return routes.get(normalizedRole);
};

const renderFallback = (message) => {
  if (!contentContainer) {
    return;
  }
  contentContainer.innerHTML = '';
  const wrapper = document.createElement('section');
  wrapper.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'Vista no disponible';
  wrapper.appendChild(heading);

  const copy = document.createElement('p');
  copy.textContent = message;
  wrapper.appendChild(copy);

  contentContainer.appendChild(wrapper);
};

export const setContentContainer = (node) => {
  if (!(node instanceof HTMLElement)) {
    throw new TypeError('setContentContainer(node) espera un elemento HTML.');
  }
  contentContainer = node;
};

export const registerRoute = ({ role, view, label, render }) => {
  const normalizedRole = normalize(role);
  const viewKey = buildViewKey(view);

  if (!normalizedRole) {
    throw new Error('registerRoute requiere un rol válido.');
  }
  if (!viewKey) {
    throw new Error('registerRoute requiere una vista con identificador.');
  }
  if (typeof render !== 'function') {
    throw new TypeError(`registerRoute("${normalizedRole}", "${viewKey}") espera una función render.`);
  }

  const bucket = ensureRoleBucket(normalizedRole);
  if (!bucket.views.has(viewKey)) {
    bucket.order.push(viewKey);
  }
  bucket.views.set(viewKey, {
    label: label || viewKey,
    render,
  });
};

export const registerRoutes = (role, viewDefinitions) => {
  if (!Array.isArray(viewDefinitions)) {
    throw new TypeError('registerRoutes(role, views) espera un arreglo de vistas.');
  }
  viewDefinitions.forEach((definition) => {
    registerRoute({ role, ...definition });
  });
};

export const getAvailableViews = (role) => {
  const normalizedRole = normalize(role);
  const bucket = routes.get(normalizedRole);
  if (!bucket) {
    return [];
  }
  return bucket.order.map((viewId) => {
    const entry = bucket.views.get(viewId);
    return {
      id: viewId,
      label: entry?.label ?? viewId,
    };
  });
};

export const getCurrentRoute = () => ({ ...currentRoute });

export const navigate = (role, view) => {
  if (!contentContainer) {
    throw new Error('navigate(role, view) requiere un contenedor de contenido configurado.');
  }

  const normalizedRole = normalize(role);
  const bucket = routes.get(normalizedRole);
  if (!bucket || bucket.order.length === 0) {
    currentRoute = { role: normalizedRole || null, view: null };
    renderFallback(`No se encontraron vistas configuradas para el rol "${role ?? 'desconocido'}".`);
    return { ...currentRoute };
  }

  let targetView = buildViewKey(view);
  if (!targetView || !bucket.views.has(targetView)) {
    [targetView] = bucket.order;
  }

  const entry = bucket.views.get(targetView);
  if (!entry) {
    currentRoute = { role: normalizedRole, view: targetView };
    renderFallback(`La vista "${targetView}" no está registrada para el rol "${role}".`);
    return { ...currentRoute };
  }

  contentContainer.innerHTML = '';
  entry.render(contentContainer, {
    role: normalizedRole,
    view: targetView,
    navigate,
  });

  currentRoute = { role: normalizedRole, view: targetView };
  return { ...currentRoute };
};
