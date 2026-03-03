import {
    setCanvas, setDimensions, incFrame, isPaused, timeWarp, frameCount,
    vehicles, getActiveVehicle, spentStages, trail, particles, camera, mapView,
    visualMode, histAlt, histQ, histPitch, histTarget, MAX_HIST, setCameraMode, cameraMode,
    setVisualModeState, getPaused, setPaused, setTimeWarp, setMapView, safeClassRemove,
    safeClassAdd, safeClassToggle, showToast, showDebrief, safeText, updateVehicleListUI,
    el, registerUIHooks, mouse, setMissionType, missionType, setVehicles, setActIdx
} from './core/state.js';
import { SIM, CELESTIALS, MISSIONS } from './physics/constants.js';
import { Vehicle } from './physics/vehicle.js';
import { CFDShader } from './render/cfd.js';
import { draw } from './render/renderer.js';
import { updateUI, drawGraph, drawDualGraph } from './ui/telemetry.js';
import { initDraggable } from './ui/windowManager.js';
import { AudioSys } from './core/audio.js';

let canvasMain, ctxMain, glCanvasMain;

function blkActive(state) {
    const blk = el('blackoutScreen');
    if (blk) {
        if (state) blk.classList.add('active');
        else blk.classList.remove('active');
    }
}

// Bind UI Hooks
registerUIHooks(
    () => { // updateVeh
        const vl = el('vehicleList');
        if (!vl) return;
        let html = '';
        vehicles.forEach((v, idx) => {
            let activeClass = idx === getActiveVehicle() ? 'active' : '';
            html += `<div onclick="window.setVehicle(${idx})" class="btn-mission ${activeClass}">
                        <i class="fas ${v.isMain ? 'fa-rocket' : 'fa-layer-group'} w-4"></i> ${v.name} [${v.profile}]
                     </div>`;
        });
        vl.innerHTML = html;
        if (vehicles.length > 1) safeClassRemove('winVehicles', 'hidden');
    },
    (msg) => { // toast
        const d = document.createElement('div');
        d.className = 'event-toast';
        d.innerHTML = `<i class="fas fa-info-circle mr-2 text-sky-400"></i> ${msg}`;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 4000);
    },
    (success) => { // debrief
        let currentAct = getActiveVehicle();
        if (!currentAct) return;
        safeText('dbStatus', success ? "ORBITAL INSERTION SUCCESS" : "CATASTROPHIC FAILURE");
        const stEl = el('dbStatus');
        if (stEl) stEl.className = success ? "text-2xl font-black text-center tracking-widest mb-4 text-green-500" : "text-2xl font-black text-center tracking-widest mb-4 text-red-500";

        safeText('dbMaxG', currentAct.maxG.toFixed(1) + " G");
        safeText('dbMaxQ', (currentAct.maxQ / 1000).toFixed(1) + " kPa");
        safeText('dbDv', currentAct.totalDv.toFixed(0) + " m/s");

        let margin = Math.max(0, 100 - (currentAct.maxStress / 1000) * 100);
        safeText('dbMargin', margin.toFixed(1) + "%");
        const marEl = el('dbMargin');
        if (marEl) marEl.style.color = margin < 20 ? '#ef4444' : '#22c55e';

        safeClassRemove('winDebrief', 'closed');
    },
    blkActive
);


