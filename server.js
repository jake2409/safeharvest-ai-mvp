const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const team = ['Gabriel Xavier', 'Integrante 2', 'Integrante 3', 'Integrante 4'];

const regions = [
  { id: 1, city: 'Ribeirão Preto', state: 'SP', latitude: -21.1775, longitude: -47.8103, crop: 'Cana-de-açúcar' },
  { id: 2, city: 'Campinas', state: 'SP', latitude: -22.9056, longitude: -47.0608, crop: 'Hortaliças' },
  { id: 3, city: 'Piracicaba', state: 'SP', latitude: -22.7253, longitude: -47.6492, crop: 'Cana e frutas' },
  { id: 4, city: 'São Carlos', state: 'SP', latitude: -22.0087, longitude: -47.8909, crop: 'Grãos' },
  { id: 5, city: 'Goiânia', state: 'GO', latitude: -16.6869, longitude: -49.2648, crop: 'Hortifrúti' },
  { id: 6, city: 'Sorriso', state: 'MT', latitude: -12.5425, longitude: -55.7211, crop: 'Soja e milho' }
];

function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function riskLevel(score) { if (score >= 70) return 'Alto'; if (score >= 40) return 'Médio'; return 'Baixo'; }
function riskColor(level) { if (level === 'Alto') return '#ef4444'; if (level === 'Médio') return '#f59e0b'; return '#22c55e'; }

function estimateNdvi(temperature, humidity, rain7d) {
  let ndvi = 0.72;
  if (temperature > 32) ndvi -= 0.12;
  if (temperature > 36) ndvi -= 0.10;
  if (humidity < 45) ndvi -= 0.12;
  if (rain7d < 10) ndvi -= 0.08;
  if (rain7d > 80) ndvi -= 0.10;
  return Number(clamp(ndvi, 0.18, 0.86).toFixed(2));
}

function estimateTurbidity(rain7d, precipitationNow) {
  let turbidity = 0.18;
  if (rain7d > 30) turbidity += 0.18;
  if (rain7d > 60) turbidity += 0.20;
  if (rain7d > 100) turbidity += 0.18;
  if (precipitationNow > 2) turbidity += 0.10;
  return Number(clamp(turbidity, 0.05, 0.95).toFixed(2));
}

function calculateRisk({ temperature, humidity, rain7d, ndvi, turbidity }) {
  let score = 0;
  if (temperature >= 30) score += 25;
  if (temperature >= 34) score += 10;
  if (humidity >= 75) score += 20;
  if (humidity >= 88) score += 5;
  if (rain7d >= 40) score += 15;
  if (rain7d >= 80) score += 10;
  if (turbidity >= 0.55) score += 20;
  if (ndvi <= 0.40) score += 15;
  return clamp(score, 0, 100);
}

async function fetchOpenMeteo(region) {
  const params = new URLSearchParams({
    latitude: region.latitude,
    longitude: region.longitude,
    current: 'temperature_2m,relative_humidity_2m,precipitation,rain',
    hourly: 'precipitation',
    past_days: '7',
    forecast_days: '1',
    timezone: 'America/Sao_Paulo'
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error(`Erro ao consultar Open-Meteo: ${response.status}`);
  return response.json();
}

async function buildRegionRisk(region) {
  const data = await fetchOpenMeteo(region);
  const current = data.current || {};
  const hourlyPrecipitation = data.hourly?.precipitation || [];
  const temperature = Number(current.temperature_2m ?? 0);
  const humidity = Number(current.relative_humidity_2m ?? 0);
  const precipitationNow = Number(current.precipitation ?? current.rain ?? 0);
  const rain7d = Number(hourlyPrecipitation.reduce((total, value) => total + Number(value || 0), 0).toFixed(1));
  const ndvi = estimateNdvi(temperature, humidity, rain7d);
  const turbidity = estimateTurbidity(rain7d, precipitationNow);
  const riskScore = calculateRisk({ temperature, humidity, rain7d, ndvi, turbidity });
  const level = riskLevel(riskScore);
  return { ...region, temperature, humidity, precipitationNow, rain7d, ndvi, turbidity, riskScore, riskLevel: level, riskColor: riskColor(level), updatedAt: current.time || new Date().toISOString(), source: 'Open-Meteo' };
}

app.get('/api/product', (req, res) => {
  res.json({
    name: 'SafeHarvest AI',
    purpose: 'Prever áreas agrícolas com risco de contaminação alimentar usando dados climáticos, sensoriamento remoto e inteligência artificial.',
    team,
    ods: [
      { number: 2, name: 'Fome Zero e Agricultura Sustentável', connection: 'Apoia a produção agrícola segura e reduz perdas na cadeia alimentar.' },
      { number: 3, name: 'Saúde e Bem-Estar', connection: 'Ajuda a prevenir doenças transmitidas por alimentos contaminados.' },
      { number: 12, name: 'Consumo e Produção Responsáveis', connection: 'Contribui para uma cadeia produtiva mais rastreável, preventiva e eficiente.' }
    ],
    spaceProblem: 'Uso de dados orbitais e ambientais para monitorar grandes áreas agrícolas, identificar risco de enchentes, estresse da vegetação e condições favoráveis à contaminação antes que alimentos contaminados cheguem ao consumidor.'
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'SafeHarvest AI MVP', environment: process.env.NODE_ENV || 'local' }));

app.get('/api/regions', async (req, res) => {
  try { const result = await Promise.all(regions.map(buildRegionRisk)); res.json(result.sort((a, b) => b.riskScore - a.riskScore)); }
  catch (error) { res.status(500).json({ message: 'Não foi possível buscar os dados climáticos.', error: error.message }); }
});

app.get('/api/regions/:id', async (req, res) => {
  try {
    const region = regions.find(item => item.id === Number(req.params.id));
    if (!region) return res.status(404).json({ message: 'Região não encontrada.' });
    res.json(await buildRegionRisk(region));
  } catch (error) { res.status(500).json({ message: 'Não foi possível buscar os dados da região.', error: error.message }); }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const result = await Promise.all(regions.map(buildRegionRisk));
    const summary = result.reduce((acc, region) => { acc.total += 1; acc[region.riskLevel.toLowerCase()] += 1; acc.averageRisk += region.riskScore; return acc; }, { total: 0, alto: 0, médio: 0, baixo: 0, averageRisk: 0 });
    summary.averageRisk = Math.round(summary.averageRisk / summary.total);
    res.json({ ...summary, lastUpdate: new Date().toISOString(), criticalRegions: result.filter(region => region.riskLevel === 'Alto').map(region => `${region.city} - ${region.state}`) });
  } catch (error) { res.status(500).json({ message: 'Não foi possível gerar o dashboard.', error: error.message }); }
});

app.listen(port, () => console.log(`SafeHarvest AI rodando em http://localhost:${port}`));
