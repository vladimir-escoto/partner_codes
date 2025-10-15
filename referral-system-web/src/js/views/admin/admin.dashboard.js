import { getDB } from '../../db.js';
import { metricsGlobal } from '../../biz/summaries.js';
import { renderKpiCards } from '../../../components/kpiCards.js';
import { drawBar, drawLine, drawHeatMap } from '../../../components/charts.js';
import { monthKey } from '../../../utils/dates.js';

const formatMonthLabel = (month) => {
  if (!month || month === 'unknown') {
    return 'Sin dato';
  }
  const [year, monthPart] = month.split('-');
  const date = new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1));
  return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
};

const createCard = (title) => {
  const card = document.createElement('article');
  card.className = 'card';

  if (title) {
    const heading = document.createElement('h2');
    heading.textContent = title;
    card.appendChild(heading);
  }

  return card;
};

const buildHeatmapMatrix = (users, months) => {
  const regionMap = new Map();
  users.forEach((user) => {
    const region = typeof user?.region === 'string' && user.region.trim() ? user.region.trim() : 'Unknown';
    if (!regionMap.has(region)) {
      regionMap.set(region, new Map());
    }
    const month = monthKey(user?.createdAt ?? user?.created_at ?? user?.joinedAt ?? new Date());
    const monthBucket = regionMap.get(region);
    monthBucket.set(month, (monthBucket.get(month) ?? 0) + 1);
  });

  const topRegions = Array.from(regionMap.entries())
    .map(([region, bucket]) => ({
      region,
      total: Array.from(bucket.values()).reduce((acc, value) => acc + value, 0),
      bucket,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const matrix = topRegions.map(({ bucket }) => months.map((month) => bucket.get(month) ?? 0));
  const labels = topRegions.map((item) => item.region);

  return { matrix, labels };
};

export function renderAdminDashboard(container) {
  const db = getDB();
  const metrics = metricsGlobal(db);

  const intro = document.createElement('header');
  intro.className = 'card';
  intro.innerHTML = `
    <h1>Dashboard administrativo</h1>
    <p>Resumen global del ecosistema de referidos, actividad por aplicaciones y distribución regional.</p>
  `;
  container.appendChild(intro);

  const kpiCard = createCard('Indicadores principales');
  const kpiContainer = document.createElement('div');
  renderKpiCards(kpiContainer, [
    { label: 'Usuarios totales', value: metrics.totals.users },
    { label: 'Payout partners', value: metrics.totals.payout.partner, prefix: '$' },
    { label: 'Payout afiliados', value: metrics.totals.payout.affiliate, prefix: '$' },
    { label: 'Partners / Afiliados', value: `${metrics.partnersCount} / ${metrics.affiliatesCount}` },
  ]);
  kpiCard.appendChild(kpiContainer);
  container.appendChild(kpiCard);

  const chartsGrid = document.createElement('div');
  chartsGrid.className = 'grid grid--two';

  const appsCard = createCard('Usuarios por aplicación');
  const appsCanvas = document.createElement('canvas');
  appsCanvas.height = 240;
  appsCard.appendChild(appsCanvas);
  chartsGrid.appendChild(appsCard);

  const monthsCard = createCard('Serie mensual de usuarios');
  const monthsCanvas = document.createElement('canvas');
  monthsCanvas.height = 240;
  monthsCard.appendChild(monthsCanvas);
  chartsGrid.appendChild(monthsCard);

  container.appendChild(chartsGrid);

  const heatmapCard = createCard('Actividad por región (últimos meses)');
  const heatmapCanvas = document.createElement('canvas');
  heatmapCanvas.height = 280;
  heatmapCard.appendChild(heatmapCanvas);

  const heatmapLegend = document.createElement('p');
  heatmapLegend.className = 'card__legend';
  heatmapCard.appendChild(heatmapLegend);
  container.appendChild(heatmapCard);

  const appSeries = metrics.byApp.map((item) => ({ label: item.name ?? item.id, value: item.users }));
  drawBar(appsCanvas, appSeries);

  const recentMonths = metrics.byMonth.slice(-12);
  const monthlySeries = recentMonths.map((item) => ({
    label: formatMonthLabel(item.month),
    value: item.users,
  }));
  drawLine(monthsCanvas, monthlySeries);

  const monthsKeys = recentMonths.map((item) => item.month ?? 'unknown');
  const { matrix, labels } = buildHeatmapMatrix(db.users ?? [], monthsKeys);
  drawHeatMap(heatmapCanvas, matrix);
  if (labels.length) {
    heatmapLegend.textContent = `Filas: ${labels.join(' · ')} | Columnas: ${monthlySeries
      .map((item) => item.label)
      .join(' · ')}`;
  } else {
    heatmapLegend.textContent = 'Sin datos suficientes para la distribución regional.';
  }
}
