/*
 * HA Futurista — tarjetas personalizadas para Home Assistant
 * Estilo "Opción E · Futurista": fondo oscuro, bordes con brillo, clima ilustrado.
 * Licencia MIT
 */
const FX_VERSION = '1.3.0';

(function cargarFuentes() {
  if (document.getElementById('fx-fuentes')) return;
  const l = document.createElement('link');
  l.id = 'fx-fuentes';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Figtree:wght@300;400;600;700&display=swap';
  document.head.appendChild(l);
})();

const FX = {
  cian: '#4de2ff',
  violeta: '#b18cff',
  ambar: '#ffb454',
  verde: '#5dffb0',
  rojo: '#ff5d73',
  naranja: '#ff9f0a',
  texto: '#e8f1ff',
  tenue: '#8fa3bf',
  pista: '#18263a',
};

const BASE_CSS = `
:host { display: block; height: 100%; }
* { box-sizing: border-box; }
.card {
  height: 100%;
  background: #0e1522;
  border: 1px solid #1d3552;
  border-radius: 24px;
  box-shadow: 0 0 30px rgba(77,226,255,0.08);
  color: ${FX.texto};
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  overflow: hidden;
  position: relative;
}
.d { font-family: 'Chakra Petch', system-ui, sans-serif; }
.tenue { color: ${FX.tenue}; }
.etq { font-family: 'Chakra Petch', system-ui, sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible { outline: 2px solid ${FX.cian}; outline-offset: 2px; }
.rt { font-family: 'Chakra Petch', sans-serif; font-size: 20px; fill: ${FX.texto}; }
.rs { font-family: 'Chakra Petch', sans-serif; font-size: 9px; letter-spacing: 1px; fill: ${FX.tenue}; }
.err { padding: 16px; color: ${FX.rojo}; font-size: 14px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const numFmt = (v, dec = 1) => {
  const n = parseFloat(v);
  if (isNaN(n)) return esc(v);
  return n.toLocaleString('es-ES', { maximumFractionDigits: dec });
};

const horaCorta = (iso) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

function anillo(pct, color, size, grosor, etiqueta, sub) {
  const r = 40;
  const C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, isNaN(pct) ? 0 : pct));
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${FX.pista}" stroke-width="${grosor}"></circle>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round"
      stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"
      style="filter: drop-shadow(0 0 4px ${color}88); transition: stroke-dasharray .6s ease"></circle>
    <text x="50" y="${sub ? 53 : 57}" text-anchor="middle" class="rt">${etiqueta}</text>
    ${sub ? `<text x="50" y="68" text-anchor="middle" class="rs">${sub}</text>` : ''}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* Clase base                                                          */
/* ------------------------------------------------------------------ */
class FxBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = null;
  }
  setConfig(config) {
    if (!config) throw new Error('Configuración vacía');
    if (this.validar) this.validar(config);
    this._config = { ...config };
    this._sig = null;
    if (this._hass) this._update();
  }
  set hass(h) {
    this._hass = h;
    this._update();
  }
  get hass() { return this._hass; }
  entidades() { return []; }
  signature() {
    return JSON.stringify(this.entidades().map((e) => {
      const s = this._hass?.states[e];
      return s ? [s.state, s.last_updated] : null;
    }));
  }
  _update() {
    if (!this._hass || !this._config) return;
    const s = this.signature();
    if (s === this._sig) return;
    this._sig = s;
    this.render();
  }
  forzar() { this._sig = null; this._update(); }
  st(id) { return id && this._hass ? this._hass.states[id] : undefined; }
  masInfo(id) {
    if (!id) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true }));
  }
  llamar(accion, data, target) {
    const [dom, srv] = String(accion).split('.');
    return this._hass.callService(dom, srv, data || {}, target);
  }
  error(msg) {
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}</style><div class="card err">${esc(msg)}</div>`;
  }
  getCardSize() { return 4; }
}

/* ------------------------------------------------------------------ */
/* CLIMA                                                               */
/* ------------------------------------------------------------------ */
const CONDICIONES = {
  'sunny': 'Soleado',
  'clear-night': 'Despejado',
  'partlycloudy': 'Parcialmente nublado',
  'cloudy': 'Nublado',
  'rainy': 'Lluvia',
  'pouring': 'Lluvia fuerte',
  'lightning': 'Tormenta',
  'lightning-rainy': 'Tormenta con lluvia',
  'snowy': 'Nieve',
  'snowy-rainy': 'Aguanieve',
  'fog': 'Niebla',
  'hail': 'Granizo',
  'windy': 'Viento',
  'windy-variant': 'Viento y nubes',
  'exceptional': 'Excepcional',
};

const LLUVIA = ['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy', 'hail'];
const TORMENTA = ['lightning', 'lightning-rainy'];
const NIEVE = ['snowy', 'snowy-rainy'];
const CUBIERTO = ['cloudy', 'rainy', 'pouring', 'lightning', 'lightning-rainy', 'snowy', 'snowy-rainy', 'fog', 'hail', 'windy-variant'];

function nube(x, y, s, fill, op, cls = 'deriva', dur = 18) {
  return `<g class="${cls}" style="animation-duration:${dur}s"><g transform="translate(${x} ${y}) scale(${s})" fill="${fill}" opacity="${op}">
    <circle cx="34" cy="22" r="24"></circle><circle cx="70" cy="10" r="34"></circle><circle cx="108" cy="24" r="24"></circle>
    <rect x="10" y="22" width="120" height="30" rx="15"></rect></g></g>`;
}

