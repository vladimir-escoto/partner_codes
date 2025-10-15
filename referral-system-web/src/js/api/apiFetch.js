import usersRoutes from './routes.users.js';
import codesRoutes from './routes.codes.js';
import reportsRoutes from './routes.reports.js';
import invoicesRoutes from './routes.invoices.js';
import { loadDB } from '../db.js';

const BUILTIN_ROUTES = [
  ...usersRoutes,
  ...codesRoutes,
  ...reportsRoutes,
  ...invoicesRoutes,
];

const extraRoutes = [];

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const normaliseMethod = (method) => {
  if (typeof method === 'string' && method.trim()) {
    return method.trim().toUpperCase();
  }
  return 'GET';
};

const escapeForRegex = (segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalisePath = (path) => {
  if (typeof path !== 'string') {
    return '/';
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }
  const withoutQuery = trimmed.split('?')[0];
  const collapsed = withoutQuery.replace(/\/+/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) {
    return collapsed.slice(0, -1);
  }
  if (!collapsed.startsWith('/')) {
    return `/${collapsed}`;
  }
  return collapsed || '/';
};

const createMatcher = (pattern) => {
  const normalised = normalisePath(pattern);
  const paramNames = [];
  const parts = normalised.split('/');
  const regexParts = parts.map((part) => {
    if (!part) {
      return '';
    }
    if (/^\{[^}]+\}$/.test(part)) {
      const name = part.slice(1, -1).trim();
      paramNames.push(name || 'param');
      return '([^/]+)';
    }
    return escapeForRegex(part);
  });
  const regex = new RegExp(`^${regexParts.join('/')}$`);

  return (path) => {
    const candidate = normalisePath(path);
    const match = candidate.match(regex);
    if (!match) {
      return null;
    }
    const params = {};
    paramNames.forEach((name, index) => {
      const value = match[index + 1];
      params[name] = value != null ? decodeURIComponent(value) : value;
    });
    return { params };
  };
};

const compileRoutes = (routes) =>
  ensureArray(routes)
    .filter((route) => route && typeof route === 'object')
    .map((route) => ({
      ...route,
      method: normaliseMethod(route.method),
      path: normalisePath(route.path),
      matcher: createMatcher(route.path),
    }));

let compiledRoutes = compileRoutes(BUILTIN_ROUTES);

const rebuildRoutes = () => {
  compiledRoutes = compileRoutes([...BUILTIN_ROUTES, ...extraRoutes]);
};

export const registerRoute = (route) => {
  if (!route || typeof route !== 'object') {
    throw new TypeError('registerRoute(route) expects a route object.');
  }
  extraRoutes.push(route);
  rebuildRoutes();
};

export const resetExtraRoutes = () => {
  extraRoutes.length = 0;
  rebuildRoutes();
};

const parseQuery = (rawPath) => {
  if (typeof rawPath !== 'string') {
    return { pathname: '/', query: {} };
  }
  try {
    const url = new URL(rawPath, 'http://local');
    const query = {};
    url.searchParams.forEach((value, key) => {
      if (key in query) {
        const current = query[key];
        if (Array.isArray(current)) {
          current.push(value);
        } else {
          query[key] = [current, value];
        }
      } else {
        query[key] = value;
      }
    });
    return {
      pathname: normalisePath(url.pathname || '/'),
      query,
    };
  } catch (error) {
    return {
      pathname: normalisePath(rawPath.split('?')[0] || '/'),
      query: {},
    };
  }
};

const ensureStatus = (status, ok) => {
  if (Number.isInteger(status) && status >= 100) {
    return status;
  }
  return ok ? 200 : 500;
};

const ensureResponseShape = (result) => {
  if (result && typeof result === 'object' && 'ok' in result) {
    const ok = Boolean(result.ok);
    const status = ensureStatus(result.status, ok);
    const response = { ok, status };
    if ('data' in result) {
      response.data = result.data;
    }
    if ('message' in result && result.message != null) {
      response.message = String(result.message);
    }
    return response;
  }

  if (typeof result === 'undefined') {
    return { ok: true, status: 200 };
  }

  return {
    ok: true,
    status: 200,
    data: result,
  };
};

const formatError = (error) => {
  const statusCandidate = error?.status;
  const status = Number.isInteger(statusCandidate) ? statusCandidate : 500;
  const messageCandidate = error?.message;
  const message =
    typeof messageCandidate === 'string' && messageCandidate.trim()
      ? messageCandidate
      : 'Unexpected error';
  return { ok: false, status, message };
};

export async function apiFetch(method = 'GET', rawPath = '/', body, context = {}) {
  loadDB();
  const { pathname, query } = parseQuery(rawPath);
  const normalisedMethod = normaliseMethod(method);

  for (const route of compiledRoutes) {
    if (route.method !== normalisedMethod) {
      continue;
    }
    const match = route.matcher(pathname);
    if (!match) {
      continue;
    }

    try {
      const result = await route.handler({
        method: normalisedMethod,
        path: pathname,
        params: match.params ?? {},
        query,
        body,
        context: context ?? {},
      });
      return ensureResponseShape(result);
    } catch (error) {
      return formatError(error);
    }
  }

  return {
    ok: false,
    status: 404,
    message: `No route for ${normalisedMethod} ${pathname}`,
  };
}

export default apiFetch;
