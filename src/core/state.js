// Global mutable state to hold canvas refs, vehicles, UI states etc.
export let canvas, ctx, glCanvas, gl, width, height;
export let vehicles = [];
export let actIdx = 0;
export let camera = { x: 0, y: 0, scale: 1, targetScale: 1, rotX: 0, rotY: 0, rotZ: 0, targetRotZ: 0, locked: true };
export let cameraMode = 'chase';
export let particles = [], spentStages = [];
export let visualMode = 'real', isPaused = true, timeWarp = 1, mapView = false;
export let histAlt = [], histQ = [], histPitch = [], histTarget = [], trail = [];
export let missionType = "DEFAULT";
export let mouse = { x: 0, y: 0, down: false, right: false, lastX: 0, lastY: 0, dist: 1 };
export let frameCount = 0;

export const MAX_HIST = 300;

export function getActiveVehicle() { return vehicles[actIdx]; }

export function setCanvas(c, cx, gc) {
    canvas = c; ctx = cx; glCanvas = gc;
}

export function setDimensions(w, h) {
    width = w; height = h;
}

export function incFrame() { frameCount++; }

export function setVisualModeState(m) { visualMode = m; }
export function setPaused(p) { isPaused = p; }
export function getPaused() { return isPaused; }
export function setTimeWarp(w) { timeWarp = w; }
export function setMapView(m) { mapView = m; }
export function setCameraMode(m) { cameraMode = m; }
export function setMissionType(m) { missionType = m; }
export function setVehicles(v) { vehicles = v; }
export function setActIdx(idx) { actIdx = idx; }

// Dummy hooks for circular UI updates (injected later from main)
export let updateVehicleListUI = () => { };
export let showToast = () => { };
export let showDebrief = () => { };
export let blkActive = () => { };

export function registerUIHooks(updateVeh, toast, debrief, blk) {
    updateVehicleListUI = updateVeh;
    showToast = toast;
    showDebrief = debrief;
    blkActive = blk;
}

export function el(id) { return document.getElementById(id); }
export function safeText(id, t) { const e = el(id); if (e) e.innerHTML = t; }
export function safeClassRemove(id, c) { const e = el(id); if (e) e.classList.remove(c); }
export function safeClassAdd(id, c) { const e = el(id); if (e) e.classList.add(c); }
export function safeClassToggle(id, c) { const e = el(id); if (e) e.classList.toggle(c); }
export function safeStyleDisplay(id, v) { const e = el(id); if (e) e.style.display = v; }

export function getTurboColor(t) {
    t = Math.max(0, Math.min(1, t));
    let r = 0, g = 0, b = 0;
    if (t < 0.25) { g = t * 4; b = 1; } else if (t < 0.5) { g = 1; b = 1 - (t - 0.25) * 4; }
    else if (t < 0.75) { r = (t - 0.5) * 4; g = 1; } else { r = 1; g = 1 - (t - 0.75) * 4; }
    return `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
}
