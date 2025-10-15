import { getDB } from '../../db.js';
import { metricsGlobal } from '../../biz/summaries.js';
import { drawBar, drawLine } from '../../../components/charts.js';

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

const formatMonthLabel = (month) => {
  if (!month || month === 'unknown') {
    return 'Sin dato';
  }
  const [year, monthPart] = month.split('-');
  const date = new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1));
  return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
};

const countByType = (users) => {
  const buckets = new Map();
  users.forEach((user) => {
    const type = typeof user?.type === 'string' && user.type.trim() ? user.type.trim() : 'Sin clasificar';
    buckets.set(type, (buckets.get(type) ?? 0) + 1);
  });
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
};

export function renderAdminReports(container) {
  const db = getDB();
  const metrics = metricsGlobal(db);

  const intro = createCard(
    'Reportes del sistema',
    'Visualización de cuentas por tipo y región, además de la evolución mensual de usuarios.',
  );
  container.appendChild(intro);

  const chartsGrid = document.createElement('div');
  chartsGrid.className = 'grid grid--two';

  const typeCard = createCard('Usuarios por tipo de cuenta');
  const typeCanvas = document.createElement('canvas');
  typeCanvas.height = 260;
  typeCard.appendChild(typeCanvas);
  chartsGrid.appendChild(typeCard);

  const regionCard = createCard('Usuarios por región');
  const regionCanvas = document.createElement('canvas');
  regionCanvas.height = 260;
  regionCard.appendChild(regionCanvas);
  chartsGrid.appendChild(regionCard);

  container.appendChild(chartsGrid);

  const monthlyCard = createCard('Serie mensual consolidada');
  const monthlyCanvas = document.createElement('canvas');
  monthlyCanvas.height = 280;
  monthlyCard.appendChild(monthlyCanvas);
  container.appendChild(monthlyCard);

  drawBar(typeCanvas, countByType(db.users ?? []));
  drawBar(
    regionCanvas,
    metrics.byRegion.map((item) => ({ label: item.region, value: item.users })),
  );

  const series = metrics.byMonth.slice(-12).map((item) => ({
    label: formatMonthLabel(item.month),
    value: item.users,
  }));
  drawLine(monthlyCanvas, series);
}
