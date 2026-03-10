// ============================================================
// Configuration
// ============================================================
const API = {
    forecast: 'https://api.open-meteo.com/v1/forecast',
    ensemble: 'https://ensemble-api.open-meteo.com/v1/ensemble',
    geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
};

const WEATHER_ICONS = {
    0: '\u2600\uFE0F', 1: '\uD83C\uDF24\uFE0F', 2: '\u26C5', 3: '\u2601\uFE0F',
    45: '\uD83C\uDF2B\uFE0F', 48: '\uD83C\uDF2B\uFE0F',
    51: '\uD83C\uDF26\uFE0F', 53: '\uD83C\uDF26\uFE0F', 55: '\uD83C\uDF27\uFE0F',
    56: '\uD83C\uDF27\uFE0F', 57: '\uD83C\uDF27\uFE0F',
    61: '\uD83C\uDF26\uFE0F', 63: '\uD83C\uDF27\uFE0F', 65: '\uD83C\uDF27\uFE0F',
    66: '\uD83C\uDF28\uFE0F', 67: '\uD83C\uDF28\uFE0F',
    71: '\uD83C\uDF28\uFE0F', 73: '\u2744\uFE0F', 75: '\u2744\uFE0F',
    77: '\u2744\uFE0F',
    80: '\uD83C\uDF26\uFE0F', 81: '\uD83C\uDF27\uFE0F', 82: '\u26C8\uFE0F',
    85: '\uD83C\uDF28\uFE0F', 86: '\uD83C\uDF28\uFE0F',
    95: '\u26C8\uFE0F', 96: '\u26C8\uFE0F', 99: '\u26C8\uFE0F',
};

const WEATHER_DESC = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    56: 'Freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Heavy freezing rain',
    71: 'Light snowfall', 73: 'Snowfall', 75: 'Heavy snowfall',
    77: 'Snow grains',
    80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
    85: 'Light snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CONF_TEMP_REF = 4.0;
const CONF_PRECIP_REF = 3.0;
const CONF_TEMP_WEIGHT = 0.6;
const CONF_PRECIP_WEIGHT = 0.4;

// ============================================================
// State
// ============================================================
let chart = null;
let searchTimeout = null;
let radarMap = null;
let radarLayer = null;
let radarFrames = [];
let radarIdx = 0;
let radarPlaying = false;
let radarInterval = null;
let currentLat = 46.2044;
let currentLon = 6.1432;

const $ = (s) => document.querySelector(s);

// ============================================================
// API Functions
// ============================================================
async function fetchForecast(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset',
        timezone: 'auto',
        forecast_days: 7,
    });
    const res = await fetch(`${API.forecast}?${params}`);
    if (!res.ok) throw new Error('Forecast API error');
    return res.json();
}

async function fetchEnsemble(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        hourly: 'temperature_2m,precipitation',
        models: 'icon_seamless',
        forecast_days: 7,
        timezone: 'auto',
    });
    const res = await fetch(`${API.ensemble}?${params}`);
    if (!res.ok) throw new Error('Ensemble API error');
    return res.json();
}

