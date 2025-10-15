import { getDB } from '../../db.js';
import { summaryForPartner } from '../../biz/summaries.js';
import { renderKpiCards } from '../../../components/kpiCards.js';
import { drawLine } from '../../../components/charts.js';

const formatMonthLabel = (month) => {
  if (!month || month === 'unknown') {
    return 'Sin dato';
  }
  const [year, monthPart] = month.split('-');
  const date = new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1));
  return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
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

export function renderPartnerDashboard(container) {
  const db = getDB();
  const partner = Array.isArray(db.partners) && db.partners.length ? db.partners[0] : null;
  if (!partner) {
    const card = createCard('Dashboard de partner');
    card.appendChild(document.createTextNode('No se encontró un partner configurado.'));
    container.appendChild(card);
    return;
  }

  const summary = summaryForPartner(partner.id, db);

  const intro = createCard(
    `Hola ${partner.shortName ?? partner.name ?? partner.id}`,
    'Resumen de usuarios directos y afiliados, además de los pagos acumulados.',
  );
  container.appendChild(intro);

  const kpiCard = createCard();
  const kpiWrapper = document.createElement('div');
  renderKpiCards(kpiWrapper, [
    { label: 'Usuarios directos', value: summary.totals.users.direct },
    { label: 'Usuarios afiliados', value: summary.totals.users.affiliates },
    { label: 'Payout total', value: summary.totals.payouts.overall.total, prefix: '$' },
  ]);
  kpiCard.appendChild(kpiWrapper);
  container.appendChild(kpiCard);

  const breakdownCard = createCard('Distribución de payouts');
  const list = document.createElement('ul');
  list.className = 'summary-list';
  list.innerHTML = `
    <li><span>Directo</span><strong>$${summary.totals.payouts.direct.total.toLocaleString('es-MX')}</strong></li>
    <li><span>Afiliados</span><strong>$${summary.totals.payouts.fromAffiliates.total.toLocaleString('es-MX')}</strong></li>
    <li><span>Total</span><strong>$${summary.totals.payouts.overall.total.toLocaleString('es-MX')}</strong></li>
  `;
  breakdownCard.appendChild(list);
  container.appendChild(breakdownCard);

  const chartCard = createCard('Usuarios por mes');
  const canvas = document.createElement('canvas');
  canvas.height = 280;
  chartCard.appendChild(canvas);
  container.appendChild(chartCard);

  const series = summary.monthlySeries.slice(-12).map((item) => ({
    label: formatMonthLabel(item.month),
    value: item.users.total,
  }));
  drawLine(canvas, series);
}
