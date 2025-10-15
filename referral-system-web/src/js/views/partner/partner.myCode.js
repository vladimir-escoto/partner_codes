import { getDB } from '../../db.js';

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

const groupCodes = (codes = []) => {
  return codes.reduce(
    (acc, code) => {
      const value = code.code ?? code.value ?? code.id;
      if (typeof value !== 'string') {
        return acc;
      }
      if (value.startsWith('AF-')) {
        acc.af.push(code);
      } else {
        acc.pt.push(code);
      }
      return acc;
    },
    { pt: [], af: [] },
  );
};

const renderCodeList = (label, codes) => {
  const section = createCard(label);
  if (!codes.length) {
    section.appendChild(document.createTextNode('Sin códigos registrados.'));
    return section;
  }
  const list = document.createElement('ul');
  list.className = 'summary-list';
  codes.forEach((code) => {
    const item = document.createElement('li');
    const max = code.max_uses != null ? ` · ${code.max_uses} usos` : '';
    item.innerHTML = `<span>${code.code ?? code.value}</span><strong>${code.status ?? 'activo'}${max}</strong>`;
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
};

const renderAffiliates = (affiliates, codes) => {
  const section = createCard('Afiliados activos', 'Resumen por afiliado sin exponer datos sensibles.');
  if (!affiliates.length) {
    section.appendChild(document.createTextNode('No hay afiliados asociados.'));
    return section;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Afiliado', 'Región', 'Códigos', 'Usuarios'].forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  affiliates.forEach((affiliate) => {
    const relatedCodes = codes.filter(
      (code) => (code.affiliateId ?? code.affiliate_id ?? code.parent_affiliate_id) === affiliate.id,
    );
    const users = relatedCodes.reduce((acc, code) => acc + (code.uses ?? code.usage_count ?? 0), 0);
    const row = document.createElement('tr');
    const cells = [
      affiliate.name ?? affiliate.id,
      affiliate.region ?? '—',
      relatedCodes.length,
      users,
    ];
    cells.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  section.appendChild(table);
  return section;
};

export function renderPartnerMyCode(container) {
  const db = getDB();
  const partner = Array.isArray(db.partners) && db.partners.length ? db.partners[0] : null;
  if (!partner) {
    const card = createCard('Mis códigos');
    card.appendChild(document.createTextNode('No se encontró un partner configurado.'));
    container.appendChild(card);
    return;
  }

  const codes = Array.isArray(db.codes)
    ? db.codes.filter((code) => (code.partnerId ?? code.partner_id) === partner.id)
    : [];
  const grouped = groupCodes(codes);
  const affiliates = Array.isArray(db.affiliates)
    ? db.affiliates.filter((affiliate) => affiliate.partnerId === partner.id)
    : [];

  container.appendChild(
    createCard(
      'Mis códigos',
      'Consulta el código maestro PT y los afiliados asociados sin mostrar información personal de usuarios finales.',
    ),
  );

  container.appendChild(renderCodeList('Código PT', grouped.pt));
  container.appendChild(renderCodeList('Códigos AF', grouped.af));
  container.appendChild(renderAffiliates(affiliates, codes));
}