function init() {
    canvasMain = el('simCanvas'); ctxMain = canvasMain.getContext('2d');
    glCanvasMain = el('glCanvas');
    setCanvas(canvasMain, ctxMain, glCanvasMain);

    CFDShader.init(glCanvasMain);
    resize(); window.addEventListener('resize', resize);

    for (let i = 0; i < 400; i++) particles.push({ type: 'star', x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, sz: Math.random() * 1.5 });

    canvasMain.addEventListener('mousedown', e => {
        AudioSys.init(); mouse.down = true; if (e.button === 2) mouse.right = true;
        mouse.lastX = e.clientX; mouse.lastY = e.clientY;
        if (mapView) camera.locked = false;
    });
    // Use document-level events for smoother release and drag tracking outside canvas
    document.addEventListener('mouseup', (e) => {
        mouse.down = false; mouse.right = false;
    });
    document.addEventListener('mousemove', e => {
        if (!mouse.down && !mouse.right) return;
        // Do not suppress camera movement if dragging started ON canvas but moves outside, 
        // however we shouldn't trigger dragging IF the user initially clicked a UI element.
        // We know they didn't if mouse.down is true.
        if (mouse.right && mapView) { camera.rotY += e.movementX * 0.01; camera.rotX += e.movementY * 0.01; }
        else if (mouse.down && mapView) { camera.x += e.movementX; camera.y += e.movementY; camera.locked = false; }
        mouse.lastX = e.clientX; mouse.lastY = e.clientY;
    });

    canvasMain.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { mouse.down = true; mouse.lastX = e.touches[0].clientX; mouse.lastY = e.touches[0].clientY; }
        else if (e.touches.length === 2) mouse.dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (mapView) camera.locked = false;
    }, { passive: true }); // passive true allows click through

    canvasMain.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && mouse.down) {
            let dx = e.touches[0].clientX - mouse.lastX, dy = e.touches[0].clientY - mouse.lastY;
            if (mapView) { camera.x += dx; camera.y += dy; }
            mouse.lastX = e.touches[0].clientX; mouse.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            let d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (mapView && mouse.dist > 0.1) camera.targetScale *= (d / mouse.dist);
            mouse.dist = d;
        }
    }, { passive: true });

    canvasMain.addEventListener('wheel', e => { if (mapView) camera.targetScale *= e.deltaY > 0 ? 0.9 : 1.1; });
    canvasMain.addEventListener('contextmenu', e => e.preventDefault());

    // Window re-constraint hook
    window.addEventListener('resize', () => {
        document.querySelectorAll('.window').forEach(p => {
            if (!p.classList.contains('closed')) {
                let rect = p.getBoundingClientRect();
                if (rect.right > window.innerWidth) p.style.left = (window.innerWidth - rect.width) + 'px';
                if (rect.bottom > window.innerHeight) p.style.top = (window.innerHeight - rect.height) + 'px';
            }
        });
    });

    initDraggable();
    loop();
}

function resize() {
    if (!canvasMain) return;
    let dpr = window.devicePixelRatio || 1;
    let w = window.innerWidth;
    let h = window.innerHeight;

    // CSS bounds
    canvasMain.style.width = w + 'px'; canvasMain.style.height = h + 'px';
    if (glCanvasMain) { glCanvasMain.style.width = w + 'px'; glCanvasMain.style.height = h + 'px'; }

    // Internal buffer size
    canvasMain.width = w * dpr; canvasMain.height = h * dpr;
    if (glCanvasMain) { glCanvasMain.width = w * dpr; glCanvasMain.height = h * dpr; }

    ctxMain.scale(dpr, dpr);
    setDimensions(w, h);
}

function loop() {
    requestAnimationFrame(loop);
    let steps = getPaused() ? 0 : timeWarp;
    let dt = SIM.dt;

    vehicles.forEach(v => {
        for (let i = 0; i < steps; i++) v.update(dt, frameCount, visualMode, getPaused(), vehicles, missionType);
    });

    let currentAct = getActiveVehicle();
    if (!getPaused() && currentAct) {
        for (let i = 0; i < steps; i++) {
            for (let s of spentStages) { s.x += s.vx * dt; s.y += s.vy * dt; s.a += 0.01 * dt; }
        }
        if (frameCount % 10 === 0 && currentAct.isMain) {
            histAlt.push(currentAct.alt / 1000); histQ.push(currentAct.q / 1000);
            let pActual = (currentAct.angle + Math.PI / 2) * 180 / Math.PI;
            let pTarget = (currentAct.targetAngle + Math.PI / 2) * 180 / Math.PI;
            histPitch.push(pActual); histTarget.push(pTarget);
            if (histAlt.length > MAX_HIST) { histAlt.shift(); histQ.shift(); histPitch.shift(); histTarget.shift(); }
        }
        if (currentAct) trail.push({ x: currentAct.x, y: currentAct.y }); if (trail.length > 1000) trail.shift();
    }

    updateCamera();

    if (visualMode === 'cfd' && !mapView && currentAct && !currentAct.failed) {
        if (glCanvasMain) glCanvasMain.style.display = 'block';
        CFDShader.draw(currentAct, { x: camera.x, y: camera.y, scale: camera.scale, rotZ: camera.rotZ }, visualMode, glCanvasMain);
    } else if (glCanvasMain) {
        glCanvasMain.style.display = 'none';
    }

    draw(vehicles); updateUI();
    if (currentAct) {
        drawGraph('chartAlt', histAlt, '#38bdf8');
        drawGraph('chartQ', histQ, '#f97316');
        drawDualGraph('chartPitch', histPitch, histTarget, '#a855f7', '#94a3b8');
    }
    incFrame();
}