function escena(cond, noche, uid) {
  const cubierto = CUBIERTO.includes(cond);
  let cielo;
  if (noche) cielo = ['#03070f', '#0b1a36', '#1a2f55'];
  else if (cubierto) cielo = ['#18222f', '#2b3d52', '#4a6078'];
  else cielo = ['#0d2a52', '#1c5a8f', '#3a86b8'];

  let s = `<defs>
    <linearGradient id="c${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${cielo[0]}"></stop><stop offset="0.6" stop-color="${cielo[1]}"></stop><stop offset="1" stop-color="${cielo[2]}"></stop>
    </linearGradient>
    <radialGradient id="h${uid}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${noche ? '#cfe0ff' : '#ffd36b'}" stop-opacity="${noche ? 0.25 : 0.45}"></stop>
      <stop offset="1" stop-color="${noche ? '#cfe0ff' : '#ffd36b'}" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="s${uid}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff4c2"></stop><stop offset="0.45" stop-color="#ffc94a"></stop>
      <stop offset="1" stop-color="#ff9f1a" stop-opacity="0"></stop>
    </radialGradient>
  </defs>
  <rect width="780" height="470" fill="url(#c${uid})"></rect>`;

  if (noche) {
    const estrellas = [[80, 60], [140, 120], [220, 40], [300, 90], [380, 50], [440, 130], [700, 60], [740, 140], [620, 40], [520, 100], [60, 180], [260, 170]];
    s += estrellas.map(([x, y], i) => `<circle class="titila" style="animation-delay:${(i % 5) * 0.7}s" cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.8 : 1.2}" fill="#ffffff" opacity="0.8"></circle>`).join('');
  }

  const muestraAstro = !cubierto || cond === 'windy-variant';
  if (muestraAstro || cond === 'partlycloudy') {
    s += `<circle class="pulso" cx="560" cy="150" r="190" fill="url(#h${uid})"></circle>`;
    if (noche) {
      s += `<circle cx="560" cy="150" r="52" fill="#e8eefc"></circle><circle cx="582" cy="136" r="46" fill="${cielo[1]}"></circle>`;
    } else {
      s += `<circle cx="560" cy="150" r="92" fill="url(#s${uid})"></circle><circle cx="560" cy="150" r="58" fill="#ffe08a"></circle>`;
    }
  }

  const gris = cubierto ? '#c9d4e2' : '#f4f8ff';
  const oscuro = cubierto ? '#8e9cb0' : '#dfeaf7';
  if (cond === 'sunny' || cond === 'clear-night') {
    s += nube(270, 90, 0.8, '#ffffff', 0.35, 'deriva', 26);
  } else if (cond === 'partlycloudy') {
    s += nube(270, 90, 0.8, '#ffffff', 0.55, 'deriva', 24);
    s += nube(560, 190, 1.2, gris, 0.95, 'deriva', 18);
    s += nube(440, 250, 0.75, oscuro, 0.8, 'deriva2', 22);
  } else {
    s += nube(60, 60, 1.3, oscuro, 0.9, 'deriva2', 30);
    s += nube(330, 40, 1.6, gris, 0.95, 'deriva', 24);
    s += nube(520, 150, 1.4, gris, 0.95, 'deriva2', 20);
    s += nube(200, 170, 1.1, oscuro, 0.85, 'deriva', 26);
  }

  if (LLUVIA.includes(cond)) {
    for (let i = 0; i < 26; i++) {
      const x = 120 + ((i * 97) % 560);
      const y = 230 + ((i * 37) % 40);
      s += `<line class="gota" style="animation-delay:${((i * 0.13) % 1.1).toFixed(2)}s" x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 18}" stroke="#9cd8ff" stroke-width="2.5" stroke-linecap="round"></line>`;
    }
  }
  if (NIEVE.includes(cond)) {
    for (let i = 0; i < 22; i++) {
      const x = 120 + ((i * 89) % 560);
      const y = 230 + ((i * 29) % 50);
      s += `<circle class="copo" style="animation-delay:${((i * 0.21) % 2.4).toFixed(2)}s" cx="${x}" cy="${y}" r="3.5" fill="#ffffff"></circle>`;
    }
  }
  if (TORMENTA.includes(cond)) {
    s += `<path class="rayo" d="M420 230 L395 290 L420 290 L400 350 L455 275 L428 275 L450 230 Z" fill="#ffe37a"></path>`;
  }
  if (cond === 'fog') {
    for (let i = 0; i < 5; i++) {
      s += `<rect class="deriva" style="animation-duration:${14 + i * 3}s" x="${40 + (i % 2) * 60}" y="${200 + i * 26}" width="620" height="10" rx="5" fill="#dbe4ee" opacity="0.35"></rect>`;
    }
  }
  s += `<rect x="0" y="330" width="780" height="140" fill="#070b12" opacity="0.55"></rect>`;
  return `<svg viewBox="0 0 780 470" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`;
}

function iconoMini(cond, noche) {
  const sol = `<circle cx="17" cy="13" r="11" fill="#ffc94a" opacity="0.3"></circle><circle cx="17" cy="13" r="7" fill="#ffd96b"></circle>`;
  const luna = `<circle cx="16" cy="13" r="8" fill="#e8eefc"></circle><circle cx="20" cy="10" r="7" fill="#0e1522"></circle>`;
  const nubeM = (f) => `<circle cx="14" cy="16" r="6" fill="${f}"></circle><circle cx="21" cy="12" r="8" fill="${f}"></circle><rect x="9" y="16" width="20" height="7" rx="3.5" fill="${f}"></rect>`;
  let c;
  if (cond === 'sunny') c = sol;
  else if (cond === 'clear-night') c = luna;
  else if (cond === 'partlycloudy') c = (noche ? `<circle cx="11" cy="9" r="5" fill="#e8eefc"></circle>` : `<circle cx="12" cy="9" r="6" fill="#ffc94a"></circle>`) + nubeM('#f4f8ff');
  else if (LLUVIA.includes(cond)) c = nubeM('#c9d4e2').replace(/cy="(\d+)"/g, (m, v) => `cy="${v - 4}"`) + `<line x1="13" y1="21" x2="11" y2="25" stroke="#9cd8ff" stroke-width="2" stroke-linecap="round"></line><line x1="20" y1="21" x2="18" y2="25" stroke="#9cd8ff" stroke-width="2" stroke-linecap="round"></line><line x1="27" y1="21" x2="25" y2="25" stroke="#9cd8ff" stroke-width="2" stroke-linecap="round"></line>`;
  else if (NIEVE.includes(cond)) c = nubeM('#c9d4e2') + `<circle cx="13" cy="25" r="1.6" fill="#fff"></circle><circle cx="20" cy="25" r="1.6" fill="#fff"></circle><circle cx="27" cy="25" r="1.6" fill="#fff"></circle>`;
  else if (TORMENTA.includes(cond)) c = nubeM('#c9d4e2') + `<path d="M19 18 L15 25 L19 25 L17 30 L24 22 L20 22 L22 18 Z" fill="#ffe37a"></path>`;
  else c = nubeM('#c9d4e2');
  return `<svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">${c}</svg>`;
}

