const totalAreas = document.getElementById('totalAreas');
const highRisk = document.getElementById('highRisk');
const mediumRisk = document.getElementById('mediumRisk');
const lowRisk = document.getElementById('lowRisk');
const gaugeValue = document.getElementById('gaugeValue');
const gaugeText = document.getElementById('gaugeText');
const regionsTable = document.getElementById('regionsTable');
const alerts = document.getElementById('alerts');
const factors = document.getElementById('factors');
const riskMap = document.getElementById('riskMap');
const reloadButton = document.getElementById('reloadButton');

const markerPositions = {
  1: { left: '48%', top: '62%' },
  2: { left: '54%', top: '70%' },
  3: { left: '50%', top: '74%' },
  4: { left: '45%', top: '76%' },
  5: { left: '40%', top: '45%' },
  6: { left: '32%', top: '30%' }
};

function formatNumber(value, digits = 0) {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function riskClass(level) {
  return `risk-${level}`;
}

function renderSummary(regions) {
  const total = regions.length;
  const high = regions.filter(region => region.riskLevel === 'Alto').length;
  const medium = regions.filter(region => region.riskLevel === 'Médio').length;
  const low = regions.filter(region => region.riskLevel === 'Baixo').length;
  const average = Math.round(regions.reduce((sum, region) => sum + region.riskScore, 0) / total);

  totalAreas.textContent = total;
  highRisk.textContent = high;
  mediumRisk.textContent = medium;
  lowRisk.textContent = low;
  gaugeValue.textContent = average;

  gaugeText.textContent = average >= 70
    ? 'Risco geral alto'
    : average >= 40
      ? 'Risco geral médio'
      : 'Risco geral baixo';
}

function renderFactors(regions) {
  const avg = (field) => regions.reduce((sum, region) => sum + Number(region[field]), 0) / regions.length;

  const items = [
    { label: 'Temperatura média', value: avg('temperature'), suffix: '°C', percent: Math.min(avg('temperature') / 40 * 100, 100) },
    { label: 'Umidade média', value: avg('humidity'), suffix: '%', percent: avg('humidity') },
    { label: 'Chuva acumulada 7d', value: avg('rain7d'), suffix: 'mm', percent: Math.min(avg('rain7d') / 120 * 100, 100) },
    { label: 'Turbidez estimada', value: avg('turbidity'), suffix: '', percent: avg('turbidity') * 100 },
    { label: 'NDVI estimado', value: avg('ndvi'), suffix: '', percent: avg('ndvi') * 100 }
  ];

  factors.innerHTML = items.map(item => `
    <div class="factor-line">
      <header>
        <span>${item.label}</span>
        <strong>${formatNumber(item.value, item.suffix ? 1 : 2)}${item.suffix}</strong>
      </header>
      <div class="bar"><i style="width:${item.percent}%"></i></div>
    </div>
  `).join('');
}

function renderMap(regions) {
  riskMap.innerHTML = regions.map(region => {
    const position = markerPositions[region.id] || { left: '50%', top: '50%' };
    return `
      <div
        class="marker ${riskClass(region.riskLevel)}"
        style="left:${position.left}; top:${position.top};"
        data-label="${region.city}: ${region.riskScore}/100">
      </div>
    `;
  }).join('');
}

function renderAlerts(regions) {
  const alertRegions = regions
    .filter(region => region.riskLevel !== 'Baixo')
    .slice(0, 5);

  if (!alertRegions.length) {
    alerts.innerHTML = `
      <div class="alert">
        <strong>Nenhum alerta crítico</strong>
        <span>Todas as regiões estão em condição estável no momento.</span>
      </div>
    `;
    return;
  }

  alerts.innerHTML = alertRegions.map(region => `
    <div class="alert">
      <strong>${region.riskLevel === 'Alto' ? '🚨' : '⚠️'} Risco ${region.riskLevel} em ${region.city} - ${region.state}</strong>
      <span>
        Temp. ${formatNumber(region.temperature, 1)}°C,
        umidade ${formatNumber(region.humidity)}%,
        chuva 7d ${formatNumber(region.rain7d, 1)}mm.
      </span>
    </div>
  `).join('');
}

function renderTable(regions) {
  regionsTable.innerHTML = regions.map(region => `
    <tr>
      <td><strong>${region.city} - ${region.state}</strong></td>
      <td>${region.crop}</td>
      <td>${formatNumber(region.temperature, 1)}°C</td>
      <td>${formatNumber(region.humidity)}%</td>
      <td>${formatNumber(region.rain7d, 1)}mm</td>
      <td>${formatNumber(region.ndvi, 2)}</td>
      <td>${formatNumber(region.turbidity, 2)}</td>
      <td>
        <span class="badge">
          <i class="dot ${region.riskLevel === 'Alto' ? 'high' : region.riskLevel === 'Médio' ? 'medium' : 'low'}"></i>
          ${region.riskLevel} · ${region.riskScore}/100
        </span>
      </td>
    </tr>
  `).join('');
}

async function loadData() {
  reloadButton.disabled = true;
  reloadButton.textContent = 'Atualizando...';

  try {
    const response = await fetch('/api/regions');

    if (!response.ok) {
      throw new Error('Erro ao carregar dados da API');
    }

    const regions = await response.json();

    renderSummary(regions);
    renderFactors(regions);
    renderMap(regions);
    renderAlerts(regions);
    renderTable(regions);
  } catch (error) {
    alerts.innerHTML = `
      <div class="alert">
        <strong>Erro ao carregar dados</strong>
        <span>${error.message}</span>
      </div>
    `;
  } finally {
    reloadButton.disabled = false;
    reloadButton.textContent = 'Atualizar dados';
  }
}

reloadButton.addEventListener('click', loadData);
loadData();
