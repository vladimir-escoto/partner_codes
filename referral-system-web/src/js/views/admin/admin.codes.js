import { getDB, setDB } from '../../db.js';
import { showToast } from '../../../components/toast.js';
import { createModal, openModal, closeModal, destroyModal } from '../../../components/modals.js';

const CODE_REGEX = /^(PT|AF)-[A-Z0-9]{5}$/;

const randomCode = (length = 5) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let index = 0; index < length; index += 1) {
    const pick = Math.floor(Math.random() * alphabet.length);
    value += alphabet[pick];
  }
  return value;
};

const nextCodeValue = (role, existingCodes) => {
  const prefix = role === 'affiliate' ? 'AF' : 'PT';
  const attemptsLimit = 25;
  const taken = new Set(
    existingCodes.map((code) => (typeof code.code === 'string' ? code.code : code.value)).filter(Boolean),
  );

  for (let attempt = 0; attempt < attemptsLimit; attempt += 1) {
    const candidate = `${prefix}-${randomCode(5)}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('No fue posible generar un código único.');
};

const normaliseCodeRecord = (code) => {
  const resolvedCode = code.code ?? code.value ?? code.id;
  const role = code.role ?? (typeof resolvedCode === 'string' && resolvedCode.startsWith('AF') ? 'affiliate' : 'partner');
  return {
    id: code.id ?? code.codeId ?? code.code_id ?? resolvedCode,
    code: resolvedCode,
    role,
    owner_user_id: code.owner_user_id ?? code.userId ?? code.user_id ?? '',
    owner_name: code.owner_name ?? code.ownerName ?? code.owner ?? '',
    email: code.email ?? '',
    phone: code.phone ?? '',
    region: code.region ?? code.partner_region ?? '',
    parent_partner_id: code.parent_partner_id ?? code.partnerId ?? code.partner_id ?? '',
    status: code.status ?? 'active',
    uses: code.uses ?? code.usage_count ?? 0,
    max_uses: code.max_uses ?? code.maxUses ?? null,
    created_at: code.created_at ?? code.createdAt ?? null,
    updated_at: code.updated_at ?? code.updatedAt ?? null,
    raw: code,
  };
};

const createCard = (title, description) => {
  const card = document.createElement('article');
  card.className = 'card';
  if (title) {
    const heading = document.createElement('h2');
    heading.textContent = title;
    card.appendChild(heading);
  }
  if (description) {
    const paragraph = document.createElement('p');
    paragraph.textContent = description;
    card.appendChild(paragraph);
  }
  return card;
};

const buildTableHeader = (columns) => {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');
  columns.forEach((column) => {
    const cell = document.createElement('th');
    cell.textContent = column;
    row.appendChild(cell);
  });
  thead.appendChild(row);
  return thead;
};

const buildTableRow = (code, onEdit) => {
  const row = document.createElement('tr');
  const cells = [
    code.id ?? '—',
    code.code ?? '—',
    code.role === 'affiliate' ? 'Afiliado' : 'Partner',
    code.owner_name || code.owner_user_id || '—',
    code.status ?? '—',
    code.max_uses ? `${code.uses ?? 0}/${code.max_uses}` : `${code.uses ?? 0}`,
    code.region || '—',
  ];
  cells.forEach((value) => {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  });

  const actions = document.createElement('td');
  if (code.raw && code.raw.role) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Editar';
    button.className = 'button button--secondary';
    button.addEventListener('click', () => onEdit(code.raw));
    actions.appendChild(button);
  } else {
    const hint = document.createElement('span');
    hint.textContent = 'Solo lectura';
    hint.className = 'tag';
    actions.appendChild(hint);
  }
  row.appendChild(actions);
  return row;
};

const renderCodesTable = (codes, onEdit) => {
  const table = document.createElement('table');
  table.appendChild(
    buildTableHeader(['ID', 'Código', 'Rol', 'Owner', 'Status', 'Usos', 'Región', 'Acciones']),
  );
  const tbody = document.createElement('tbody');
  if (!codes.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.textContent = 'Sin códigos registrados.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    codes.map((code) => normaliseCodeRecord(code)).forEach((code) => {
      tbody.appendChild(buildTableRow(code, onEdit));
    });
  }
  table.appendChild(tbody);
  return table;
};

const serializeForm = (form) => {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
};

const persistCode = (record) => {
  setDB((db) => {
    const next = { ...db };
    const codes = Array.isArray(next.codes) ? [...next.codes] : [];
    codes.push(record);
    next.codes = codes;
    return next;
  });
};

const updateCode = (id, changes) => {
  let found = false;
  setDB((db) => {
    const next = { ...db };
    next.codes = Array.isArray(db.codes) ? db.codes.map((code) => {
      const candidateId = code.id ?? code.codeId ?? code.code_id;
      if (candidateId && candidateId === id) {
        found = true;
        return {
          ...code,
          ...changes,
          updated_at: new Date().toISOString(),
        };
      }
      return code;
    }) : db.codes;
    return next;
  });
  return found;
};

const createEditForm = (code, onSubmit) => {
  const form = document.createElement('form');
  form.className = 'form-grid';

  const fields = [
    { name: 'owner_name', label: 'Nombre', value: code.owner_name ?? '' },
    { name: 'owner_user_id', label: 'ID usuario', value: code.owner_user_id ?? '' },
    { name: 'email', label: 'Email', value: code.email ?? '' },
    { name: 'phone', label: 'Teléfono', value: code.phone ?? '' },
    { name: 'region', label: 'Región', value: code.region ?? '' },
  ];

  fields.forEach(({ name, label, value }) => {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    const input = document.createElement('input');
    input.name = name;
    input.value = value;
    input.className = 'form-control';
    wrapper.appendChild(input);
    form.appendChild(wrapper);
  });

  if (code.role === 'affiliate') {
    const partnerWrapper = document.createElement('label');
    partnerWrapper.textContent = 'Partner padre';
    const partnerInput = document.createElement('input');
    partnerInput.name = 'parent_partner_id';
    partnerInput.value = code.parent_partner_id ?? '';
    partnerInput.required = true;
    partnerInput.className = 'form-control';
    partnerWrapper.appendChild(partnerInput);
    form.appendChild(partnerWrapper);
  }

  const statusWrapper = document.createElement('label');
  statusWrapper.textContent = 'Status';
  const statusSelect = document.createElement('select');
  statusSelect.name = 'status';
  statusSelect.className = 'form-control';
  ['active', 'inactive', 'paused', 'expired'].forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    if ((code.status ?? 'active') === status) {
      option.selected = true;
    }
    statusSelect.appendChild(option);
  });
  statusWrapper.appendChild(statusSelect);
  form.appendChild(statusWrapper);

  const maxWrapper = document.createElement('label');
  maxWrapper.textContent = 'Máximo de usos';
  const maxInput = document.createElement('input');
  maxInput.type = 'number';
  maxInput.name = 'max_uses';
  maxInput.min = '0';
  if (code.max_uses != null) {
    maxInput.value = Number(code.max_uses);
  }
  maxInput.className = 'form-control';
  maxWrapper.appendChild(maxInput);
  form.appendChild(maxWrapper);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = serializeForm(form);
    onSubmit(payload);
  });

  return form;
};

const openEditModal = (code, refresh) => {
  const modalId = `edit-code-${code.id ?? code.codeId ?? code.code_id}`;
  destroyModal(modalId);
  const form = createEditForm(normaliseCodeRecord(code), (payload) => {
    const changes = {
      owner_name: payload.owner_name ?? '',
      owner_user_id: payload.owner_user_id ?? '',
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      region: payload.region ?? '',
      status: payload.status ?? 'active',
      parent_partner_id: code.role === 'affiliate' ? payload.parent_partner_id ?? '' : null,
      max_uses: payload.max_uses ? Number(payload.max_uses) : null,
    };
    updateCode(code.id ?? code.codeId ?? code.code_id, changes);
    showToast('Código actualizado correctamente', { type: 'success' });
    closeModal(modalId);
    destroyModal(modalId);
    refresh();
  });

  const modal = createModal({
    id: modalId,
    title: `Editar código ${code.code ?? code.value}`,
    content: form,
    actions: [
      { label: 'Cerrar', variant: 'secondary', onClick: () => { closeModal(modalId); destroyModal(modalId); } },
    ],
  });
  openModal(modal.id);
};

const buildCreateForm = (existingCodes, refresh) => {
  const form = document.createElement('form');
  form.className = 'form-grid';

  const roleWrapper = document.createElement('label');
  roleWrapper.textContent = 'Rol';
  const roleSelect = document.createElement('select');
  roleSelect.name = 'role';
  roleSelect.required = true;
  roleSelect.className = 'form-control';
  const roles = [
    { value: 'partner', label: 'Partner (PT)' },
    { value: 'affiliate', label: 'Affiliate (AF)' },
  ];
  roles.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.value;
    option.textContent = role.label;
    roleSelect.appendChild(option);
  });
  roleWrapper.appendChild(roleSelect);
  form.appendChild(roleWrapper);

  const ownerId = document.createElement('label');
  ownerId.textContent = 'Owner user id';
  const ownerIdInput = document.createElement('input');
  ownerIdInput.name = 'owner_user_id';
  ownerIdInput.required = true;
  ownerIdInput.placeholder = 'USR-123';
  ownerIdInput.className = 'form-control';
  ownerId.appendChild(ownerIdInput);
  form.appendChild(ownerId);

  const ownerName = document.createElement('label');
  ownerName.textContent = 'Nombre';
  const ownerNameInput = document.createElement('input');
  ownerNameInput.name = 'owner_name';
  ownerNameInput.required = true;
  ownerNameInput.placeholder = 'Nombre del responsable';
  ownerNameInput.className = 'form-control';
  ownerName.appendChild(ownerNameInput);
  form.appendChild(ownerName);

  const emailWrapper = document.createElement('label');
  emailWrapper.textContent = 'Email';
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.name = 'email';
  emailInput.required = true;
  emailInput.placeholder = 'correo@empresa.com';
  emailInput.className = 'form-control';
  emailWrapper.appendChild(emailInput);
  form.appendChild(emailWrapper);

  const phoneWrapper = document.createElement('label');
  phoneWrapper.textContent = 'Teléfono';
  const phoneInput = document.createElement('input');
  phoneInput.name = 'phone';
  phoneInput.placeholder = '+52 55 1234 5678';
  phoneInput.className = 'form-control';
  phoneWrapper.appendChild(phoneInput);
  form.appendChild(phoneWrapper);

  const regionWrapper = document.createElement('label');
  regionWrapper.textContent = 'Región';
  const regionInput = document.createElement('input');
  regionInput.name = 'region';
  regionInput.placeholder = 'LatAm, Europa...';
  regionInput.className = 'form-control';
  regionWrapper.appendChild(regionInput);
  form.appendChild(regionWrapper);

  const parentWrapper = document.createElement('label');
  parentWrapper.textContent = 'Partner padre';
  const parentInput = document.createElement('input');
  parentInput.name = 'parent_partner_id';
  parentInput.placeholder = 'PT-0001';
  parentInput.className = 'form-control';
  parentWrapper.appendChild(parentInput);
  form.appendChild(parentWrapper);

  const maxWrapper = document.createElement('label');
  maxWrapper.textContent = 'Máximo de usos';
  const maxInput = document.createElement('input');
  maxInput.type = 'number';
  maxInput.name = 'max_uses';
  maxInput.min = '0';
  maxInput.placeholder = 'Ej. 100';
  maxInput.className = 'form-control';
  maxWrapper.appendChild(maxInput);
  form.appendChild(maxWrapper);

  const helper = document.createElement('p');
  helper.className = 'form-helper';
  helper.textContent = 'Para afiliados es obligatorio especificar el partner padre.';
  form.appendChild(helper);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = serializeForm(form);
    const role = payload.role;
    if (!role) {
      showToast('Debe seleccionar un rol válido.', { type: 'warning' });
      return;
    }
    if (role === 'affiliate' && !payload.parent_partner_id) {
      showToast('Los afiliados requieren un partner padre.', { type: 'warning' });
      return;
    }

    const db = getDB();
    let codeValue;
    try {
      codeValue = nextCodeValue(role, Array.isArray(db.codes) ? db.codes : []);
    } catch (error) {
      showToast(error.message, { type: 'danger' });
      return;
    }

    if (!CODE_REGEX.test(codeValue)) {
      showToast('El formato generado del código no es válido.', { type: 'danger' });
      return;
    }

    const now = new Date().toISOString();
    const record = {
      id: codeValue,
      code: codeValue,
      role,
      owner_user_id: payload.owner_user_id,
      owner_name: payload.owner_name,
      email: payload.email,
      phone: payload.phone ?? '',
      region: payload.region ?? '',
      parent_partner_id: role === 'affiliate' ? payload.parent_partner_id : null,
      max_uses: payload.max_uses ? Number(payload.max_uses) : null,
      status: 'active',
      uses: 0,
      created_at: now,
      updated_at: now,
    };

    persistCode(record);
    showToast(`Código ${record.code} creado exitosamente`, { type: 'success' });
    form.reset();
    refresh();
  });

  roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'affiliate') {
      parentWrapper.style.display = 'flex';
      parentInput.required = true;
    } else {
      parentWrapper.style.display = 'none';
      parentInput.required = false;
      parentInput.value = '';
    }
  });

  roleSelect.dispatchEvent(new Event('change'));

  return form;
};

export function renderAdminCodes(container, { refresh }) {
  const db = getDB();
  const codes = Array.isArray(db.codes) ? db.codes : [];

  const intro = createCard(
    'Gestión de códigos',
    'Crear códigos PT/AF, revisar su estado y actualizar información clave de los responsables.',
  );
  container.appendChild(intro);

  const formCard = createCard('Nuevo código', 'Complete los datos para generar un nuevo código.');
  formCard.appendChild(buildCreateForm(codes, refresh));
  container.appendChild(formCard);

  const tableCard = createCard('Listado de códigos');
  tableCard.appendChild(renderCodesTable(codes, (code) => openEditModal(code, refresh)));
  container.appendChild(tableCard);
}
