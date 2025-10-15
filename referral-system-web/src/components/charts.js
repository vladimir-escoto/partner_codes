const DEFAULT_BAR_SERIES = [
  { label: 'Q1', value: 12 },
  { label: 'Q2', value: 18 },
  { label: 'Q3', value: 9 },
  { label: 'Q4', value: 15 }
];

const DEFAULT_LINE_SERIES = [
  { label: 'Ene', value: 5 },
  { label: 'Feb', value: 7 },
  { label: 'Mar', value: 6 },
  { label: 'Abr', value: 9 },
  { label: 'May', value: 11 },
  { label: 'Jun', value: 10 }
];

const DEFAULT_HEATMAP_SERIES = [
  [12, 18, 9, 15],
  [8, 5, 13, 7],
  [16, 11, 6, 10]
];

function normalizeSeries(series, fallback) {
  if (!Array.isArray(series) || !series.length) {
    return fallback;
  }
  return series;
}

function normalizeXYSeries(series, fallback) {
  const normalized = normalizeSeries(series, fallback);
  return normalized.map((item, index) => {
    if (typeof item === 'number') {
      return { label: `Serie ${index + 1}`, value: item };
    }
    return {
      label: item.label ?? `Serie ${index + 1}`,
      value: Number(item.value ?? 0)
    };
  });
}

function getCanvas(elementOrSelector) {
  const canvas = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Se requiere un elemento <canvas> válido para dibujar el gráfico.');
  }
  return canvas;
}

function prepareCanvas(canvas) {
  const target = getCanvas(canvas);
  const ctx = target.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = target.clientWidth || target.width || 320;
  const height = target.clientHeight || target.height || 200;

  if (target.width !== width * ratio) {
    target.width = width * ratio;
  }
  if (target.height !== height * ratio) {
    target.height = height * ratio;
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#1f2937';
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1;

  return { ctx, width, height };
}

export function drawBar(canvas, series) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const data = normalizeXYSeries(series, DEFAULT_BAR_SERIES);
  const padding = 32;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const barWidth = chartWidth / data.length;
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding / 2, height - padding);
  ctx.stroke();

  data.forEach((item, index) => {
    const x = padding + barWidth * index + barWidth * 0.1;
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = height - padding - barHeight;

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x, y, barWidth * 0.8, barHeight);

    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x + barWidth * 0.4, height - padding + 14);

    ctx.fillText(item.value.toString(), x + barWidth * 0.4, y - 6);
  });
}

export function drawLine(canvas, series) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const data = normalizeXYSeries(series, DEFAULT_LINE_SERIES);
  const padding = 32;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const step = chartWidth / (data.length - 1 || 1);

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding / 2, height - padding);
  ctx.stroke();

  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((item, index) => {
    const x = padding + step * index;
    const y = height - padding - (item.value / maxValue) * chartHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = '#16a34a';
  data.forEach((item, index) => {
    const x = padding + step * index;
    const y = height - padding - (item.value / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, x, height - padding + 14);
    ctx.fillText(item.value.toString(), x, y - 8);
    ctx.fillStyle = '#16a34a';
  });
}

function flattenHeatmapData(matrix) {
  return matrix.reduce((values, row) => values.concat(row), []);
}

function interpolateColor(value, min, max) {
  const ratio = max === min ? 0.5 : (value - min) / (max - min);
  const start = [219, 234, 254];
  const end = [30, 64, 175];
  const channel = (index) => Math.round(start[index] + (end[index] - start[index]) * ratio);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

export function drawHeatMap(canvas, series) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const matrix = normalizeSeries(series, DEFAULT_HEATMAP_SERIES);

  const rows = matrix.length;
  const cols = matrix[0]?.length || 1;
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const cellWidth = chartWidth / cols;
  const cellHeight = chartHeight / rows;

  const values = flattenHeatmapData(matrix);
  const min = Math.min(...values);
  const max = Math.max(...values);

  matrix.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const x = padding + colIndex * cellWidth;
      const y = padding + rowIndex * cellHeight;
      ctx.fillStyle = interpolateColor(value, min, max);
      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.strokeStyle = '#f9fafb';
      ctx.strokeRect(x, y, cellWidth, cellHeight);

      ctx.fillStyle = value > (min + max) / 2 ? '#f9fafb' : '#1f2937';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), x + cellWidth / 2, y + cellHeight / 2);
    });
  });
}