async function searchLocations(query) {
    if (!query || query.length < 2) return [];
    const params = new URLSearchParams({
        name: query, count: 5, language: 'en', format: 'json',
    });
    const res = await fetch(`${API.geocoding}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
}

function getGeolocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not available'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(err),
            { timeout: 10000, enableHighAccuracy: false }
        );
    });
}

// ============================================================
// Data Processing
// ============================================================
function extractMembers(hourlyData, variable) {
    const keys = Object.keys(hourlyData)
        .filter(k => k.startsWith(`${variable}_member`))
        .sort();
    return keys.map(k => hourlyData[k]);
}

function calcStats(members, times) {
    return times.map((time, t) => {
        const values = members.map(m => m[t]).filter(v => v != null);
        if (values.length === 0) return { time, mean: null, std: 0, min: null, max: null };
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
        return { time, mean, std, min: Math.min(...values), max: Math.max(...values) };
    });
}

function calcConfidence(tempStd, precipStd) {
    const tc = Math.exp(-Math.pow(tempStd / CONF_TEMP_REF, 2));
    const pc = Math.exp(-Math.pow(precipStd / CONF_PRECIP_REF, 2));
    return CONF_TEMP_WEIGHT * tc + CONF_PRECIP_WEIGHT * pc;
}

function calcRainProb(precipMembers, times, dayDate) {
    const indices = times
        .map((t, i) => t.startsWith(dayDate) ? i : -1)
        .filter(i => i >= 0);
    if (indices.length === 0 || precipMembers.length === 0) return 0;
    let wet = 0;
    for (const m of precipMembers) {
        if (indices.some(i => m[i] > 0.1)) wet++;
    }
    return Math.round((wet / precipMembers.length) * 100);
}

function processData(ensemble, forecast) {
    const times = ensemble.hourly.time;
    const tempMembers = extractMembers(ensemble.hourly, 'temperature_2m');
    const precipMembers = extractMembers(ensemble.hourly, 'precipitation');
    const tempStats = calcStats(tempMembers, times);
    const precipStats = calcStats(precipMembers, times);

    const hourlyConf = tempStats.map((ts, i) => ({
        time: ts.time,
        conf: calcConfidence(ts.std, precipStats[i].std) * 100,
    }));

    // Aggregate daily
    const daily = forecast.daily;
    const allTemps = [];
    const days = daily.time.map((dayDate, d) => {
        const dayConf = hourlyConf.filter(h => h.time.startsWith(dayDate));
        const avgConf = dayConf.length > 0
            ? dayConf.reduce((s, h) => s + h.conf, 0) / dayConf.length : 0;
        const tMax = Math.round(daily.temperature_2m_max[d]);
        const tMin = Math.round(daily.temperature_2m_min[d]);
        allTemps.push(tMax, tMin);
        return {
            date: dayDate,
            dayName: DAY_NAMES[new Date(dayDate + 'T12:00').getDay()],
            code: daily.weather_code[d],
            tMax, tMin,
            rain: calcRainProb(precipMembers, times, dayDate),
            confidence: Math.round(avgConf),
        };
    });

    const globalMin = Math.min(...allTemps);
    const globalMax = Math.max(...allTemps);
    days.forEach(d => {
        d.barLeft = ((d.tMin - globalMin) / (globalMax - globalMin || 1)) * 100;
        d.barWidth = ((d.tMax - d.tMin) / (globalMax - globalMin || 1)) * 100;
    });

    const next24 = hourlyConf.slice(0, 24);
    const currentConf = next24.reduce((s, h) => s + h.conf, 0) / (next24.length || 1);

    return { tempStats, precipStats, days, currentConf, memberCount: tempMembers.length };
}

function confLevel(c) {
    if (c >= 75) return { label: 'High forecast confidence', color: 'var(--conf-high)' };
    if (c >= 50) return { label: 'Moderate forecast confidence', color: 'var(--conf-mid)' };
    return { label: 'Low forecast confidence', color: 'var(--conf-low)' };
}

// ============================================================
// Rendering
// ============================================================
function renderCurrent(forecast) {
    const c = forecast.current;
    const code = c.weather_code;
    $('#current-weather').innerHTML = `
        <div class="current-icon">${WEATHER_ICONS[code] || '\uD83C\uDF21\uFE0F'}</div>
        <div class="current-temp">${Math.round(c.temperature_2m)}\u00B0</div>
        <div class="current-description">${WEATHER_DESC[code] || ''}</div>
        <div class="current-details">
            <span class="current-detail-item">\uD83C\uDF21\uFE0F Feels ${Math.round(c.apparent_temperature)}\u00B0</span>
            <span class="current-detail-item">\uD83D\uDCA7 ${c.relative_humidity_2m}%</span>
            <span class="current-detail-item">\uD83D\uDCA8 ${Math.round(c.wind_speed_10m)} km/h</span>
        </div>`;
}

function renderConfidence(confidence) {
    const cl = confLevel(confidence);
    const v = Math.round(confidence);
    $('#confidence-section').innerHTML = `
        <div class="confidence-header">
            <span class="confidence-title">Forecast Confidence (24h)</span>
            <span class="confidence-value" style="color:${cl.color}">${v}%</span>
        </div>
        <div class="confidence-bar-bg">
            <div class="confidence-bar" id="conf-bar" style="background:${cl.color}"></div>
        </div>
        <div class="confidence-label">${cl.label}</div>`;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            $('#conf-bar').style.width = v + '%';
        });
    });
}

function renderDaily(days) {
    const today = new Date().toISOString().split('T')[0];
    const cards = days.map((d, i) => {
        const cl = confLevel(d.confidence);
        const label = d.date === today ? 'Today' : d.dayName;
        const rainHtml = d.rain > 0
            ? `<span class="daily-rain">\uD83D\uDCA7${d.rain}%</span>`
            : `<span class="daily-rain"></span>`;
        return `
        <div class="daily-card">
            <span class="daily-day">${label}</span>
            <span class="daily-icon">${WEATHER_ICONS[d.code] || ''}</span>
            <span class="daily-temp-low">${d.tMin}\u00B0</span>
            <div class="daily-temp-bar">
                <div class="daily-temp-bar-fill" style="left:${d.barLeft}%;width:${d.barWidth}%"></div>
            </div>
            <span class="daily-temp-high">${d.tMax}\u00B0</span>
            ${rainHtml}
            <span class="daily-confidence" style="color:${cl.color}">${d.confidence}%</span>
        </div>`;
    }).join('');

    $('#daily-forecast').innerHTML = `
        <h2 class="section-title">7-Day Forecast</h2>
        <div class="daily-cards">${cards}</div>`;
}

function renderChart(tempStats) {
    const ctx = $('#ensemble-chart').getContext('2d');
    const n = Math.min(tempStats.length, 168);
    const data = tempStats.slice(0, n);

    const labels = data.map(d => {
        const dt = new Date(d.time);
        return dt.getHours() === 0
            ? DAY_NAMES[dt.getDay()] + ' ' + dt.getDate() + '.'
            : '';
    });

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Max',
                    data: data.map(d => d.max),
                    fill: { target: 4 },
                    backgroundColor: 'rgba(107,143,191,0.06)',
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: '+1\u03C3',
                    data: data.map(d => d.mean !== null ? d.mean + d.std : null),
                    fill: { target: 3 },
                    backgroundColor: 'rgba(107,143,191,0.13)',
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Mean',
                    data: data.map(d => d.mean),
                    fill: false,
                    borderColor: '#6B8FBF',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: '-1\u03C3',
                    data: data.map(d => d.mean !== null ? d.mean - d.std : null),
                    fill: false,
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Min',
                    data: data.map(d => d.min),
                    fill: false,
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(45,55,72,0.92)',
                    titleFont: { size: 12 },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    filter: (item) => item.datasetIndex === 2,
                    callbacks: {
                        title: (items) => {
                            const d = data[items[0].dataIndex];
                            const dt = new Date(d.time);
                            return `${DAY_NAMES_LONG[dt.getDay()]}, ${dt.getHours()}:00`;
                        },
                        label: (item) => {
                            const d = data[item.dataIndex];
                            return [
                                `Mean: ${d.mean.toFixed(1)}\u00B0C`,
                                `Spread: \u00B1${d.std.toFixed(1)}\u00B0C`,
                                `Range: ${d.min.toFixed(1)}\u00B0 \u2013 ${d.max.toFixed(1)}\u00B0C`,
                            ];
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7,
                        font: { size: 11 },
                        color: '#94A3B8',
                    },
                },
                y: {
                    grid: { color: 'rgba(226,232,240,0.5)' },
                    border: { display: false },
                    ticks: {
                        font: { size: 11 },
                        color: '#94A3B8',
                        callback: (v) => v + '\u00B0',
                    },
                },
            },
        },
    });
}

let precipChart = null;

function renderPrecipChart(precipStats) {
    const ctx = $('#precip-chart').getContext('2d');
    const n = Math.min(precipStats.length, 168);
    const data = precipStats.slice(0, n);

    const labels = data.map(d => {
        const dt = new Date(d.time);
        return dt.getHours() === 0
            ? DAY_NAMES[dt.getDay()] + ' ' + dt.getDate() + '.'
            : '';
    });

    if (precipChart) precipChart.destroy();

    precipChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Max',
                    data: data.map(d => d.max),
                    fill: { target: 4 },
                    backgroundColor: 'rgba(91,164,207,0.06)',
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: '+1\u03C3',
                    data: data.map(d => d.mean !== null ? d.mean + d.std : null),
                    fill: { target: 3 },
                    backgroundColor: 'rgba(91,164,207,0.13)',
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Mean',
                    data: data.map(d => d.mean),
                    fill: 'origin',
                    backgroundColor: 'rgba(91,164,207,0.18)',
                    borderColor: '#5BA4CF',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: '-1\u03C3',
                    data: data.map(d => d.mean !== null ? Math.max(0, d.mean - d.std) : null),
                    fill: false,
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Min',
                    data: data.map(d => d.min),
                    fill: false,
                    borderWidth: 0,
                    pointRadius: 0,
                    tension: 0.3,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(45,55,72,0.92)',
                    titleFont: { size: 12 },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    filter: (item) => item.datasetIndex === 2,
                    callbacks: {
                        title: (items) => {
                            const d = data[items[0].dataIndex];
                            const dt = new Date(d.time);
                            return `${DAY_NAMES_LONG[dt.getDay()]}, ${dt.getHours()}:00`;
                        },
                        label: (item) => {
                            const d = data[item.dataIndex];
                            return [
                                `Mean: ${d.mean.toFixed(1)} mm`,
                                `Spread: \u00B1${d.std.toFixed(1)} mm`,
                                `Range: ${d.min.toFixed(1)} \u2013 ${d.max.toFixed(1)} mm`,
                            ];
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7,
                        font: { size: 11 },
                        color: '#94A3B8',
                    },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226,232,240,0.5)' },
                    border: { display: false },
                    ticks: {
                        font: { size: 11 },
                        color: '#94A3B8',
                        callback: (v) => v + ' mm',
                    },
                },
            },
        },
    });
}

function renderExplanation(memberCount) {
    $('#explanation-section').innerHTML = `
        <div class="explanation-title">Understanding the Numbers</div>
        <div class="explanation-item">
            <strong>\uD83D\uDCA7 Rain Probability</strong> (e.g. 100%)<br>
            Percentage of the ${memberCount} ensemble members that predict measurable rain (&gt;0.1 mm)
            for that day. 100% means every single model run agrees it will rain \u2014 not how
            much, just that it will.
        </div>
        <div class="explanation-item">
            <strong>\uD83D\uDFE2 Forecast Confidence</strong> (e.g. 97%)<br>
            How closely the ${memberCount} ensemble members agree on the <em>details</em> \u2014 both
            temperature and precipitation amounts. Derived from ensemble spread:
            60% weight on temperature agreement, 40% on precipitation agreement.
            High confidence = stable, predictable atmosphere.
        </div>
        <div class="explanation-item">
            <strong>Example:</strong> \uD83D\uDCA7100% + \uD83D\uDFE2 97% means it will almost certainly rain,
            and the models agree very precisely on how much and when.
            \uD83D\uDCA7100% + \uD83D\uDFE2 50% would mean rain is certain, but the exact amounts are uncertain.
        </div>
        <div class="explanation-item" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
            <strong>Methodology</strong><br>
            Confidence is derived from ${memberCount} ensemble members of the ICON model (DWD).
            Each member starts with slightly perturbed initial conditions.
            Low spread (\u03C3) = stable weather pattern = high confidence.
            Formula: exp(\u2212(\u03C3/\u03C3\u2080)\u00B2) \u2014 a physically motivated measure.
        </div>`;
}

// ============================================================
// Precipitation Radar (RainViewer)
// ============================================================
async function initRadar(lat, lon) {
    try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) return;
        const data = await res.json();

        radarFrames = [...(data.radar?.past || []), ...(data.radar?.nowcast || [])];
        if (radarFrames.length === 0) return;

        $('#radar-section').classList.remove('hidden');

        // Init map if not yet created
        if (!radarMap) {
            radarMap = L.map('radar-map', {
                zoomControl: false,
                attributionControl: false,
                minZoom: 3,
                maxZoom: 12,
            }).setView([lat, lon], 6);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
            }).addTo(radarMap);

            L.control.zoom({ position: 'topright' }).addTo(radarMap);
        } else {
            radarMap.setView([lat, lon], 6);
        }

        // Stop animation if playing
        if (radarPlaying) {
            radarPlaying = false;
            clearInterval(radarInterval);
            const icon = $('#play-icon');
            icon.setAttribute('points', '6,4 20,12 6,20');
            const pause = $('#pause-icon');
            if (pause) pause.remove();
        }

        // Remove current radar layer
        if (radarLayer) {
            radarMap.removeLayer(radarLayer);
            radarLayer = null;
        }

        // Setup slider
        const slider = $('#radar-slider');
        slider.max = radarFrames.length - 1;
        slider.value = radarFrames.length - 1;
        radarIdx = radarFrames.length - 1;

        showRadarFrame(radarIdx);

        // Only bind events once
        if (!slider.dataset.bound) {
            slider.dataset.bound = '1';
            slider.addEventListener('input', (e) => {
                radarIdx = parseInt(e.target.value);
                showRadarFrame(radarIdx);
            });
            $('#radar-play').addEventListener('click', toggleRadarPlay);
        }

        // Fix map rendering after container becomes visible
        setTimeout(() => radarMap.invalidateSize(), 100);
    } catch (err) {
        console.error('Radar error:', err);
    }
}

function showRadarFrame(idx) {
    const frame = radarFrames[idx];
    if (!frame || !radarMap) return;

    if (radarLayer) radarMap.removeLayer(radarLayer);

    radarLayer = L.tileLayer(
        `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
        { opacity: 0.7, zIndex: 400, tileSize: 256, maxNativeZoom: 7 }
    );
    radarLayer.addTo(radarMap);

    const ts = frame.time;
    if (ts) {
        const dt = new Date(ts * 1000);
        const h = dt.getHours().toString().padStart(2, '0');
        const m = dt.getMinutes().toString().padStart(2, '0');
        $('#radar-time').textContent = `${h}:${m}`;
    }
    $('#radar-slider').value = idx;
}

