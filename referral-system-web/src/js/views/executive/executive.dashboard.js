import { getDB } from '../../db.js';
import { listInvoices } from '../../biz/invoices.js';
import { metricsGlobal } from '../../biz/summaries.js';
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

export function renderExecutiveDashboard(container) {
  const db = getDB();
  const invoices = listInvoices({}, db);
  const metrics = metricsGlobal(db);

  const totals = invoices.reduce(
    (acc, invoice) => {
      const amount = Number(invoice.amount ?? 0);
      const status = typeof invoice.status === 'string' ? invoice.status.toLowerCase() : '';
      if (status === 'paid') {
        acc.paid += amount;
      } else {
        acc.toPay += amount;
      }
      const partnerId = invoice.partner_id ?? invoice.partnerId ?? invoice.partner;
      if (partnerId) {
        acc.partners.add(partnerId);
      }
      return acc;
    },
    { toPay: 0, paid: 0, partners: new Set() },
  );

  const intro = document.createElement('article');
  intro.className = 'card';
  intro.innerHTML = `
    <h1>Dashboard financiero ejecutivo</h1>
    <p>Visión consolidada de pagos pendientes, cumplidos y crecimiento mensual de usuarios.</p>
  `;
  container.appendChild(intro);

  const kpiCard = document.createElement('section');
  kpiCard.className = 'card';
  const kpiWrapper = document.createElement('div');
  renderKpiCards(kpiWrapper, [
    { label: 'Por pagar', value: totals.toPay, prefix: '$' },
    { label: 'Pagado', value: totals.paid, prefix: '$' },
    { label: 'Partners activos', value: totals.partners.size },
  ]);
  kpiCard.appendChild(kpiWrapper);
  container.appendChild(kpiCard);

  const chartCard = document.createElement('section');
  chartCard.className = 'card';
  chartCard.innerHTML = '<h2>Usuarios activos por mes</h2>';
  const canvas = document.createElement('canvas');
  canvas.height = 280;
  chartCard.appendChild(canvas);
  container.appendChild(chartCard);

  const monthlySeries = metrics.byMonth.slice(-12).map((item) => ({
    label: formatMonthLabel(item.month),
    value: item.users,
  }));
  drawLine(canvas, monthlySeries);
}