function updateCamera() {
    let currentAct = getActiveVehicle();
    if (!currentAct) return;

    if (!camera.rotZ) camera.rotZ = 0;
    if (!camera.targetRotZ) camera.targetRotZ = 0;
    camera.scale += (camera.targetScale - camera.scale) * 0.1;

    let w = window.innerWidth;
    let h = window.innerHeight;

    if (mapView) {
        if (camera.locked) {
            let x1 = currentAct.x * Math.cos(camera.rotY);
            let z1 = currentAct.x * Math.sin(camera.rotY);
            let y1 = currentAct.y * Math.cos(camera.rotX) - z1 * Math.sin(camera.rotX);
            let z2 = currentAct.y * Math.sin(camera.rotX) + z1 * Math.cos(camera.rotX);

            let div = Math.max(0.1, 1000 + z2 / 1000000);
            let dynS = camera.scale * 1000 / div;

            camera.x += ((w / 2 - x1 * dynS) - camera.x) * 0.1;
            camera.y += ((h / 2 - y1 * dynS) - camera.y) * 0.1;
        }
    } else {
        if (cameraMode === 'booster') {
            camera.targetRotZ = -currentAct.angle - Math.PI / 2;
            camera.x += ((-currentAct.x * camera.scale + w / 2) - camera.x) * 0.2;
            camera.y += ((-currentAct.y * camera.scale + h * 0.3) - camera.y) * 0.2;
        } else if (cameraMode === 'pad') {
            camera.targetRotZ = 0;
            let requiredScale = (h * 0.7) / Math.max(200, currentAct.alt);
            camera.targetScale = Math.min(1.5, Math.max(0.0001, requiredScale));
            camera.x += ((w / 2) - camera.x) * 0.1;
            camera.y += ((h * 0.9 - (-CELESTIALS[0].r) * camera.scale) - camera.y) * 0.1;
        } else { // Chase
            camera.targetRotZ = 0;
            let tx = -currentAct.x * camera.scale + w / 2;
            let ty = -currentAct.y * camera.scale + h * 0.7;
            if (timeWarp > 1) { camera.x = tx; camera.y = ty; } else { camera.x += (tx - camera.x) * 0.2; camera.y += (ty - camera.y) * 0.2; }
        }
        let diff = camera.targetRotZ - camera.rotZ;
        while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
        camera.rotZ += diff * 0.1;
    }
}

// --- GLOBAL EXPORTS FOR HTML BUTTONS ---
window.loadMission = function (k) {
    const d = MISSIONS[k];
    setMissionType(d.type || "DEFAULT");
    let rocket = new Vehicle(d.name, d.rocket.stages, 0, -CELESTIALS[0].r, 0, 0, -Math.PI / 2, true);
    setVehicles([rocket]); setActIdx(0);

    spentStages.length = 0; particles.length = 0; trail.length = 0; histAlt.length = 0; histQ.length = 0; histPitch.length = 0; histTarget.length = 0;
    setPaused(true); setMapView(false); camera.locked = true; setCameraMode('chase');
    safeText('lblCam', 'CHASE');
    const bP = el('btnPause'); if (bP) bP.innerHTML = '<i class="fas fa-play text-xl"></i><span>PLAY</span>';

    safeClassRemove('winMission', 'closed'); safeClassRemove('winTelem', 'closed');
    safeClassAdd('winDebrief', 'closed'); safeClassAdd('winVehicles', 'hidden');
    blkActive(false);

    updateVehicleListUI();
    showToast("MISSION LOADED: " + d.name);
}

window.toggleBuilder = function () { safeClassToggle('winBuild', 'closed'); }

window.launchCustom = function () {
    const d = parseFloat(el('bDry').value), f = parseFloat(el('bFuel').value);
    const t = parseFloat(el('bThrust').value), i = parseFloat(el('bIsp').value);
    setMissionType("DEFAULT");
    let rocket = new Vehicle(el('bName').value, [{ name: "Custom", dry: d, fuel: f, thrust: t, isp: i, w: 5, h: 40, c: '#fff' }], 0, -CELESTIALS[0].r, 0, 0, -Math.PI / 2, true);
    setVehicles([rocket]); setActIdx(0);
    window.toggleBuilder();
    updateVehicleListUI();
    showToast("CUSTOM VEHICLE INTEGRATED");
}

window.togglePause = function () {
    let p = !getPaused();
    AudioSys.init(); setPaused(p);
    const bP = el('btnPause');
    if (bP) bP.innerHTML = p ? '<i class="fas fa-play text-xl"></i><span>PLAY</span>' : '<i class="fas fa-pause text-xl"></i><span>PAUSE</span>';
}