function toggleRadarPlay() {
    radarPlaying = !radarPlaying;
    const icon = $('#play-icon');
    if (radarPlaying) {
        icon.setAttribute('points', '6,4 10,4 10,20 6,20');
        // Add pause second bar
        if (!$('#pause-icon')) {
            const pause = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            pause.id = 'pause-icon';
            pause.setAttribute('points', '14,4 18,4 18,20 14,20');
            pause.setAttribute('fill', 'currentColor');
            icon.parentElement.appendChild(pause);
        }
        radarInterval = setInterval(() => {
            radarIdx = (radarIdx + 1) % radarFrames.length;
            showRadarFrame(radarIdx);
        }, 800);
    } else {
        icon.setAttribute('points', '6,4 20,12 6,20');
        const pause = $('#pause-icon');
        if (pause) pause.remove();
        clearInterval(radarInterval);
    }
}

// ============================================================
// Search & Location
// ============================================================
function setupEvents() {
    const input = $('#search-input');
    const results = $('#search-results');

    input.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const q = e.target.value.trim();
        if (q.length < 2) { results.classList.add('hidden'); return; }
        searchTimeout = setTimeout(async () => {
            const r = await searchLocations(q);
            showSearchResults(r);
        }, 300);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimeout);
            const q = e.target.value.trim();
            if (q.length >= 2) searchLocations(q).then(showSearchResults);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) results.classList.add('hidden');
    });

    $('#geo-btn').addEventListener('click', handleGeo);
}

