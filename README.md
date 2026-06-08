# SafeHarvest AI - MVP

MVP de uma aplicação para estimar risco de contaminação alimentar em áreas agrícolas usando dados climáticos públicos da Open-Meteo.

## O que a aplicação faz

- Consulta a API pública da Open-Meteo em tempo real
- Busca temperatura, umidade e precipitação
- Calcula chuva acumulada dos últimos 7 dias
- Estima NDVI e turbidez para simular indicadores de satélite
- Calcula um score de risco de 0 a 100
- Mostra dashboard, alertas, fatores de risco, tabela e mapa visual

## Observação importante

A Open-Meteo fornece dados meteorológicos, não imagens de satélite nem NDVI real.

Neste MVP:
- Temperatura, umidade e chuva vêm da Open-Meteo
- NDVI e turbidez são estimados/simulados
- Em produção, NDVI poderia vir de Sentinel-2/Sentinel Hub
- Turbidez poderia vir de imagens orbitais ou sensores de qualidade da água

## Requisitos

- Node.js 18 ou superior

## Como rodar

Instale as dependências:

```bash
npm install
```

Inicie o projeto:

```bash
npm start
```

Acesse no navegador:

```bash
http://localhost:3000
```

## Endpoints

### Health check

```http
GET /api/health
```

### Listar regiões com risco

```http
GET /api/regions
```

### Buscar região específica

```http
GET /api/regions/1
```

### Dashboard resumido

```http
GET /api/dashboard
```

## API pública usada

Open-Meteo Forecast API:

```http
https://api.open-meteo.com/v1/forecast
```

Exemplo de variáveis usadas:

```text
current=temperature_2m,relative_humidity_2m,precipitation,rain
hourly=precipitation
past_days=7
forecast_days=1
timezone=America/Sao_Paulo
```

## Ideia para apresentar no pitch

"Na versão acadêmica, usamos dados meteorológicos reais da Open-Meteo e simulamos os indicadores orbitais. Em uma versão produtiva, o sistema seria integrado ao Sentinel-2 para calcular NDVI real e analisar corpos d'água por imagens de satélite."