class FuturistaClimaCard extends FxBase {
  static getStubConfig(h) {
    const w = Object.keys(h.states).find((e) => e.startsWith('weather.'));
    return { entity: w || 'weather.home', nombre: 'Casa' };
  }
  validar(c) { if (!c.entity) throw new Error('Falta "entity" (una entidad weather.xxx)'); }
  setConfig(c) {
    this._desuscribir();
    this._uid = Math.random().toString(36).slice(2, 8);
    this._montanasListo = false;
    super.setConfig(c);
  }
  entidades() { return [this._config.entity, this._config.sun_entity || 'sun.sun']; }
  signature() {
    if (this._config.estilo === 'montanas') {
      const w = this.st(this._config.entity);
      const sol = this.st(this._config.sun_entity || 'sun.sun');
      return JSON.stringify([w?.state, w?.last_updated, sol?.state, Math.floor(Date.now() / 600000), this._fcVer || 0]);
    }
    return super.signature() + '|' + (this._fcVer || 0);
  }
  _update() { this._suscribir(); super._update(); }
  connectedCallbackMontanas() {
    clearInterval(this._tm);
    this._tm = setInterval(() => { if (this._config?.estilo === 'montanas') this._update(); }, 60000);
  }
  connectedCallback() { this.connectedCallbackMontanas(); if (this._hass) this._update(); }
  disconnectedCallback() { this._desuscribir(); clearInterval(this._tm); }
  _desuscribir() {
    if (this._unsub) { this._unsub.then((f) => f && f()).catch(() => {}); }
    this._unsub = null;
    this._subOk = false;
  }
  _suscribir() {
    if (this._subOk || !this._hass || !this._config || !this._hass.connection) return;
    this._subOk = true;
    const tipo = this._config.pronostico === 'diario' ? 'daily' : 'hourly';
    const ir = (t) => this._hass.connection.subscribeMessage((ev) => {
      this._fc = ev.forecast || [];
      this._fcTipo = t;
      this._fcVer = (this._fcVer || 0) + 1;
      this._update();
    }, { type: 'weather/subscribe_forecast', forecast_type: t, entity_id: this._config.entity });
    this._unsub = ir(tipo).catch(() => ir(tipo === 'hourly' ? 'daily' : 'hourly')).catch(() => null);
  }
  render() {
    const c = this._config;
    const s = this.st(c.entity);
    if (!s) return this.error(`No encuentro la entidad ${c.entity}`);
    if (c.estilo === 'montanas') return this._renderMontanas(s);
    this._montanasListo = false;
    const a = s.attributes;
    const sol = this.st(c.sun_entity || 'sun.sun');
    const cond = s.state;
    const noche = cond === 'clear-night' || (sol && sol.state === 'below_horizon');
    const n = c.horas || 6;
    const lista = (this._fc || a.forecast || []).slice(0, n);
    const diario = this._fcTipo === 'daily';
    const unidadViento = a.wind_speed_unit || 'km/h';

    const horas = lista.map((f) => {
      const d = new Date(f.datetime);
      const etq = diario
        ? d.toLocaleDateString('es-ES', { weekday: 'short' })
        : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const esNoche = !diario && (d.getHours() < 7 || d.getHours() >= 20);
      return `<div class="h">
        <div class="d ht">${esc(etq)}</div>
        ${iconoMini(f.condition, esNoche)}
        <div class="d hv">${Math.round(f.temperature)}°</div>
      </div>`;
    }).join('');

    const meta = [];
    if (a.humidity != null) meta.push(`Humedad ${numFmt(a.humidity, 0)} %`);
    if (a.wind_speed != null) meta.push(`Viento ${numFmt(a.wind_speed)} ${esc(unidadViento)}`);
    if (sol && sol.attributes.next_rising) meta.push(`Sol ${horaCorta(sol.attributes.next_rising)} → ${horaCorta(sol.attributes.next_setting)}`);

    this.shadowRoot.innerHTML = `<style>${BASE_CSS}
      .card { cursor: pointer; border-color: #1d3552; box-shadow: 0 0 40px rgba(77,226,255,0.10); min-height: 320px; }
      .escena, .escena svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      .sobre { position: absolute; inset: 0; padding: 24px 26px; display: flex; flex-direction: column; justify-content: space-between; }
      .temp { font-size: clamp(72px, 9vw, 120px); font-weight: 300; line-height: 1; text-shadow: 0 2px 20px rgba(0,0,0,.35); }
      .meta { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: 14px; color: #e0edff; margin-top: 6px; }
      .horas { display: grid; grid-template-columns: repeat(${Math.max(lista.length, 1)}, minmax(0, 1fr)); gap: 6px; text-align: center; }
      .h { display: flex; flex-direction: column; align-items: center; gap: 6px; }
      .ht { font-size: 12px; letter-spacing: 1px; color: #b8cde6; }
      .hv { font-size: 18px; font-weight: 600; }
      .deriva { animation: deriva 18s ease-in-out infinite alternate; }
      .deriva2 { animation: deriva2 22s ease-in-out infinite alternate; }
      .pulso { animation: pulso 5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .gota { animation: cae 1.1s linear infinite; }
      .copo { animation: nieva 2.4s linear infinite; }
      .rayo { animation: rayo 4s steps(1) infinite; }
      .titila { animation: titila 3s ease-in-out infinite; }
      @keyframes deriva { from { transform: translateX(-14px); } to { transform: translateX(22px); } }
      @keyframes deriva2 { from { transform: translateX(16px); } to { transform: translateX(-18px); } }
      @keyframes pulso { 50% { opacity: .75; transform: scale(1.06); } }
      @keyframes cae { from { transform: translateY(-12px); opacity: 0; } 30% { opacity: 1; } to { transform: translateY(46px); opacity: 0; } }
      @keyframes nieva { from { transform: translateY(-10px); opacity: 0; } 30% { opacity: 1; } to { transform: translateY(50px) translateX(8px); opacity: 0; } }
      @keyframes rayo { 0%, 100% { opacity: 0; } 92% { opacity: 1; } 95% { opacity: 0; } 97% { opacity: 1; } }
      @keyframes titila { 50% { opacity: .25; } }
    </style>
    <div class="card" role="button" tabindex="0" aria-label="Clima: ${esc(CONDICIONES[cond] || cond)}, ${Math.round(a.temperature)} grados">
      <div class="escena">${escena(cond, noche, this._uid)}</div>
      <div class="sobre">
        <div>
          <div class="etq" style="color:#cfe6ff">${esc(c.nombre ? c.nombre + ' · ' : '')}${esc(CONDICIONES[cond] || cond)}</div>
          <div class="d temp">${Math.round(a.temperature)}°</div>
          <div class="meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
        </div>
        <div class="horas">${horas}</div>
      </div>
    </div>`;
    const card = this.shadowRoot.querySelector('.card');
    card.addEventListener('click', () => this.masInfo(c.entity));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.masInfo(c.entity); });
  }

  /* ---------------- Estilo "montanas" (realista con movimiento) ---------------- */
  _astro(sol) {
    const a = sol?.attributes || {};
    const nr = a.next_rising ? new Date(a.next_rising).getTime() : null;
    const ns = a.next_setting ? new Date(a.next_setting).getTime() : null;
    const ahora = Date.now();
    if (!nr || !ns) return { f: 0.5, dia: true };
    const dia = sol.state === 'above_horizon';
    let f;
    if (dia) { const salida = nr - 86400000; f = (ahora - salida) / (ns - salida); }
    else { const puesta = ns - 86400000; f = (ahora - puesta) / (nr - puesta); }
    return { f: Math.max(0.02, Math.min(0.98, f)), dia };
  }
  _cresta(semilla, base, amp, aspereza) {
    let t = semilla * 9301 + 49297;
    const azar = () => { t = (t * 9301 + 49297) % 233280; return t / 233280; };
    const fases = [azar() * 6, azar() * 6, azar() * 6];
    let d = 'M0 520';
    for (let x = 0; x <= 930; x += 10) {
      const v = Math.sin(x / 140 + fases[0]) * 0.5 + Math.sin(x / 61 + fases[1]) * 0.3 + Math.sin(x / 27 + fases[2]) * 0.15 + (azar() - 0.5) * aspereza;
      d += ` L${x} ${(base - amp * v).toFixed(1)}`;
    }
    return d + ' L930 520 Z';
  }
  _renderMontanas(w) {
    const c = this._config;
    const a = w.attributes;
    const cond = w.state;
    const sol = this.st(c.sun_entity || 'sun.sun');
    const { f, dia } = this._astro(sol);
    const noche = !dia || cond === 'clear-night';
    const cubierto = ['cloudy', 'fog', 'rainy', 'pouring', 'lightning', 'lightning-rainy', 'snowy', 'snowy-rainy', 'hail'].includes(cond);
    const tormenta = ['rainy', 'pouring', 'lightning', 'lightning-rainy', 'snowy', 'snowy-rainy', 'hail'].includes(cond);
    const uid = this._uid;

    const cielo = noche ? ['#02060f', '#081631', '#16294a', '#25395c']
      : cubierto ? ['#1f2c3c', '#3d5268', '#7b8ea2', '#a8b3be']
      : ['#0c2e5e', '#2c6eaa', '#8ab8dc', '#e9ddc0'];
    const crestas = noche ? ['#2a3a58', '#1e2c46', '#142036', '#0a1322']
      : cubierto ? ['#6c7c8e', '#4d5d70', '#324154', '#18222f']
      : ['#6f8fb3', '#4a6c93', '#2c4a6e', '#13263f'];
    const banda = noche ? '#070d18' : '#0c1a2d';
    const niebla = noche ? '#8795ad' : cubierto ? '#cfd6de' : '#dfe6ee';

    let alfaOff = -1.75, luzNube = '#ffffff', opNube = 0.85, mascara = 'transparent 0%, #000 12%, #000 45%, transparent 62%';
    if (['partlycloudy', 'windy-variant'].includes(cond)) alfaOff = -1.45;
    if (['cloudy', 'fog'].includes(cond)) { alfaOff = -1.0; luzNube = '#e3e8ee'; mascara = 'transparent 0%, #000 5%, #000 60%, transparent 78%'; }
    if (tormenta) { alfaOff = -0.85; luzNube = '#b9c3cf'; mascara = 'transparent 0%, #000 3%, #000 62%, transparent 80%'; }
    if (noche) { luzNube = '#8a9bb8'; opNube = 0.6; }

    const ax = 90 + f * 750;
    const ay = 330 - Math.sin(Math.PI * f) * 240;
    const opSol = cubierto ? 0.35 : 1;

    let astro;
    if (noche) {
      astro = `<circle cx="${ax}" cy="${ay}" r="150" fill="url(#mh${uid})" opacity="0.6"></circle>
        <mask id="ml${uid}"><rect width="930" height="520" fill="#fff"></rect><circle cx="${ax + 11}" cy="${ay - 8}" r="23" fill="#000"></circle></mask>
        <circle cx="${ax}" cy="${ay}" r="26" fill="#e8eefc" mask="url(#ml${uid})"></circle>`;
    } else {
      astro = `<circle class="pulso" cx="${ax}" cy="${ay}" r="300" fill="url(#ms${uid})" opacity="${opSol}"></circle>`;
    }
    let estrellas = '';
    if (noche && !cubierto) {
      const pos = [[80,50],[160,110],[240,40],[330,85],[410,30],[480,120],[560,60],[640,35],[720,95],[800,50],[870,120],[120,170],[380,160],[600,150],[840,180]];
      estrellas = pos.map(([x, y], i) => `<circle class="titila" style="animation-delay:${(i % 5) * 0.7}s" cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.6 : 1}" fill="#fff" opacity="0.85"></circle>`).join('');
    }
    let precip = '';
    if (['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy', 'hail'].includes(cond)) {
      for (let i = 0; i < 46; i++) {
        const x = (i * 97) % 930, y = 60 + ((i * 53) % 300);
        precip += `<line class="gota" style="animation-delay:${((i * 0.11) % 1.1).toFixed(2)}s" x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 18}" stroke="#bcdcf5" stroke-width="2" stroke-linecap="round" opacity="0.7"></line>`;
      }
    }
    if (['snowy', 'snowy-rainy'].includes(cond)) {
      for (let i = 0; i < 40; i++) {
        const x = (i * 89) % 930, y = 60 + ((i * 41) % 300);
        precip += `<circle class="copo" style="animation-delay:${((i * 0.19) % 2.4).toFixed(2)}s" cx="${x}" cy="${y}" r="3" fill="#fff"></circle>`;
      }
    }
    if (['lightning', 'lightning-rainy'].includes(cond)) {
      precip += `<path class="rayo" d="M520 150 L495 215 L520 215 L500 285 L555 200 L528 200 L550 150 Z" fill="#ffe37a"></path>`;
    }

    const cieloSvg = `<svg viewBox="0 0 930 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="mc${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${cielo[0]}"></stop><stop offset="0.4" stop-color="${cielo[1]}"></stop>
          <stop offset="0.62" stop-color="${cielo[2]}"></stop><stop offset="0.78" stop-color="${cielo[3]}"></stop>
        </linearGradient>
        <radialGradient id="ms${uid}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffffff"></stop><stop offset="0.07" stop-color="#fff5d2"></stop>
          <stop offset="0.2" stop-color="#ffe29a" stop-opacity="0.6"></stop><stop offset="0.55" stop-color="#ffd27a" stop-opacity="0.15"></stop>
          <stop offset="1" stop-color="#ffd27a" stop-opacity="0"></stop>
        </radialGradient>
        <radialGradient id="mh${uid}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#cfe0ff" stop-opacity="0.35"></stop><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"></stop>
        </radialGradient>
      </defs>
      <rect width="930" height="520" fill="url(#mc${uid})"></rect>
      ${estrellas}${astro}
    </svg>`;

    const montesSvg = `<svg viewBox="0 0 930 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="mn${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${niebla}" stop-opacity="0"></stop><stop offset="0.55" stop-color="${niebla}" stop-opacity="${noche ? 0.15 : 0.32}"></stop>
          <stop offset="1" stop-color="${niebla}" stop-opacity="0.1"></stop>
        </linearGradient>
      </defs>
      ${precip}
      <path d="${this._cresta(3, 290, 70, 0.35)}" fill="${crestas[0]}"></path>
      <g class="niebla"><rect x="-200" y="240" width="1330" height="190" fill="url(#mn${uid})"></rect></g>
      <path d="${this._cresta(10, 330, 50, 0.3)}" fill="${crestas[1]}"></path>
      <path d="${this._cresta(17, 365, 34, 0.25)}" fill="${crestas[2]}"></path>
      <path d="${this._cresta(24, 398, 20, 0.2)}" fill="${crestas[3]}"></path>
      <rect x="0" y="420" width="930" height="100" fill="${banda}"></rect>
    </svg>`;

    const nubesSvg = `<svg viewBox="0 0 1860 520" preserveAspectRatio="xMinYMax slice" aria-hidden="true">
      <defs>
        <filter id="mf${uid}" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.003 0.02" numOctaves="5" seed="4" result="ruido"></feTurbulence>
          <feDiffuseLighting in="ruido" lighting-color="${luzNube}" surfaceScale="3" result="luz"><feDistantLight azimuth="-30" elevation="45"></feDistantLight></feDiffuseLighting>
          <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.4 0 0 0 ${alfaOff}" result="alfa"></feColorMatrix>
          <feComposite in="luz" in2="alfa" operator="in"></feComposite>
          <feGaussianBlur stdDeviation="0.8"></feGaussianBlur>
        </filter>
      </defs>
      <rect width="1860" height="520" filter="url(#mf${uid})"></rect>
    </svg>`;

    // Datos
    const n = c.horas || 6;
    const lista = (this._fc || a.forecast || []).slice(0, n);
    const diario = this._fcTipo === 'daily';
    const horas = lista.map((fc) => {
      const d = new Date(fc.datetime);
      const etq = diario ? d.toLocaleDateString('es-ES', { weekday: 'short' }) : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const esNoche = !diario && (d.getHours() < 7 || d.getHours() >= 20);
      return `<div class="h"><div class="ht">${esc(etq)}</div>${iconoMini(fc.condition, esNoche)}<div class="hv">${Math.round(fc.temperature)}°</div></div>`;
    }).join('');
    const detalles = [];
    if (a.humidity != null) detalles.push(`Humedad ${numFmt(a.humidity, 0)} %`);
    if (a.wind_speed != null) detalles.push(`Viento ${numFmt(a.wind_speed)} ${esc(a.wind_speed_unit || 'km/h')}`);
    const sa = sol?.attributes || {};

    const sobre = `
      <div class="info">
        ${c.nombre ? `<div class="lugar">${esc(c.nombre)}</div>` : ''}
        <div class="temp">${Math.round(a.temperature)}°</div>
        <div class="cond">${esc(CONDICIONES[cond] || cond)}</div>
        <div class="det">${detalles.map(esc).join(' · ')}</div>
      </div>
      ${sa.next_rising ? `<div class="soles"><div>Amanecer ${horaCorta(sa.next_rising)}</div><div>Atardecer ${horaCorta(sa.next_setting)}</div></div>` : ''}
      <div class="horas" style="grid-template-columns: repeat(${Math.max(lista.length, 1)}, minmax(0, 1fr))">${horas}</div>`;

    const claveNubes = `${alfaOff}|${luzNube}|${opNube}|${mascara}`;
    const r = this.shadowRoot;
    if (!this._montanasListo) {
      r.innerHTML = `<style>${BASE_CSS}
        .card { cursor: pointer; container-type: inline-size; min-height: 320px; border: none; font-family: 'Figtree', system-ui, sans-serif; color: #fff; }
        .capa { position: absolute; inset: 0; }
        .capa > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .nubes { overflow: hidden; }
        .nubes .mov { position: absolute; top: 0; left: 0; height: 100%; width: 200%; will-change: transform; animation: viaje 180s ease-in-out infinite alternate; }
        .nubes .mov svg { width: 100%; height: 100%; display: block; }
        .niebla { animation: niebla 40s ease-in-out infinite alternate; }
        .info { position: absolute; left: 5%; top: 7%; text-shadow: 0 2px 18px rgba(4,18,40,0.45); }
        .lugar { font-size: 17px; font-weight: 600; }
        .temp { font-size: clamp(64px, 13.5cqw, 124px); font-weight: 300; line-height: 1; letter-spacing: -3px; }
        .cond { font-size: clamp(17px, 2.4cqw, 22px); font-weight: 600; margin-top: 2px; }
        .det { font-size: 14px; opacity: .9; margin-top: 4px; }
        .soles { position: absolute; right: 4%; top: 7%; text-align: right; font-size: 14px; line-height: 1.7; text-shadow: 0 2px 12px rgba(4,18,40,0.5); }
        .horas { position: absolute; left: 3%; right: 3%; bottom: 14px; display: grid; gap: 4px; }
        .h { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .ht { font-size: 13px; opacity: .8; }
        .hv { font-size: 18px; font-weight: 700; }
        .pulso { animation: pulso 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .gota { animation: cae 1.1s linear infinite; }
        .copo { animation: nieva 2.4s linear infinite; }
        .rayo { animation: rayo 4s steps(1) infinite; }
        .titila { animation: titila 3s ease-in-out infinite; }
        @keyframes viaje { from { transform: translateX(0); } to { transform: translateX(-35%); } }
        @keyframes niebla { from { transform: translateX(-60px); opacity: .7; } to { transform: translateX(60px); opacity: 1; } }
        @keyframes pulso { 50% { opacity: .8; transform: scale(1.05); } }
        @keyframes cae { from { transform: translateY(-12px); opacity: 0; } 30% { opacity: 1; } to { transform: translateY(46px); opacity: 0; } }
        @keyframes nieva { from { transform: translateY(-10px); opacity: 0; } 30% { opacity: 1; } to { transform: translateY(50px) translateX(8px); opacity: 0; } }
        @keyframes rayo { 0%, 100% { opacity: 0; } 92% { opacity: 1; } 95% { opacity: 0; } 97% { opacity: 1; } }
        @keyframes titila { 50% { opacity: .25; } }
      </style>
      <div class="card" role="button" tabindex="0">
        <div class="capa" id="cielo"></div>
        <div class="capa nubes" id="nubes"><div class="mov" id="mov"></div></div>
        <div class="capa" id="montes"></div>
        <div class="capa" id="sobre"></div>
      </div>`;
      const card = r.querySelector('.card');
      card.addEventListener('click', () => this.masInfo(c.entity));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.masInfo(c.entity); });
      this._montanasListo = true;
      this._claveNubes = null;
    }
    r.getElementById('cielo').innerHTML = cieloSvg;
    r.getElementById('montes').innerHTML = montesSvg;
    r.getElementById('sobre').innerHTML = sobre;
    r.querySelector('.card').setAttribute('aria-label', `Clima: ${CONDICIONES[cond] || cond}, ${Math.round(a.temperature)} grados`);
    if (this._claveNubes !== claveNubes) {
      const capa = r.getElementById('nubes');
      capa.style.opacity = opNube;
      capa.style.webkitMaskImage = `linear-gradient(to bottom, ${mascara})`;
      capa.style.maskImage = `linear-gradient(to bottom, ${mascara})`;
      r.getElementById('mov').innerHTML = nubesSvg;
      this._claveNubes = claveNubes;
    }
  }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, rows: 8, min_rows: 5 }; }
}

