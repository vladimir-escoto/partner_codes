const CONTAINER_ID = 'ui-toast-container';
const BASE_CLASS = 'ui-toast';
const DEFAULT_DURATION = 3500;

function ensureContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('section');
    container.id = CONTAINER_ID;
    container.className = `${BASE_CLASS}__container`;
    container.setAttribute('aria-live', 'assertive');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

function buildToast(message, { type, dismissible }) {
  const toast = document.createElement('article');
  toast.className = `${BASE_CLASS} ${BASE_CLASS}--${type}`;
  toast.setAttribute('role', 'status');

  const content = document.createElement('p');
  content.className = `${BASE_CLASS}__message`;
  content.textContent = message;

  toast.appendChild(content);

  if (dismissible) {
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = `${BASE_CLASS}__close`;
    closeButton.setAttribute('aria-label', 'Cerrar notificación');
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => removeToast(toast));
    toast.appendChild(closeButton);
  }

  toast.addEventListener('animationend', (event) => {
    if (event.animationName === 'hideToast') {
      removeToast(toast);
    }
  });

  return toast;
}

function removeToast(toast) {
  toast.classList.add(`${BASE_CLASS}--leaving`);
  setTimeout(() => {
    toast.remove();
  }, 250);
}

export function showToast(message, { type = 'info', duration = DEFAULT_DURATION, dismissible = true } = {}) {
  const container = ensureContainer();
  const toast = buildToast(message, { type, dismissible });
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
}