window.setWarp = function (x) {
    setTimeWarp(x);
    document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
    const btn = el('warp' + x); if (btn) btn.classList.add('active');
    showToast("TIME WARP: " + x + "x");
}

window.launchSequence = function () {
    AudioSys.init();
    let currentAct = getActiveVehicle();
    if (currentAct) {
        currentAct.auto = true; currentAct.throttle = 1; setPaused(false);
        const bP = el('btnPause'); if (bP) bP.innerHTML = '<i class="fas fa-pause text-xl"></i><span>PAUSE</span>';
        showToast("AUTO-SEQUENCE START");
    }
}

window.manualStage = function () { let currentAct = getActiveVehicle(); if (currentAct) currentAct.stage(vehicles, missionType); }

window.toggleMap = function () {
    let m = !mapView;
    setMapView(m);
    safeClassToggle('btnMap', 'active');

    let ind = el('mapIndicator');
    if (ind) ind.style.display = m ? 'block' : 'none';

    camera.targetScale = m ? 0.005 : 1;
    if (m) { camera.x = window.innerWidth / 2; camera.y = window.innerHeight / 2; camera.locked = true; showToast("ORBITAL TRACKING"); }
    else showToast("LAUNCH VIEW");
}

window.cycleCamera = function () {
    if (mapView) { showToast("CAM FIXED IN MAP VIEW"); return; }
    const modes = ['chase', 'pad', 'booster'];
    setCameraMode(modes[(modes.indexOf(cameraMode) + 1) % modes.length]);
    safeText('lblCam', cameraMode.toUpperCase());
    showToast("CAMERA: " + cameraMode.toUpperCase());
}

window.skipToOrbit = function () {
    let currentAct = getActiveVehicle();
    if (!currentAct) return;
    currentAct.x = 0; currentAct.y = -(SIM.EarthRadius || 6371000 + 250000);
    currentAct.vx = Math.sqrt(SIM.G * CELESTIALS[0].m / (CELESTIALS[0].r + 250000)); currentAct.vy = 0;
    currentAct.throttle = 0; currentAct.auto = false; currentAct.fuel = currentAct.mf * 0.1;
    if (!mapView) window.toggleMap();
    showToast("ORBITAL INSERTION COMPLETE");
}

window.resetCamera = function () { camera.locked = true; camera.rotX = 0; camera.rotY = 0; camera.targetRotZ = 0; camera.rotZ = 0; showToast("CAMERA LOCKED"); }
window.togglePanel = function (id) { safeClassToggle(id, 'closed'); }
window.closePanel = function (id) { safeClassAdd(id, 'closed'); }
window.toggleMin = function (id) { safeClassToggle(id, 'minimized'); }
window.setVehicle = function (idx) {
    if (vehicles[idx]) {
        setActIdx(idx);
        updateVehicleListUI();
        showToast("TRACKING: " + vehicles[idx].name);
    }
}
window.setVisualMode = function (m) {
    setVisualModeState(m);
    document.querySelectorAll('.btn-ctrl').forEach(b => {
        if (b.id && b.id.startsWith('mode')) b.classList.remove('active');
    });
    const btn = el('mode' + m.charAt(0).toUpperCase() + m.slice(1));
    if (btn) btn.classList.add('active');
    updateUI(); showToast("VISUAL MODE: " + m.toUpperCase());
}

window.exportData = function () {
    if (histAlt.length === 0) return alert("No Data");
    let csv = "Time,Alt,Q,Pitch,TargetPitch\n";
    for (let i = 0; i < histAlt.length; i++) csv += `${i * 0.1},${histAlt[i].toFixed(2)},${histQ[i].toFixed(2)},${histPitch[i]?.toFixed(2)},${histTarget[i]?.toFixed(2)}\n`;
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); a.download = 'telemetry.csv'; a.click();
}

// Map WASD Controls
window.addEventListener('keydown', e => {
    let currentAct = getActiveVehicle();
    if (!currentAct || currentAct.failed) return;
    if (e.key === 'w') { currentAct.throttle = Math.min(1, currentAct.throttle + 0.1); currentAct.auto = false; }
    if (e.key === 's') { currentAct.throttle = Math.max(0, currentAct.throttle - 0.1); currentAct.auto = false; }
    if (e.key === ' ') window.manualStage();
});

// Boot Default
init();
window.loadMission('FALCON_HEAVY');
