import { el, safeText, visualMode } from '../core/state.js';
import { getActiveVehicle, MAX_HIST } from '../core/state.js';
import { SIM } from '../physics/constants.js';

export function drawNavball() {
    const cv = el('navballCanvas'); if (!cv) return;
    const cx = cv.getContext('2d'); const w = cv.width, h = cv.height;
    cx.clearRect(0, 0, w, h);

    let currentAct = getActiveVehicle();
    if (!currentAct) return;

    cx.save(); cx.translate(w / 2, h / 2);
    let pitch = currentAct.angle + Math.PI / 2; cx.rotate(-pitch);

    cx.fillStyle = '#1e3a8a'; cx.beginPath(); cx.arc(0, 0, w / 2, Math.PI, 0); cx.fill();
    cx.fillStyle = '#78350f'; cx.beginPath(); cx.arc(0, 0, w / 2, 0, Math.PI); cx.fill();

    cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(-w / 2, 0); cx.lineTo(w / 2, 0); cx.stroke();
    cx.strokeStyle = 'rgba(255,255,255,0.6)'; cx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
        let y = i * (w / 2 / 3);
        cx.beginPath(); cx.moveTo(-10, -y); cx.lineTo(10, -y); cx.stroke();
        cx.beginPath(); cx.moveTo(-10, y); cx.lineTo(10, y); cx.stroke();
    }
    cx.restore();

    cx.strokeStyle = '#fb923c'; cx.lineWidth = 1.5; cx.beginPath();
    cx.moveTo(w / 2 - 10, h / 2); cx.lineTo(w / 2 - 3, h / 2); cx.lineTo(w / 2, h / 2 + 3); cx.lineTo(w / 2 + 3, h / 2); cx.lineTo(w / 2 + 10, h / 2);
    cx.stroke();
}

export function drawGraph(id, data, c) {
    const cv = el(id); if (!cv) return;
    const cx = cv.getContext('2d');
    if (cv.width !== cv.offsetWidth) { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.strokeStyle = "rgba(56, 189, 248, 0.1)"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(0, cv.height / 2); cx.lineTo(cv.width, cv.height / 2); cx.stroke();
    if (data.length < 2) return;
    const max = Math.max(...data, 10);
    cx.beginPath(); cx.strokeStyle = c; cx.lineWidth = 2;
    const sx = cv.width / MAX_HIST;
    for (let i = 0; i < data.length; i++) {
        const x = i * sx, y = cv.height - (data[i] / max) * cv.height;
        if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
    }
    cx.stroke();
}

export function drawDualGraph(id, data1, data2, c1, c2) {
    const cv = el(id); if (!cv) return;
    const cx = cv.getContext('2d');
    if (cv.width !== cv.offsetWidth) { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.strokeStyle = "rgba(56, 189, 248, 0.1)"; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(0, cv.height / 2); cx.lineTo(cv.width, cv.height / 2); cx.stroke();
    if (data1.length < 2) return;
    const max = 90; const sx = cv.width / MAX_HIST;

    cx.beginPath(); cx.strokeStyle = c2; cx.lineWidth = 1; cx.setLineDash([3, 3]);
    for (let i = 0; i < data2.length; i++) {
        const x = i * sx, y = cv.height - (data2[i] / max) * cv.height;
        if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
    }
    cx.stroke(); cx.setLineDash([]);

    cx.beginPath(); cx.strokeStyle = c1; cx.lineWidth = 2;
    for (let i = 0; i < data1.length; i++) {
        const x = i * sx, y = cv.height - (data1[i] / max) * cv.height;
        if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
    }
    cx.stroke();
}

export function updateUI() {
    let currentAct = getActiveVehicle();
    if (!currentAct) return;

    safeText('dispAlt', (currentAct.alt / 1000).toFixed(1));
    safeText('dispVel', currentAct.velocity.toFixed(0));
    safeText('dispMach', "MACH " + currentAct.mach.toFixed(2));
    safeText('telQ', (currentAct.q / 1000).toFixed(1) + " kPa");

    safeText('valThrot', (currentAct.throttle * 100).toFixed(0) + "%");
    const barT = el('barThrot');
    if (barT) barT.style.width = (currentAct.throttle * 100) + "%";

    const mfb = el('multiFuelBars');
    if (mfb) {
        let html = '';
        currentAct.stgs.forEach((stg, idx) => {
            if (idx < currentAct.si) html += `<div class="flex-1 bg-gray-800 rounded overflow-hidden"></div>`;
            else if (idx === currentAct.si) html += `<div class="flex-1 bg-gray-800 rounded overflow-hidden"><div class="h-full bg-cyan-500 transition-all duration-75" style="width: ${Math.max(0, (currentAct.fuel / stg.fuel) * 100)}%"></div></div>`;
            else html += `<div class="flex-1 bg-gray-800 rounded overflow-hidden"><div class="h-full bg-cyan-800 transition-all duration-75" style="width: 100%"></div></div>`;
        });
        mfb.innerHTML = html;
    }

    const dom = currentAct.domBody;
    const mu = SIM.G * dom.m;
    const r = Math.sqrt((currentAct.x - dom.x) ** 2 + (currentAct.y - dom.y) ** 2);
    const E = (currentAct.velocity ** 2) / 2 - mu / r;

    let ap = "--", pe = "--", a_str = "--", e_str = "--", t_str = "--";
    if (E < 0) {
        const a = -mu / (2 * E);
        let rx = currentAct.x - dom.x, ry = currentAct.y - dom.y;
        let h_mag = Math.abs(rx * currentAct.vy - ry * currentAct.vx);
        const e = Math.sqrt(1 + (2 * E * h_mag * h_mag) / (mu * mu));
        ap = (((a * (1 + e)) - dom.r) / 1000).toFixed(0) + " km";
        pe = (((a * (1 - e)) - dom.r) / 1000).toFixed(0) + " km";
        a_str = (a / 1000).toFixed(0); e_str = e.toFixed(3);
        t_str = (2 * Math.PI * Math.sqrt(a ** 3 / mu) / 60).toFixed(1);
    } else { ap = "ESCAPE"; }

    safeText('telAp', ap); safeText('telPe', pe);
    safeText('orbA', a_str); safeText('orbE', e_str); safeText('orbI', "0.00"); safeText('orbT', t_str);

    const leg = el('mfdLegend');
    if (visualMode !== 'real' && leg) {
        leg.classList.remove('hidden');
        let max = 1.0, unit = "";
        if (visualMode === 'cfd') { max = 1.0; unit = "Cp"; }
        if (visualMode === 'fea') { max = 200; unit = "MPa"; }
        if (visualMode === 'thermal') { max = 1500; unit = "K"; }
        safeText('legMax', max); safeText('legMin', "0"); safeText('mfdVal', unit);
    } else if (leg) leg.classList.add('hidden');

    drawNavball();
}
