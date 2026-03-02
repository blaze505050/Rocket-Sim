import {
    canvas, ctx, width, height, camera, mapView, getActiveVehicle, visualMode,
    particles, spentStages, trail, frameCount, getTurboColor, el, SIM, CELESTIALS
} from '../core/state.js';

export function project(x, y, z) {
    let rx = x, ry = y, rz = z;
    const currentAct = getActiveVehicle();

    if (mapView) {
        let x1 = x * Math.cos(camera.rotY) - z * Math.sin(camera.rotY);
        let z1 = x * Math.sin(camera.rotY) + z * Math.cos(camera.rotY);
        let y1 = y * Math.cos(camera.rotX) - z1 * Math.sin(camera.rotX);
        let z2 = y * Math.sin(camera.rotX) + z1 * Math.cos(camera.rotX);
        rx = x1; ry = y1; rz = z2;
    } else if (camera.rotZ && currentAct) {
        let dx = x - currentAct.x, dy = y - currentAct.y;
        let cZ = Math.cos(camera.rotZ), sZ = Math.sin(camera.rotZ);
        rx = currentAct.x + dx * cZ - dy * sZ;
        ry = currentAct.y + dx * sZ + dy * cZ;
    }

    let scale = camera.scale;
    if (mapView) {
        let div = 1000 + rz / 1000000;
        if (div < 0.1) div = 0.1;
        scale = scale * 1000 / div;
    }
    if (!Number.isFinite(scale) || scale < 1e-9) scale = 1e-9;
    return { x: rx * scale + camera.x, y: ry * scale + camera.y, z: rz, s: scale };
}

function safeRadialGradient(ctx, x1, y1, r1, x2, y2, r2) {
    if (Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(r1) && r1 >= 0 &&
        Number.isFinite(x2) && Number.isFinite(y2) && Number.isFinite(r2) && r2 >= 0) {
        try { return ctx.createRadialGradient(x1, y1, r1, x2, y2, r2); } catch (e) { return null; }
    } return null;
}