/* ------------------------------------------------------------------ */
/* RELOJ                                                               */
/* ------------------------------------------------------------------ */
class FuturistaRelojCard extends FxBase {
  static getStubConfig() { return {}; }
  signature() { return 'fijo' + JSON.stringify(this._config); }
  connectedCallback() {
    this._tick();
    this._t = setInterval(() => this._tick(), 1000);
  }
  disconnectedCallback() { clearInterval(this._t); }
  render() {
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}
      .card { display: flex; align-items: center; justify-content: space-between; padding: 20px 26px; gap: 16px; min-height: 150px; }
      .hora { font-size: clamp(56px, 6.5vw, 92px); font-weight: 300; line-height: 1; color: #eaf6ff; }
      .fecha { margin-top: 8px; }
    </style>
    <div class="card">
      <div>
        <div class="d hora" id="hora">--:--</div>
        <div class="etq tenue fecha" id="fecha"></div>
      </div>
      <div id="anillo"></div>
    </div>`;
    this._tick();
  }
  _tick() {
    const r = this.shadowRoot;
    if (!r.getElementById('hora')) return;
    const loc = this._config?.idioma || 'es-ES';
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const txt = `${hh}:${mm}`;
    if (r.getElementById('hora').textContent !== txt) {
      r.getElementById('hora').textContent = txt;
      r.getElementById('fecha').textContent = d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
      if (this._config?.anillo !== false) {
        const pct = ((d.getHours() * 60 + d.getMinutes()) / 1440) * 100;
        r.getElementById('anillo').innerHTML = anillo(pct, FX.cian, 96, 6, `${Math.round(pct)}%`, 'DEL DÍA');
      }
    }
  }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 12, rows: 3, min_rows: 2 }; }
}

/* ------------------------------------------------------------------ */
/* ESTADO (título + chips)                                             */
/* ------------------------------------------------------------------ */
class FuturistaEstadoCard extends FxBase {
  static getStubConfig() { return { titulo: 'Hola Familia', chips: [] }; }
  entidades() { return (this._config.chips || []).map((c) => c.entity); }
  render() {
    const c = this._config;
    const chips = (c.chips || []).map((ch, i) => {
      const s = this.st(ch.entity);
      const nombre = ch.nombre || ch.name || s?.attributes.friendly_name || ch.entity;
      let clase = 'ok';
      let txt = nombre;
      if (!s || ['unavailable', 'unknown'].includes(s.state)) {
        clase = 'mal';
        txt = `${nombre} sin datos`;
      } else {
        const v = s.state;
        const n = parseFloat(v);
        if (ch.estados_ok) clase = ch.estados_ok.includes(v) ? 'ok' : 'mal';
        if (ch.alerta_sobre != null && n > ch.alerta_sobre) clase = 'alerta';
        if (ch.alerta_bajo != null && n < ch.alerta_bajo) clase = 'alerta';
        if (!ch.estados_ok && ch.mostrar_valor !== false) {
          const u = ch.unidad ?? s.attributes.unit_of_measurement ?? '';
          txt = `${nombre} ${numFmt(v)}${u === '%' ? '%' : u ? ' ' + u : ''}`;
        }
      }
      const marca = clase === 'ok' ? '●' : '▲';
      return `<button class="chip ${clase}" data-i="${i}">${marca} ${esc(txt)}</button>`;
    }).join('');

    const sub = c.subtitulo ?? new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    this.shadowRoot.innerHTML = `<style>${BASE_CSS}
      .card { background: transparent; border: none; box-shadow: none; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 6px 4px; min-height: 56px; }
      .izq { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .titulo { font-size: 22px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; }
      .chips { display: flex; gap: 8px; flex-wrap: wrap; }
      .chip { background: transparent; border: 1px solid; border-radius: 6px; padding: 6px 10px; min-height: 32px; font-family: 'Chakra Petch', sans-serif; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
      .ok { border-color: #1f8a5a; color: ${FX.verde}; }
      .alerta { border-color: #a8611b; color: ${FX.ambar}; }
      .mal { border-color: #8a2436; color: ${FX.rojo}; }
    </style>
    <div class="card">
      <div class="izq">
        ${c.titulo ? `<div class="d titulo">${esc(c.titulo)}</div>` : ''}
        <div class="chips">${chips}</div>
      </div>
      <div class="etq tenue">${esc(sub)}</div>
    </div>`;
    this.shadowRoot.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => this.masInfo(c.chips[+b.dataset.i].entity)));
  }
  getCardSize() { return 1; }
  getGridOptions() { return { columns: 'full', rows: 1 }; }
}

/* ------------------------------------------------------------------ */
/* ROBOROCK / ACCIONES                                                 */
/* ------------------------------------------------------------------ */
const ESTADOS_ASPIRADORA = {
  docked: 'En la base', cleaning: 'Limpiando', returning: 'Volviendo a la base',
  paused: 'En pausa', idle: 'En espera', error: 'Error', charging: 'Cargando',
};

class FuturistaRoborockCard extends FxBase {
  static getStubConfig(h) {
    const v = Object.keys(h.states).find((e) => e.startsWith('vacuum.'));
    return { nombre: 'Roborock', entity: v || 'vacuum.roborock', botones: [
      { nombre: 'Aspirar', icono: 'mdi:robot-vacuum', accion: 'vacuum.start', target: { entity_id: v || 'vacuum.roborock' } },
      { nombre: 'Base', icono: 'mdi:home-import-outline', accion: 'vacuum.return_to_base', target: { entity_id: v || 'vacuum.roborock' } },
    ] };
  }
  entidades() {
    const c = this._config;
    return [c.entity, c.bateria, c.estado, ...(c.botones || []).map((b) => b.entity)].filter(Boolean);
  }
  render() {
    const c = this._config;
    const v = this.st(c.entity);
    const b = this.st(c.bateria);
    let bat = b ? parseFloat(b.state) : v ? parseFloat(v.attributes.battery_level) : NaN;
    const color = isNaN(bat) ? FX.tenue : bat > 50 ? FX.verde : bat > 20 ? FX.ambar : FX.rojo;
    const estadoSt = this.st(c.estado);
    const estado = estadoSt ? estadoSt.state : v ? (ESTADOS_ASPIRADORA[v.state] || v.state) : '';

    const botones = (c.botones || []).map((bt, i) => {
      const on = bt.entity && this.st(bt.entity)?.state === 'on';
      return `<button class="bt ${on ? 'on' : ''}" data-i="${i}" aria-label="${esc(bt.nombre || '')}">
        <ha-icon icon="${esc(bt.icono || 'mdi:gesture-tap')}"></ha-icon>
        <span>${esc(bt.nombre || '')}</span>
      </button>`;
    }).join('');

    this.shadowRoot.innerHTML = `<style>${BASE_CSS}
      .card { display: flex; gap: 22px; padding: 22px 24px; min-height: 200px; }
      .bat { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 130px; flex-shrink: 0; background: none; border: none; padding: 0; }
      .grid { flex-grow: 1; display: grid; grid-template-columns: repeat(${c.columnas || 3}, minmax(0, 1fr)); gap: 10px; }
      .bt { border: 1px solid #22415f; border-radius: 16px; background: #0a111c; color: #9cf0ff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 64px; font-family: 'Chakra Petch', sans-serif; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; transition: box-shadow .2s, border-color .2s, transform .1s; --mdc-icon-size: 26px; }
      .bt span { color: #d7e6f7; }
      .bt:active { transform: scale(.96); }
      .bt.on, .bt.flash { border-color: ${FX.cian}; box-shadow: 0 0 18px rgba(77,226,255,.35); }
    </style>
    <div class="card">
      <button class="bat" id="bat" aria-label="${esc(c.nombre || 'Aspiradora')}: batería ${isNaN(bat) ? 'desconocida' : Math.round(bat) + ' por ciento'}">
        ${anillo(bat, color, 120, 7, isNaN(bat) ? '--' : `${Math.round(bat)}%`)}
        <div class="etq">${esc(c.nombre || 'Roborock')}</div>
        <div class="tenue" style="font-size:12px">${esc(estado)}</div>
      </button>
      <div class="grid">${botones}</div>
    </div>`;

    this.shadowRoot.getElementById('bat').addEventListener('click', () => this.masInfo(c.entity || c.bateria));
    this.shadowRoot.querySelectorAll('.bt').forEach((el) => el.addEventListener('click', () => {
      const bt = c.botones[+el.dataset.i];
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 600);
      if (bt.accion) this.llamar(bt.accion, bt.data, bt.target);
      else if (bt.entity) {
        const dom = bt.entity.split('.')[0];
        const destino = { entity_id: bt.entity };
        if (dom === 'button' || dom === 'input_button') this.llamar(`${dom}.press`, {}, destino);
        else if (dom === 'script' || dom === 'scene') this.llamar(`${dom}.turn_on`, {}, destino);
        else if (dom === 'vacuum') this.llamar('vacuum.start', {}, destino);
        else this.llamar('homeassistant.toggle', {}, destino);
      }
    }));
  }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, rows: 4, min_rows: 3 }; }
}

/* ------------------------------------------------------------------ */
/* MÚSICA                                                              */
/* ------------------------------------------------------------------ */
class FuturistaMusicaCard extends FxBase {
  static getStubConfig(h) {
    const m = Object.keys(h.states).find((e) => e.startsWith('media_player.'));
    return { entity: m || 'media_player.salon' };
  }
  validar(c) { if (!c.entity) throw new Error('Falta "entity" (un media_player.xxx)'); }
  signature() {
    const s = this.st(this._config.entity);
    if (!s) return 'x';
    const a = s.attributes;
    return JSON.stringify([s.state, a.media_title, a.media_artist, a.entity_picture, a.volume_level, a.media_duration, a.media_position_updated_at]);
  }
  connectedCallback() { this._t = setInterval(() => this._progreso(), 1000); }
  disconnectedCallback() { clearInterval(this._t); }
  render() {
    const c = this._config;
    const s = this.st(c.entity);
    if (!s) return this.error(`No encuentro la entidad ${c.entity}`);
    const a = s.attributes;
    const sonando = s.state === 'playing';
    const hayMedia = !!a.media_title;
    const titulo = hayMedia ? a.media_title : 'Nada reproduciendo';
    const sub = [a.media_artist, a.app_name || a.friendly_name].filter(Boolean).join(' · ');
    const alturas = [10, 18, 26, 14, 30, 22, 34, 16, 24, 12, 28, 20, 32, 14, 22, 30, 18, 26, 10, 24, 16, 28, 20, 12, 26, 18, 30, 14];
    const barras = alturas.map((h, i) => `<i style="height:${h}px;animation-delay:${(i % 7) * 0.12}s"></i>`).join('');
    const vol = Math.round((a.volume_level ?? 0) * 100);

    this.shadowRoot.innerHTML = `<style>${BASE_CSS}
      .card { border-color: #3a2a14; box-shadow: 0 0 30px rgba(255,159,10,0.08); display: flex; gap: 20px; align-items: center; padding: 22px; min-height: 200px; }
      .arte { width: 140px; height: 140px; border-radius: 18px; background: #1a1409; border: 1px solid #5a3d12; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; --mdc-icon-size: 54px; color: ${FX.naranja}; }
      .arte img { width: 100%; height: 100%; object-fit: cover; }
      .der { flex-grow: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
      .tit { font-size: 18px; font-weight: 600; color: ${FX.ambar}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; letter-spacing: 1px; color: ${FX.tenue}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .eq { display: flex; align-items: flex-end; gap: 4px; height: 34px; }
      .eq i { width: 5px; border-radius: 3px; background: #3a2a14; transform-origin: bottom; }
      .eq.on i { background: ${FX.naranja}; animation: eq .9s ease-in-out infinite alternate; }
      @keyframes eq { from { transform: scaleY(.3); } to { transform: scaleY(1); } }
      .prog { height: 4px; border-radius: 2px; background: #2a2010; overflow: hidden; }
      .prog div { height: 100%; width: 0; background: ${FX.naranja}; }
      .ctl { display: flex; align-items: center; gap: 14px; }
      .b { width: 44px; height: 44px; border: 1px solid #5a3d12; border-radius: 12px; background: transparent; color: ${FX.ambar}; display: flex; align-items: center; justify-content: center; --mdc-icon-size: 22px; padding: 0; }
      .play { width: 52px; height: 52px; border: none; border-radius: 14px; background: ${FX.naranja}; color: #070b12; box-shadow: 0 0 20px rgba(255,159,10,.45); --mdc-icon-size: 26px; }
      .vol { flex-grow: 1; display: flex; align-items: center; gap: 8px; color: ${FX.ambar}; --mdc-icon-size: 18px; min-width: 80px; }
      input[type=range] { flex-grow: 1; accent-color: ${FX.naranja}; height: 4px; }
    </style>
    <div class="card">
      <div class="arte">${a.entity_picture ? `<img src="${esc(a.entity_picture)}" alt="">` : '<ha-icon icon="mdi:music-note"></ha-icon>'}</div>
      <div class="der">
        <div>
          <div class="d tit">${esc(titulo)}</div>
          <div class="sub">${esc(sub).toUpperCase()}</div>
        </div>
        <div class="eq ${sonando ? 'on' : ''}">${barras}</div>
        <div class="prog"><div id="prog"></div></div>
        <div class="ctl">
          <button class="b" id="prev" aria-label="Anterior"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
          <button class="b play" id="play" aria-label="${sonando ? 'Pausar' : 'Reproducir'}"><ha-icon icon="${sonando ? 'mdi:pause' : 'mdi:play'}"></ha-icon></button>
          <button class="b" id="next" aria-label="Siguiente"><ha-icon icon="mdi:skip-next"></ha-icon></button>
          <label class="vol"><ha-icon icon="mdi:volume-high"></ha-icon><input id="vol" type="range" min="0" max="100" value="${vol}" aria-label="Volumen"></label>
        </div>
      </div>
    </div>`;
    const r = this.shadowRoot;
    const id = { entity_id: c.entity };
    r.getElementById('prev').addEventListener('click', () => this.llamar('media_player.media_previous_track', {}, id));
    r.getElementById('next').addEventListener('click', () => this.llamar('media_player.media_next_track', {}, id));
    r.getElementById('play').addEventListener('click', () => this.llamar('media_player.media_play_pause', {}, id));
    r.getElementById('vol').addEventListener('change', (e) => this.llamar('media_player.volume_set', { volume_level: e.target.value / 100 }, id));
    r.querySelector('.arte').addEventListener('click', () => this.masInfo(c.entity));
    this._progreso();
  }
  _progreso() {
    const el = this.shadowRoot.getElementById('prog');
    const s = this.st(this._config?.entity);
    if (!el || !s) return;
    const a = s.attributes;
    if (!a.media_duration) { el.style.width = '0'; return; }
    let pos = a.media_position || 0;
    if (s.state === 'playing' && a.media_position_updated_at) {
      pos += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
    }
    el.style.width = `${Math.min(100, (pos / a.media_duration) * 100)}%`;
  }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, rows: 4, min_rows: 3 }; }
}

/* ------------------------------------------------------------------ */
/* RED                                                                 */
/* ------------------------------------------------------------------ */
class FuturistaRedCard extends FxBase {
  static getStubConfig() { return { conexion: '', descarga: '', subida: '' }; }
  entidades() {
    const c = this._config;
    return [c.conexion, c.descarga, c.subida, c.dispositivos].filter(Boolean);
  }
  signature() {
    let extra = '';
    if (this._config.dispositivos === 'rastreadores') {
      extra = Object.keys(this._hass.states).filter((e) => e.startsWith('device_tracker.'))
        .map((e) => e + '=' + this._hass.states[e].state).join(',');
    }
    return super.signature() + '|' + (this._abierto ? 1 : 0) + '|' + (this._histVer || 0) + '|' + extra;
  }
  _desdeRastreadores() {
    const c = this._config;
    const excluir = (c.excluir || []).map((x) => String(x).toLowerCase());
    return Object.keys(this._hass.states)
      .filter((e) => e.startsWith('device_tracker.'))
      .map((e) => ({ id: e, s: this._hass.states[e] }))
      .filter(({ s }) => s.attributes.source_type === 'router' || s.attributes.ip)
      .filter(({ s }) => c.mostrar_todos || s.state === 'home')
      .map(({ id, s }) => {
        const a = s.attributes;
        return {
          nombre: a.friendly_name || a.host_name || id,
          ip: a.ip || '',
          clave: [a.friendly_name, a.host_name, a.mac, a.ip, id].filter(Boolean).join(' ').toLowerCase(),
          conectado: s.state === 'home',
        };
      })
      .filter((d) => !excluir.some((x) => d.clave.includes(x)))
      .sort((x, y) => {
        const n = (ip) => ip.split('.').map((p) => p.padStart(3, '0')).join('.');
        return n(x.ip).localeCompare(n(y.ip));
      });
  }
  connectedCallback() {
    this._cargarHistorial();
    this._th = setInterval(() => this._cargarHistorial(), 5 * 60 * 1000);
  }
  disconnectedCallback() { clearInterval(this._th); }
  _update() {
    if (this._hass && !this._histPedido) { this._histPedido = true; this._cargarHistorial(); }
    super._update();
  }
  async _cargarHistorial() {
    const c = this._config;
    if (!this._hass || !c) return;
    const ids = [c.descarga, c.subida].filter(Boolean);
    if (!ids.length || c.grafico === false) return;
    try {
      const r = await this._hass.callWS({
        type: 'history/history_during_period',
        start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      this._hist = {};
      ids.forEach((id) => {
        this._hist[id] = (r[id] || []).map((p) => parseFloat(p.s ?? p.state)).filter((x) => !isNaN(x));
      });
      this._histVer = (this._histVer || 0) + 1;
      this._update();
    } catch (e) { /* sin historial disponible */ }
  }
  _linea(serie, max, color) {
    if (!serie || serie.length < 2) return '';
    const pts = serie.slice(-60);
    const paso = 300 / (pts.length - 1);
    const p = pts.map((v, i) => `${(i * paso).toFixed(1)},${(52 - (v / max) * 46).toFixed(1)}`).join(' ');
    return `<polyline points="${p}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" style="filter: drop-shadow(0 0 3px ${color}88)"></polyline>`;
  }
  render() {
    const c = this._config;
    const wan = this.st(c.conexion);
    const dl = this.st(c.descarga);
    const ul = this.st(c.subida);
    const enLinea = wan ? ['on', 'connected', 'conectado', 'home', 'true'].includes(String(wan.state).toLowerCase()) : true;
    const val = (s) => s ? `${numFmt(s.state)} <small>${esc(s.attributes.unit_of_measurement || '')}</small>` : '--';

    let grafico = '';
    if (this._hist && c.grafico !== false && !this._abierto) {
      const sd = [...(this._hist[c.descarga] || []), dl ? parseFloat(dl.state) : NaN].filter((x) => !isNaN(x));
      const su = [...(this._hist[c.subida] || []), ul ? parseFloat(ul.state) : NaN].filter((x) => !isNaN(x));
      const max = Math.max(1, ...sd, ...su);
      grafico = `<svg class="graf" viewBox="0 0 300 56" preserveAspectRatio="none" aria-hidden="true">${this._linea(sd, max, FX.cian)}${this._linea(su, max, FX.violeta)}</svg>`;
    }

    const dispSt = c.dispositivos === 'rastreadores' ? null : this.st(c.dispositivos);
    let lista = c.dispositivos === 'rastreadores' ? this._desdeRastreadores() : [];
    if (dispSt) {
      const attr = dispSt.attributes[c.atributo || 'dispositivos'];
      if (Array.isArray(attr)) {
        lista = attr;
      } else if (typeof attr === 'string' && attr.trim().startsWith('[')) {
        try { lista = JSON.parse(attr.replace(/'/g, '"')); } catch (e) { lista = []; }
      } else if (String(dispSt.state).includes('|')) {
        // Formato de texto: "nombre|ip;nombre|ip;..." (por ejemplo, un input_text)
        const prefijo = c.prefijo_ip ?? '192.168.1.';
        lista = String(dispSt.state).split(';').map((x) => x.trim()).filter(Boolean).map((x) => {
          const [nombre, ip] = x.split('|').map((y) => (y || '').trim());
          const ipCompleta = !ip ? '' : ip.includes('.') ? ip : prefijo + ip;
          return { nombre, ip: ipCompleta };
        });
      }
    }
    const renombrar = c.nombres || {};
    const iconos = c.iconos || {};
    const filas = lista.map((d) => {
      const orig = typeof d === 'string' ? d : (d.nombre || d.name || 'Dispositivo');
      const ip = typeof d === 'string' ? '' : (d.ip || '');
      const low = (typeof d === 'object' && d.clave) ? d.clave : String(orig).toLowerCase();
      const claveN = Object.keys(renombrar).find((k) => low.includes(k.toLowerCase()));
      const claveI = Object.keys(iconos).find((k) => low.includes(k.toLowerCase()));
      const apagado = typeof d === 'object' && d.conectado === false;
      return `<div class="fila" style="${apagado ? 'opacity:.45' : ''}"><ha-icon icon="${esc(claveI ? iconos[claveI] : 'mdi:devices')}"></ha-icon><span class="n">${esc(claveN ? renombrar[claveN] : orig)}</span><span class="tenue ip">${esc(ip)}</span></div>`;
    }).join('');

    this.shadowRoot.innerHTML = `<style>${BASE_CSS}
      .card { padding: 22px; display: flex; flex-direction: column; gap: 10px; min-height: 200px; }
      .cab { display: flex; justify-content: space-between; align-items: center; }
      .on { color: ${FX.verde}; } .off { color: ${FX.rojo}; }
      .vals { display: flex; gap: 22px; flex-wrap: wrap; }
      .v { font-size: 26px; } .v small { font-size: 12px; }
      .graf { width: 100%; height: 56px; }
      .tog { display: flex; justify-content: space-between; align-items: center; background: none; border: none; padding: 6px 0; min-height: 36px; color: ${FX.tenue}; font-size: 12px; letter-spacing: 1px; --mdc-icon-size: 20px; }
      .tog ha-icon { color: ${FX.cian}; transition: transform .2s; }
      .tog.abierto ha-icon { transform: rotate(180deg); }
      .lista { flex: 1 1 0; min-height: 60px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
      .fila { display: flex; align-items: center; gap: 10px; font-size: 14px; --mdc-icon-size: 18px; }
      .fila ha-icon { color: ${FX.tenue}; }
      .n { flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ip { font-size: 12px; }
    </style>
    <div class="card">
      <div class="cab etq">
        <span>${esc(c.nombre || 'Red')}</span>
        <span class="${enLinea ? 'on' : 'off'}">● ${enLinea ? 'En línea' : 'Sin conexión'}</span>
      </div>
      <div class="vals">
        <div><div class="tenue" style="font-size:11px;letter-spacing:1px">↓ DESCARGA</div><div class="d v" style="color:${FX.cian}">${val(dl)}</div></div>
        <div><div class="tenue" style="font-size:11px;letter-spacing:1px">↑ SUBIDA</div><div class="d v" style="color:${FX.violeta}">${val(ul)}</div></div>
      </div>
      ${grafico}
      ${c.dispositivos ? `
        <button class="tog ${this._abierto ? 'abierto' : ''}" id="tog" aria-expanded="${this._abierto ? 'true' : 'false'}">
          <span>${lista.length} DISPOSITIVOS</span><ha-icon icon="mdi:chevron-down"></ha-icon>
        </button>
        ${this._abierto ? `<div class="lista">${filas}</div>` : ''}` : ''}
    </div>`;
    const tog = this.shadowRoot.getElementById('tog');
    if (tog) tog.addEventListener('click', () => { this._abierto = !this._abierto; this.forzar(); });
    this.shadowRoot.querySelector('.cab').addEventListener('click', () => this.masInfo(c.conexion));
  }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, rows: 4, min_rows: 3 }; }
}

/* ------------------------------------------------------------------ */
/* NAS / MEDIDORES                                                     */
/* ------------------------------------------------------------------ */
const COLORES_MEDIDOR = [FX.ambar, FX.cian, FX.violeta, FX.verde];

class FuturistaNasCard extends FxBase {
  static getStubConfig() { return { nombre: 'NAS', medidores: [] }; }
  entidades() {
    const c = this._config;
    return [...(c.medidores || []).map((m) => m.entity), ...(c.filas || []).map((f) => f.entity)].filter(Boolean);
  }
  render() {
    const c = this._config;
    const meds = (c.medidores || []).map((m, i) => {
      const s = this.st(m.entity);
      const v = s ? parseFloat(s.state) : NaN;
      const u = s?.attributes.unit_of_measurement || '';
      const pct = m.max ? (v / m.max) * 100 : v;
      const etq = isNaN(v) ? '--' : m.mostrar === 'valor' ? `${numFmt(v, 0)}` : `${Math.round(pct)}%`;
      const sub = m.mostrar === 'valor' ? esc(m.unidad ?? u) : '';
      const color = m.color || COLORES_MEDIDOR[i % COLORES_MEDIDOR.length];
      return `<button class="m" data-e="${esc(m.entity)}" aria-label="${esc(m.nombre || m.entity)}: ${etq}">
        ${anillo(pct, color, 70, 9, etq, sub)}
        <div class="tenue ml">${esc(m.nombre || '')}</div>
      </button>`;
    }).join('');
    const filas = (c.filas || []).map((f) => {
      const s = this.st(f.entity);
      const u = f.unidad ?? s?.attributes.unit_of_measurement ?? '';
      return `<button class="fila" data-e="${esc(f.entity)}"><span class="tenue">${esc(f.nombre || f.entity)}</span><span>${s ? numFmt(s.state) : '--'} ${esc(u)}</span></button>`;
    }).join('');

    this.shadowRoot.innerHTML = `<style>${BASE_CSS}
      .card { padding: 20px; display: flex; flex-direction: column; gap: 10px; min-height: 200px; }
      .meds { flex-grow: 1; display: grid; grid-template-columns: repeat(${Math.min(Math.max((c.medidores || []).length, 1), 4)}, minmax(0, 1fr)); gap: 4px; align-items: center; }
      .m { display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: none; padding: 0; }
      .ml { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
      .fila { display: flex; justify-content: space-between; background: none; border: none; border-top: 1px solid #1d3552; padding: 8px 0 0 0; font-size: 13px; }
    </style>
    <div class="card">
      <div class="etq">${esc(c.nombre || 'NAS')}</div>
      <div class="meds">${meds}</div>
      ${filas}
    </div>`;
    this.shadowRoot.querySelectorAll('[data-e]').forEach((el) => el.addEventListener('click', () => this.masInfo(el.dataset.e)));
  }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, rows: 4, min_rows: 3 }; }
}

/* ------------------------------------------------------------------ */
/* Registro                                                            */
/* ------------------------------------------------------------------ */
const TARJETAS = [
  ['futurista-clima-card', FuturistaClimaCard, 'Futurista · Clima', 'Cielo ilustrado con sol, nubes animadas y pronóstico por horas.'],
  ['futurista-reloj-card', FuturistaRelojCard, 'Futurista · Reloj', 'Hora grande, fecha y anillo de progreso del día.'],
  ['futurista-estado-card', FuturistaEstadoCard, 'Futurista · Estado', 'Título con chips de estado que avisan cuando algo requiere atención.'],
  ['futurista-roborock-card', FuturistaRoborockCard, 'Futurista · Roborock', 'Batería en anillo y botones de acción.'],
  ['futurista-musica-card', FuturistaMusicaCard, 'Futurista · Música', 'Reproductor con carátula, ecualizador y volumen.'],
  ['futurista-red-card', FuturistaRedCard, 'Futurista · Red', 'Velocidades, gráfico de la última hora y dispositivos conectados.'],
  ['futurista-nas-card', FuturistaNasCard, 'Futurista · NAS', 'Medidores circulares para CPU, RAM, disco o cualquier sensor.'],
];

window.customCards = window.customCards || [];
TARJETAS.forEach(([tag, cls, name, description]) => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  if (!window.customCards.find((c) => c.type === tag)) {
    window.customCards.push({ type: tag, name, description, preview: false });
  }
});

console.info(`%c HA-FUTURISTA %c v${FX_VERSION} `, 'background:#4de2ff;color:#070b12;font-weight:700', 'background:#0e1522;color:#4de2ff');
