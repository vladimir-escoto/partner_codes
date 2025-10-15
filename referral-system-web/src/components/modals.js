const REGISTRY = new Map();
const OVERLAY_CLASS = 'ui-modal-overlay';
const MODAL_CLASS = 'ui-modal';

function ensureInDom(element, container = document.body) {
  if (!element.isConnected) {
    container.appendChild(element);
  }
}

function createActionButton({ label, onClick, variant = 'primary' }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${MODAL_CLASS}__action ${MODAL_CLASS}__action--${variant}`;
  button.textContent = label;
  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }
  return button;
}

function setContent(target, content) {
  if (content === undefined || content === null) return;
  if (typeof content === 'string') {
    target.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    target.innerHTML = '';
    target.appendChild(content);
  } else if (Array.isArray(content)) {
    target.innerHTML = '';
    content.forEach((node) => {
      if (typeof node === 'string') {
        const paragraph = document.createElement('p');
        paragraph.textContent = node;
        target.appendChild(paragraph);
      } else if (node instanceof HTMLElement) {
        target.appendChild(node);
      }
    });
  }
}

export function createModal({ id, title, content, actions = [], closeOnOverlay = true, container } = {}) {
  const modalId = id || `modal-${REGISTRY.size + 1}`;

  const overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS;
  overlay.dataset.modalId = modalId;
  overlay.setAttribute('role', 'presentation');

  const dialog = document.createElement('section');
  dialog.className = MODAL_CLASS;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', `${modalId}-title`);

  const header = document.createElement('header');
  header.className = `${MODAL_CLASS}__header`;

  const titleNode = document.createElement('h3');
  titleNode.className = `${MODAL_CLASS}__title`;
  titleNode.id = `${modalId}-title`;
  titleNode.textContent = title || 'Modal';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = `${MODAL_CLASS}__close`;
  closeButton.setAttribute('aria-label', 'Cerrar modal');
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => closeModal(modalId));

  header.appendChild(titleNode);
  header.appendChild(closeButton);

  const body = document.createElement('div');
  body.className = `${MODAL_CLASS}__body`;
  setContent(body, content);

  const footer = document.createElement('footer');
  footer.className = `${MODAL_CLASS}__footer`;
  actions.forEach((action) => footer.appendChild(createActionButton(action)));

  dialog.appendChild(header);
  dialog.appendChild(body);
  if (actions.length) {
    dialog.appendChild(footer);
  }

  overlay.appendChild(dialog);

  if (closeOnOverlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeModal(modalId);
      }
    });
  }

  ensureInDom(overlay, container);

  REGISTRY.set(modalId, { overlay, dialog });

  return { id: modalId, overlay, dialog };
}

export function openModal(id) {
  const record = REGISTRY.get(id);
  if (!record) {
    throw new Error(`No existe un modal registrado con el id "${id}".`);
  }
  ensureInDom(record.overlay);
  record.overlay.classList.add(`${OVERLAY_CLASS}--visible`);
  record.dialog.focus?.();
  document.body.classList.add('modal-open');
}

export function closeModal(id) {
  const record = REGISTRY.get(id);
  if (!record) return;
  record.overlay.classList.remove(`${OVERLAY_CLASS}--visible`);
  document.body.classList.remove('modal-open');
}

export function destroyModal(id) {
  const record = REGISTRY.get(id);
  if (!record) return;
  record.overlay.remove();
  REGISTRY.delete(id);
}