function showSearchResults(items) {
    const el = $('#search-results');
    if (!items.length) { el.classList.add('hidden'); return; }
    el.innerHTML = items.map(r => `
        <div class="search-result-item" data-lat="${r.latitude}" data-lon="${r.longitude}"
             data-name="${r.name}" data-country="${r.country || ''}">
            <div class="search-result-name">${r.name}</div>
            <div class="search-result-detail">${[r.admin1, r.country].filter(Boolean).join(', ')}</div>
        </div>`).join('');
    el.classList.remove('hidden');

    el.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            el.classList.add('hidden');
            $('#search-input').value = '';
            loadWeather(
                parseFloat(item.dataset.lat),
                parseFloat(item.dataset.lon),
                `${item.dataset.name}, ${item.dataset.country}`
            );
        });
    });
}

async function handleGeo() {
    const btn = $('#geo-btn');
    btn.disabled = true;
    try {
        const { lat, lon } = await getGeolocation();
        loadWeather(lat, lon, 'My Location');
    } catch {
        showError('Could not determine your location.');
    } finally {
        btn.disabled = false;
    }
}

// ============================================================
// Main Flow
// ============================================================
async function loadWeather(lat, lon, name) {
    currentLat = lat;
    currentLon = lon;
    showLoading();
    hideError();
    $('#main-content').classList.add('hidden');
    $('#location-display').textContent = '\uD83D\uDCCD ' + name;
    localStorage.setItem('loc', JSON.stringify({ lat, lon, name }));

    try {
        const [forecast, ensemble] = await Promise.all([
            fetchForecast(lat, lon),
            fetchEnsemble(lat, lon),
        ]);
        const result = processData(ensemble, forecast);

        hideLoading();
        $('#main-content').classList.remove('hidden');

        renderCurrent(forecast);
        renderConfidence(result.currentConf);
        renderDaily(result.days);
        renderChart(result.tempStats);
        renderPrecipChart(result.precipStats);
        initRadar(lat, lon);
        renderExplanation(result.memberCount);
    } catch (err) {
        console.error(err);
        hideLoading();
        showError('Could not load weather data. Please try again.');
    }
}

function showLoading() { $('#loading').classList.remove('hidden'); }
function hideLoading() { $('#loading').classList.add('hidden'); }
function showError(msg) {
    const el = $('#error');
    el.textContent = msg;
    el.classList.remove('hidden');
}
function hideError() { $('#error').classList.add('hidden'); }

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    setupEvents();
    const saved = localStorage.getItem('loc');
    if (saved) {
        try {
            const loc = JSON.parse(saved);
            loadWeather(loc.lat, loc.lon, loc.name);
            return;
        } catch { /* ignore */ }
    }
    try {
        const { lat, lon } = await getGeolocation();
        loadWeather(lat, lon, 'My Location');
    } catch {
        loadWeather(46.2044, 6.1432, 'Geneva, Switzerland');
    }
});