export function draw(vehicles) {
    let currentAct = getActiveVehicle();

    if (visualMode === 'cfd' && !mapView) ctx.clearRect(0, 0, width, height);
    else {
        let sky = "#020406";
        if (currentAct && !mapView && !currentAct.failed) {
            let p = Math.exp(-currentAct.alt / 10000);
            sky = `rgb(${Math.floor(10 * p)},${Math.floor(25 * p)},${Math.floor(45 * p)})`;
        }
        ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    }

    let bgP = currentAct && !mapView && !currentAct.failed ? Math.exp(-currentAct.alt / 10000) : 0;
    let starAlpha = (1 - bgP) * 0.8 + 0.2;

    for (let p of particles) if (p.type === 'star') {
        ctx.fillStyle = `rgba(255,255,255,${starAlpha * (0.3 + Math.sin(frameCount * 0.1 + p.x) * 0.5)})`;
        ctx.fillRect(p.x, p.y, p.sz, p.sz);
    }

    if (!mapView || camera.scale > 0.0001) {
        for (let b of CELESTIALS) {
            const p = project(b.x, b.y, 0);
            const r = b.r * p.s;
            if (Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(r) && r > 0.5) {
                if (b.atm > 0 && r > 10 && (!mapView && visualMode !== 'cfd')) {
                    const g = safeRadialGradient(ctx, p.x, p.y, r * 0.9, p.x, p.y, r * 1.3);
                    if (g) {
                        g.addColorStop(0, "#1e3a8a"); g.addColorStop(1, "transparent");
                        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.3, 0, Math.PI * 2); ctx.fill();
                    }
                }
                ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
                if (mapView && r < 80) { ctx.fillStyle = "#fff"; ctx.font = "10px Orbitron"; ctx.fillText(b.name, p.x + r + 5, p.y + 4); }
            }
        }
    }

    vehicles.forEach(v => {
        if (v.failed) return;
        const rp = project(v.x, v.y, 0);

        if (!mapView && v.alt < 500 && v.isMain) {
            const towP = project(v.w * 1.5, -CELESTIALS[0].r, 0);
            if (Number.isFinite(towP.x) && Number.isFinite(towP.y)) {
                ctx.save(); ctx.translate(towP.x, towP.y); ctx.rotate(camera.rotZ || 0);
                ctx.fillStyle = "#334155";
                let retract = Math.min(1, Math.max(0, v.alt / 15));
                ctx.rotate(retract * Math.PI / 4);
                ctx.fillRect(0, -v.h * camera.scale, v.w * 0.5 * camera.scale, v.h * camera.scale);
                ctx.restore();
            }
        }

        if (!mapView) {
            if (Number.isFinite(rp.x) && Number.isFinite(rp.y)) {
                ctx.save(); ctx.translate(rp.x, rp.y);
                ctx.rotate(v.angle + Math.PI / 2 + (camera.rotZ || 0));
                const w = v.w * rp.s, h = v.h * rp.s;

                if (visualMode === 'real' || visualMode === 'cfd') {
                    ctx.fillStyle = v.color; ctx.fillRect(-w / 2, -h / 2, w, h);
                    ctx.save(); ctx.translate(0, h / 2); ctx.rotate(v.gimbal);
                    ctx.fillStyle = "#555"; ctx.beginPath(); ctx.moveTo(-w * 0.4, 0); ctx.lineTo(w * 0.4, 0); ctx.lineTo(w * 0.6, w); ctx.lineTo(-w * 0.6, w); ctx.fill();

                    if (v.throttle > 0) {
                        let pratio = 1.0 - Math.exp(-v.alt / 8500);
                        let expand = 1 + pratio * 8;
                        ctx.fillStyle = v.alt > 50000 ? "#a855f7" : "#fb923c";
                        ctx.beginPath(); ctx.moveTo(-w * 0.5, w); ctx.lineTo(0, w + w * 4 * v.throttle); ctx.lineTo(w * 0.5, w); ctx.fill();

                        if (pratio > 0.1) {
                            const jf = safeRadialGradient(ctx, 0, w, 0, 0, w * 10, w * expand * 1.5);
                            if (jf) {
                                jf.addColorStop(0, `rgba(150, 200, 255, ${0.6 * pratio * v.throttle})`); jf.addColorStop(1, "transparent");
                                ctx.fillStyle = jf; ctx.beginPath(); ctx.moveTo(-w * 0.5, w);
                                ctx.quadraticCurveTo(-w * expand * 2, w * 5, 0, w * 15); ctx.quadraticCurveTo(w * expand * 2, w * 5, w * 0.5, w); ctx.fill();
                            }
                        }
                        if (v.mach > 1 && pratio < 0.8) {
                            ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - pratio)})`;
                            for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(0, w + (w * 1.5) * i, w * 0.3 * expand, 0, Math.PI * 2); ctx.fill(); }
                        }
                    }
                    ctx.restore();

                    if (v.mach > 5 && pratio < 0.9) {
                        ctx.fillStyle = `rgba(255, 100, 50, ${Math.min(1, (v.mach - 5) / 10)})`;
                        ctx.beginPath(); ctx.arc(0, -h / 2, w * 1.5, 0, Math.PI, true); ctx.fill();
                    }
                } else {
                    ctx.lineWidth = 0.5;
                    for (let tri of v.tris) {
                        let n1 = v.nodes[tri[0]], n2 = v.nodes[tri[1]], n3 = v.nodes[tri[2]];
                        if (!n1 || !n2 || !n3) continue;
                        let avg = (n1.s + n2.s + n3.s) / 3;
                        let val = visualMode === 'fea' ? Math.min(1, avg / 200) : Math.min(1, ((n1.t + n2.t + n3.t) / 3 - 20) / 1500);

                        ctx.fillStyle = getTurboColor(val);
                        ctx.beginPath();
                        ctx.moveTo(n1.rx * rp.s + n1.dx * rp.s, n1.ry * rp.s + n1.dy * rp.s);
                        ctx.lineTo(n2.rx * rp.s + n2.dx * rp.s, n2.ry * rp.s + n2.dy * rp.s);
                        ctx.lineTo(n3.rx * rp.s + n3.dx * rp.s, n3.ry * rp.s + n3.dy * rp.s);
                        ctx.closePath(); ctx.fill();
                        if (el('chkMesh') && el('chkMesh').checked) { ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.stroke(); }
                    }
                }
                ctx.restore();
            }
        } else {
            if (Number.isFinite(rp.x) && Number.isFinite(rp.y)) { ctx.fillStyle = v.isMain ? "#fff" : "#fb923c"; ctx.fillRect(rp.x - 2, rp.y - 2, 4, 4); }
            if (v.isMain) drawGhostOrbit(v);
        }
    });

    if (trail.length > 1 && currentAct) {
        ctx.beginPath(); ctx.strokeStyle = "rgba(102, 252, 241, 0.4)"; ctx.lineWidth = 2;
        for (let t of trail) {
            const tp = project(t.x, t.y, 0);
            if (Number.isFinite(tp.x) && Number.isFinite(tp.y)) ctx.lineTo(tp.x, tp.y);
        }
        ctx.stroke();
    }

    for (let s of spentStages) {
        const sp = project(s.x, s.y, 0);
        if (Number.isFinite(sp.x) && Number.isFinite(sp.y)) {
            ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(s.a + Math.PI / 2 + (mapView ? 0 : (camera.rotZ || 0)));
            ctx.fillStyle = "#475569"; ctx.fillRect(-s.w / 2 * sp.s, -s.h / 2 * sp.s, s.w * sp.s, s.h * sp.s);
            ctx.restore();
        }
    }

    const chkStream = el('chkStream');
    const showStream = chkStream ? chkStream.checked : true;

    for (let i = particles.length - 1; i >= 0; i--) {
        let pt = particles[i]; if (pt.type === 'star') continue;
        if (pt.type === 'stream' && visualMode === 'cfd' && !mapView && showStream && currentAct) {
            const pp = project(pt.x, pt.y, 0);
            if (Number.isFinite(pp.x) && Number.isFinite(pp.y)) { ctx.fillStyle = pt.c || '#fff'; ctx.fillRect(pp.x, pp.y, 2, 2); }
            let dx = pt.x - currentAct.x, dy = pt.y - currentAct.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < currentAct.h * 2) { pt.x -= currentAct.vx * SIM.dt; pt.y -= currentAct.vy * SIM.dt; }
            pt.life -= 0.05;
        } else if (pt.type !== 'stream') {
            pt.x += pt.vx * SIM.dt; pt.y += pt.vy * SIM.dt; pt.life -= 0.05;
            if (!mapView) {
                const pp = project(pt.x, pt.y, 0);
                if (Number.isFinite(pp.x) && Number.isFinite(pp.y)) {
                    ctx.fillStyle = pt.c || `rgba(251, 146, 60,${pt.life})`;
                    ctx.beginPath(); ctx.arc(pp.x, pp.y, (pt.sz || 2) * camera.scale, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
        if (pt.life <= 0 || (pt.type === 'stream' && (!showStream || visualMode !== 'cfd'))) particles.splice(i, 1);
    }
}

export function drawGhostOrbit(v) {
    if (!v || v.failed) return;
    const dom = v.domBody; const mu = SIM.G * dom.m;
    let rx = v.x - dom.x, ry = v.y - dom.y;
    let r = Math.sqrt(rx * rx + ry * ry); let v2 = v.vx ** 2 + v.vy ** 2;
    let E = v2 / 2 - mu / r;
    if (E >= 0) return;

    const a = -mu / (2 * E);
    const period = 2 * Math.PI * Math.sqrt(a ** 3 / mu);
    const steps = 150; const pdt = period / steps;

    let simX = v.x, simY = v.y, simVx = v.vx, simVy = v.vy;

    ctx.beginPath(); ctx.strokeStyle = "rgba(102,252,241,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    for (let i = 0; i <= steps; i++) {
        const p = project(simX, simY, 0);
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
            if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        let dx = dom.x - simX, dy = dom.y - simY;
        let dist3 = Math.pow(dx * dx + dy * dy, 1.5);
        simVx += SIM.G * dom.m * dx / dist3 * pdt; simVy += SIM.G * dom.m * dy / dist3 * pdt;
        simX += simVx * pdt; simY += simVy * pdt;
    }
    ctx.stroke(); ctx.setLineDash([]);
}
