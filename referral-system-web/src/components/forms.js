let controlIdCounter = 0;
const BASE_CLASS = 'ui-form';

function uniqueId(name = 'field') {
  controlIdCounter += 1;
  const sanitized = name.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'field';
  return `${sanitized}-${controlIdCounter}`;
}

function createErrorNode() {
  const error = document.createElement('p');
  error.className = `${BASE_CLASS}__error`;
  error.setAttribute('role', 'alert');
  error.hidden = true;
  return error;
}

function applyHelperText(wrapper, helperText) {
  if (!helperText) return null;
  const helper = document.createElement('p');
  helper.className = `${BASE_CLASS}__helper`;
  helper.textContent = helperText;
  wrapper.appendChild(helper);
  return helper;
}

function setValidationAttributes(control, config = {}) {
  const { required, pattern, minLength, maxLength, min, max, step } = config;

  if (required) control.required = true;
  if (pattern) control.pattern = pattern;
  if (typeof minLength === 'number') control.minLength = minLength;
  if (typeof maxLength === 'number') control.maxLength = maxLength;
  if (typeof min === 'number' || typeof min === 'string') control.min = min;
  if (typeof max === 'number' || typeof max === 'string') control.max = max;
  if (typeof step === 'number' || typeof step === 'string') control.step = step;
}

function buildValidation(control, errorNode) {
  const getMessage = () => {
    const validity = control.validity;
    if (validity.valid) return '';
    if (validity.valueMissing) return 'Este campo es obligatorio.';
    if (validity.typeMismatch) return 'El valor ingresado no tiene el formato correcto.';
    if (validity.patternMismatch) return 'El formato del campo no es válido.';
    if (validity.tooShort) return `Se requieren al menos ${control.minLength} caracteres.`;
    if (validity.tooLong) return `Se permiten como máximo ${control.maxLength} caracteres.`;
    if (validity.rangeUnderflow) return `El valor debe ser mayor o igual a ${control.min}.`;
    if (validity.rangeOverflow) return `El valor debe ser menor o igual a ${control.max}.`;
    if (validity.stepMismatch) return 'El valor no coincide con el incremento esperado.';
    return 'El valor ingresado no es válido.';
  };

  const showMessage = (message) => {
    if (message) {
      errorNode.textContent = message;
      errorNode.hidden = false;
      control.setAttribute('aria-invalid', 'true');
    } else {
      errorNode.textContent = '';
      errorNode.hidden = true;
      control.removeAttribute('aria-invalid');
    }
  };

  const validate = () => {
    const message = getMessage();
    showMessage(message);
    return !message;
  };

  control.addEventListener('input', () => {
    if (!errorNode.hidden) {
      validate();
    }
  });
  control.addEventListener('blur', validate);

  return validate;
}

function buildField({ label, name, helperText, control }) {
  const fieldWrapper = document.createElement('div');
  fieldWrapper.className = `${BASE_CLASS}__field`;

  const id = uniqueId(name || label || 'field');
  control.id = id;
  control.name = name || id;

  if (label) {
    const labelNode = document.createElement('label');
    labelNode.className = `${BASE_CLASS}__label`;
    labelNode.setAttribute('for', id);
    labelNode.textContent = label;
    fieldWrapper.appendChild(labelNode);
  }

  fieldWrapper.appendChild(control);
  applyHelperText(fieldWrapper, helperText);

  const errorNode = createErrorNode();
  fieldWrapper.appendChild(errorNode);

  const validate = buildValidation(control, errorNode);

  fieldWrapper.validate = validate;
  fieldWrapper.control = control;

  return fieldWrapper;
}

function createInputControl(config = {}) {
  const {
    type = 'text',
    value = '',
    placeholder = '',
    autoComplete = 'off',
    ...rest
  } = config;

  const input = document.createElement('input');
  input.className = `${BASE_CLASS}__control`;
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = autoComplete;

  setValidationAttributes(input, rest);

  const field = buildField({ ...rest, control: input });

  return { field, input, validate: field.validate };
}

function createSelectControl(config = {}) {
  const { options = [], value, placeholder, multiple = false, ...rest } = config;
  const select = document.createElement('select');
  select.className = `${BASE_CLASS}__control`;
  select.multiple = Boolean(multiple);

  if (placeholder && !multiple) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = placeholder;
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
  }

  options.forEach((optionConfig) => {
    const option = document.createElement('option');
    if (typeof optionConfig === 'string') {
      option.value = optionConfig;
      option.textContent = optionConfig;
    } else {
      option.value = optionConfig.value;
      option.textContent = optionConfig.label ?? optionConfig.value;
      if (optionConfig.disabled) option.disabled = true;
    }

    if (multiple && Array.isArray(value) && value.includes(option.value)) {
      option.selected = true;
    } else if (!multiple && value === option.value) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  setValidationAttributes(select, rest);

  const field = buildField({ ...rest, control: select });
  return { field, select, validate: field.validate };
}

function createTextareaControl(config = {}) {
  const { value = '', rows = 4, placeholder = '', resize = 'vertical', ...rest } = config;
  const textarea = document.createElement('textarea');
  textarea.className = `${BASE_CLASS}__control`;
  textarea.value = value;
  textarea.rows = rows;
  textarea.placeholder = placeholder;
  textarea.style.resize = resize;

  setValidationAttributes(textarea, rest);

  const field = buildField({ ...rest, control: textarea });
  return { field, textarea, validate: field.validate };
}

export function createInputField(config) {
  return createInputControl(config);
}

export function createSelectField(config) {
  return createSelectControl(config);
}

export function createTextareaField(config) {
  return createTextareaControl(config);
}

export function validateForm(fields = []) {
  const controls = Array.isArray(fields) ? fields : [fields];
  return controls.reduce((isValid, field) => {
    if (field && typeof field.validate === 'function') {
      return field.validate() && isValid;
    }
    if (field instanceof HTMLElement && typeof field.validate === 'function') {
      return field.validate() && isValid;
    }
    return isValid;
  }, true);
}

