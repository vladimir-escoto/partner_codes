/**
 * Utilidades de DOM para consultas y creación de nodos.
 * Ejemplo rápido:
 *   const card = el('div', { class: 'card' }, [el('span', {}, 'Hola')]);
 *   mount('#app', card);
 */

/**
 * Busca el primer elemento que coincida con el selector.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element|null}
 */
export const $ = (selector, root = document) => {
  if (!root || typeof root.querySelector !== 'function') {
    throw new TypeError('El nodo raíz no soporta querySelector');
  }

  return root.querySelector(selector);
};

/**
 * Devuelve un array con todos los elementos que coinciden con el selector.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export const $$ = (selector, root = document) => {
  if (!root || typeof root.querySelectorAll !== 'function') {
    throw new TypeError('El nodo raíz no soporta querySelectorAll');
  }

  return Array.from(root.querySelectorAll(selector));
};

const normalizeChild = (child) => {
  if (child == null) return null;
  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment();
    child.map(normalizeChild).forEach((normalized) => {
      if (normalized) fragment.append(normalized);
    });
    return fragment;
  }
  if (typeof Node !== 'undefined' && child instanceof Node) {
    return child;
  }
  if (typeof child === 'string' || typeof child === 'number') {
    return document.createTextNode(String(child));
  }
  return null;
};

const applyAttribute = (element, key, value) => {
  if (value == null) return;
  if (key === 'style' && value && typeof value === 'object') {
    Object.assign(element.style, value);
    return;
  }
  if (key === 'dataset' && value && typeof value === 'object') {
    Object.assign(element.dataset, value);
    return;
  }
  if (key.startsWith('on') && typeof value === 'function') {
    const eventName = key.slice(2).toLowerCase();
    element.addEventListener(eventName, value);
    return;
  }

  element.setAttribute(key, value);
};

/**
 * Crea un elemento con atributos y nodos hijos opcionales.
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param {any} [children]
 * @returns {HTMLElement}
 */
export const el = (tag, attrs = {}, children = []) => {
  const element = document.createElement(tag);

  if (attrs && typeof attrs === 'object') {
    Object.entries(attrs).forEach(([key, value]) => applyAttribute(element, key, value));
  }

  const normalized = normalizeChild(children);
  if (normalized) {
    element.append(normalized);
  }

  return element;
};

/**
 * Inserta un nodo hijo en un contenedor existente.
 * @param {Element|string} parent
 * @param {Node|string|number} child
 * @returns {Element}
 */
export const mount = (parent, child) => {
  const parentNode = typeof parent === 'string' ? $(parent) : parent;
  if (!parentNode) {
    throw new Error('No se encontró el elemento padre para montar el nodo');
  }

  const node = normalizeChild(child);
  if (!node) {
    throw new TypeError('El hijo proporcionado no es válido');
  }

  parentNode.append(node);
  return parentNode;
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Pequeñas comprobaciones para validar el helper rápidamente desde consola.
  const __domUtilsTest = () => {
    const sandbox = document.createElement('div');
    sandbox.innerHTML = '<p class="probe">Primero</p><p class="probe">Segundo</p>';

    console.assert($('.probe', sandbox)?.textContent === 'Primero', '$(...) debería devolver el primer elemento');
    console.assert($$('.probe', sandbox).length === 2, '$$(...) debería devolver todos los elementos');

    const created = el('button', { class: 'probe-btn', dataset: { role: 'probe' } }, 'Click');
    console.assert(created.tagName === 'BUTTON', 'el(...) debería crear el elemento solicitado');

    mount(sandbox, created);
    console.assert(sandbox.querySelector('.probe-btn'), 'mount(...) debería añadir el hijo');
  };

  if (!window.__domUtilsTested) {
    window.__domUtilsTested = true;
    try {
      __domUtilsTest();
    } catch (error) {
      console.warn('Fallo en comprobaciones de dom.js:', error);
    }
  }
}
