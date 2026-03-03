import { SIM, CELESTIALS } from './constants.js';
import { integrateRK4 } from './math.js';
import { particles, spentStages, getActiveVehicle, updateVehicleListUI, showDebrief, showToast, el, blkActive } from '../core/state.js';
import { AudioSys } from '../core/audio.js';

export class Vehicle {
    constructor(name, stgs, x, y, vx, vy, angle, isMain = true) {
        this.name = name;
        this.stgs = JSON.parse(JSON.stringify(stgs)); this.si = 0;
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.angle = angle; this.omega = 0;

        this.pid = { i: 0 };
        this.throttle = 0; this.auto = false; this.gimbal = 0; this.failed = false;
        this.q = 0; this.mach = 0; this.stress = 0; this.domBody = CELESTIALS[0];
        this.heatShield = 100;
        this.profile = 'ASCENT';
        this.isMain = isMain;

        this.maxG = 0; this.maxQ = 0; this.maxStress = 0; this.totalDv = 0;
        this.debriefed = false; this.targetAngle = -Math.PI / 2;

        this.loadS();
    }

    loadS() {
        const stg = this.stgs[this.si];
        this.dry = stg.dry; this.mf = stg.fuel; this.th = stg.thrust; this.isp = stg.isp;
        this.w = stg.w; this.h = stg.h; this.color = stg.c; this.fuel = stg.fuel;
        this.genMesh();
    }

    get mass() {
        let m = this.dry + Math.max(0, this.fuel);
        for (let i = this.si + 1; i < this.stgs.length; i++) m += this.stgs[i].dry + this.stgs[i].fuel;
        return m;
    }
    get alt() { return Math.sqrt(this.x ** 2 + this.y ** 2) - CELESTIALS[0].r; }
    get velocity() { return Math.sqrt(this.vx ** 2 + this.vy ** 2); }

    genMesh() {
        this.nodes = []; this.tris = []; const rows = 12, cols = 4;
        for (let i = 0; i <= rows; i++) {
            for (let j = 0; j <= cols; j++) {
                let jx = (i > 0 && i < rows && j > 0 && j < cols) ? (Math.random() - 0.5) * 0.2 : 0;
                let jy = (i > 0 && i < rows && j > 0 && j < cols) ? (Math.random() - 0.5) * 0.2 : 0;
                this.nodes.push({ rx: (j / cols - 0.5 + jx) * this.w, ry: (i / rows - 0.5 + jy) * this.h, s: 0, t: 20, dx: 0, dy: 0 });
            }
        }
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let n1 = i * (cols + 1) + j, n2 = n1 + 1, n3 = (i + 1) * (cols + 1) + j, n4 = n3 + 1;
                if ((i + j) % 2 === 0) { this.tris.push([n1, n2, n4]); this.tris.push([n1, n4, n3]); }
                else { this.tris.push([n1, n2, n3]); this.tris.push([n2, n4, n3]); }
            }
        }
    }

    stage(vehicles, missionType) {
        if (this.si < this.stgs.length - 1) {
            const s = this.stgs[this.si];

            if (missionType === 'FH' && this.si === 0) {
                let b1 = new Vehicle("Side Booster 1", [s], this.x - 10, this.y, this.vx, this.vy, this.angle, false);
                let b2 = new Vehicle("Side Booster 2", [s], this.x + 10, this.y, this.vx, this.vy, this.angle, false);
                b1.profile = 'RTLS'; b2.profile = 'RTLS'; b1.auto = true; b2.auto = true;
                b1.fuel = s.fuel * 0.1; b2.fuel = s.fuel * 0.1;
                vehicles.push(b1, b2);
                showToast("SIDE BOOSTERS SEP - RTLS INITIATED");
            } else if (missionType === 'STARSHIP' && this.si === 0) {
                let sh = new Vehicle("SuperHeavy", [s], this.x, this.y, this.vx, this.vy, this.angle, false);
                sh.profile = 'RTLS'; sh.auto = true; sh.fuel = s.fuel * 0.1;
                vehicles.push(sh);
                this.profile = 'BELLYFLOP';
                showToast("MECO & STAGE SEP");
            } else {
                spentStages.push({ x: this.x, y: this.y, vx: this.vx - Math.cos(this.angle) * 20, vy: this.vy - Math.sin(this.angle) * 20, a: this.angle, w: this.w, h: this.h, c: this.color });
                showToast(`STAGE ${this.si + 1} SEPARATION`);
            }

            this.si++; this.loadS();

            for (let i = 0; i < 60; i++) {
                let ang = this.angle + (Math.random() - 0.5) * Math.PI;
                let spd = 50 + Math.random() * 150;
                particles.push({
                    type: 'smoke', x: this.x - Math.cos(this.angle) * (this.h / 2), y: this.y - Math.sin(this.angle) * (this.h / 2),
                    vx: this.vx - Math.cos(ang) * spd, vy: this.vy - Math.sin(ang) * spd,
                    life: 1.5 + Math.random(), sz: Math.random() * 8 + 4, c: `rgba(240, 248, 255, 0.8)`
                });
            }
            updateVehicleListUI();
            return true;
        } return false;
    }

    getAutoPilotTarget() {
        let up = Math.atan2(this.y, this.x);
        let alt = this.alt;

        if (this.profile === 'ASCENT') {
            if (alt < 1000) return up;
            else if (alt < 100000) return up + (Math.PI / 2) * Math.pow((alt - 1000) / 99000, 0.7);
            else return Math.atan2(this.vy, this.vx);
        }
        else if (this.profile === 'RTLS') {
            if (this.vy < -10) {
                let targetVel = -(alt / 15);
                if (alt < 5000) {
                    this.throttle = this.vy < targetVel ? Math.min(1, Math.abs(this.vy - targetVel) * 0.1) : 0;
                    if (alt < 50) { if (this.velocity < 5) this.profile = 'LANDED'; }
                } else this.throttle = 0;
                return up;
            } else {
                this.throttle = 0;
                return up + Math.PI;
            }
        }
        else if (this.profile === 'BELLYFLOP') {
            if (alt > 2000) {
                this.throttle = 0; return up + Math.PI / 2;
            } else {
                this.throttle = 1.0; return up;
            }
        }
        else if (this.profile === 'LANDED') {
            this.throttle = 0; return up;
        }
        return up;
    }

    getDeriv(state) {
        let [x, y, vx, vy, th, om, fm] = state;
        if (fm < 0) fm = 0;
        let m = this.dry + fm;
        for (let i = this.si + 1; i < this.stgs.length; i++) m += this.stgs[i].dry + this.stgs[i].fuel;
        let I = m * (this.h ** 2 + this.w ** 2) / 12;

        let ax = 0, ay = 0, minAlt = Infinity;
        let currentDom = CELESTIALS[0];

        for (let b of CELESTIALS) {
            let dx = b.x - x, dy = b.y - y;
            let distSq = dx * dx + dy * dy;
            let dist = Math.sqrt(distSq);
            if (dist - b.r < minAlt) { minAlt = dist - b.r; currentDom = b; }
            let force = SIM.G * b.m / distSq;
            ax += force * (dx / dist); ay += force * (dy / dist);
        }

        // --- UPGRADED ATMOSPHERE MODEL (Approximation of US Standard 1976) ---
        let rho = 0, speedOfSound = 343;
        if (currentDom.atm > 0 && minAlt < currentDom.atm * 10) {
            // Simplified standard atmosphere for Earth
            if (minAlt < 11000) {
                let temp = 288.15 - 0.00649 * minAlt;
                let press = 101325 * Math.pow(288.15 / temp, -5.255877);
                rho = press / (287.05 * temp);
                speedOfSound = Math.sqrt(1.4 * 287.05 * temp);
            } else if (minAlt < 20000) {
                let temp = 216.65;
                let press = 22632 * Math.exp(-9.80665 * (minAlt - 11000) / (287.05 * 216.65));
                rho = press / (287.05 * temp);
                speedOfSound = Math.sqrt(1.4 * 287.05 * temp);
            } else {
                // Decay quickly above 20km for performance
                rho = 0.088 * Math.exp(-(minAlt - 20000) / 6000);
                speedOfSound = 295;
            }
            if (currentDom.name !== "Earth") {
                // Fallback for Mars / other bodies
                rho = currentDom.rho * Math.exp(-minAlt / currentDom.atm);
            }
        }

        let v = Math.sqrt(vx * vx + vy * vy);
        this.machCalculated = v / speedOfSound;
        let q = 0.5 * rho * v * v;

        let F_drag = 0, tau_aero = 0;
        if (v > 0) {
            let cd = (this.machCalculated > 0.8 && this.machCalculated < 1.2) ? 0.9 : 0.5;
            if (this.profile === 'BELLYFLOP' && minAlt > 2000) cd = 1.5;

            F_drag = q * cd * (this.w * (this.profile === 'BELLYFLOP' ? this.h : this.w));

            let vHeading = Math.atan2(vy, vx);
            let aoa = vHeading - th;
            while (aoa > Math.PI) aoa -= 2 * Math.PI; while (aoa < -Math.PI) aoa += 2 * Math.PI;

            let L_com = this.h * (0.4 + 0.1 * (fm / (this.mf || 1)));
            let L_cop = this.h * 0.6;
            let F_normal = F_drag * Math.sin(aoa) * 3;
            tau_aero = F_normal * (L_cop - L_com);

            ax -= (F_drag / m) * (vx / v); ay -= (F_drag / m) * (vy / v);
        }

        let F_t = 0, tau_thrust = 0, mdot = 0;
        if (fm > 0 && this.throttle > 0) {
            F_t = this.th * this.throttle;
            mdot = -F_t / (this.isp * 9.81);
            let L_com = this.h * (0.4 + 0.1 * (fm / (this.mf || 1)));
            tau_thrust = -F_t * Math.sin(this.gimbal) * L_com;
            ax += (F_t / m) * Math.cos(th + this.gimbal); ay += (F_t / m) * Math.sin(th + this.gimbal);
        }

        let alpha = (tau_aero + tau_thrust) / I;
        return [vx, vy, ax, ay, om, alpha, mdot];
    }

    update(dt, frameCount, visualMode, isPaused, vehicles, missionType) {
        if (this.failed) return;

        let r_earth = Math.sqrt(this.x ** 2 + this.y ** 2);
        if (r_earth <= CELESTIALS[0].r) {
            if (this.profile === 'LANDED' || (this.profile === 'RTLS' && this.velocity < 15)) {
                this.vx = 0; this.vy = 0; this.omega = 0;
                // Fix for NaN ORBIT bug: Normalize the coordinates exactly to the planet radius instead of hardcoding y.
                let norm = CELESTIALS[0].r / r_earth;
                this.x *= norm; this.y *= norm;
                this.profile = 'LANDED';
                this.angle = Math.atan2(this.y, this.x); this.throttle = 0;
                if (this.isMain && !this.debriefed) { this.debriefed = true; showToast("TOUCHDOWN!"); setTimeout(() => showDebrief(true), 2000); }
            } else {
                this.failed = true; showToast(this.name + " LITHOBRAKING EVENT (CRASH)");
                for (let k = 0; k < 150; k++) particles.push({ type: 'fire', x: this.x, y: this.y, vx: (Math.random() - 0.5) * 500, vy: (Math.random() - 0.5) * 500, life: 3, sz: Math.random() * 10 + 2 });
                if (this.isMain && !this.debriefed) { this.debriefed = true; setTimeout(() => showDebrief(false), 2000); }
            }
            return;
        }

        this.targetAngle = this.getAutoPilotTarget();

        if (this.auto && this.fuel > 0 && this.profile !== 'LANDED') {
            let err = this.targetAngle - this.angle;
            while (err > Math.PI) err -= 2 * Math.PI; while (err < -Math.PI) err += 2 * Math.PI;

            this.pid.i += err * dt;
            this.pid.i = Math.max(-1, Math.min(1, this.pid.i));

            let control = -(4.0 * err + 0.01 * this.pid.i + 3.0 * this.omega);
            this.gimbal = Math.max(-0.15, Math.min(0.15, control));

            if (this.profile === 'ASCENT') {
                if (this.mach > 0.8 && this.mach < 2.5 && this.alt < 20000) this.throttle = 0.65;
                else this.throttle = 1.0;
            }
        } else {
            this.gimbal = 0;
            if (this.auto && this.fuel <= 0 && this.profile === 'ASCENT') this.stage(vehicles, missionType);
        }

        let state = [this.x, this.y, this.vx, this.vy, this.angle, this.omega, this.fuel];
        let newState = integrateRK4(state, dt, (st) => this.getDeriv(st));

        if (newState.every(v => Number.isFinite(v))) {
            this.x = newState[0]; this.y = newState[1];
            this.vx = newState[2]; this.vy = newState[3];
            this.angle = newState[4]; this.omega = newState[5];
            this.fuel = Math.max(0, newState[6]);
        }

        let minAlt = Infinity;
        for (let b of CELESTIALS) {
            let dist = Math.sqrt((b.x - this.x) ** 2 + (b.y - this.y) ** 2);
            if (dist - b.r < minAlt) { minAlt = dist - b.r; this.domBody = b; }
        }
        let rho = 0, speedOfSound = 343;
        if (this.domBody.atm > 0 && minAlt < this.domBody.atm * 10) {
            rho = this.domBody.rho * Math.exp(-minAlt / this.domBody.atm);
            if (minAlt < 11000) speedOfSound = Math.sqrt(1.4 * 287.05 * (288.15 - 0.00649 * minAlt));
        }
        this.mach = this.velocity / speedOfSound;
        this.q = 0.5 * rho * this.velocity ** 2;
        let F_t = this.fuel > 0 ? this.th * this.throttle : 0;
        let accelG = F_t / (this.mass * 9.81); let aeroP = this.q / 1000;

        let maxStress = (aeroP * 1.5) + (accelG * 5);

        if (accelG > this.maxG) this.maxG = accelG;
        if (this.q > this.maxQ) this.maxQ = this.q;
        if (maxStress > this.maxStress) this.maxStress = maxStress;
        if (F_t > 0) this.totalDv += (F_t / this.mass) * dt;

        if (maxStress > 1000 && !this.failed) {
            this.failed = true; showToast("CRITICAL STRUCTURAL FAILURE!");
            for (let k = 0; k < 100; k++) particles.push({ type: 'fire', x: this.x, y: this.y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, life: 2, sz: Math.random() * 8 + 2 });
            if (this.isMain && !this.debriefed) { this.debriefed = true; setTimeout(() => showDebrief(false), 2000); }
        }
        this.stress = maxStress;

        if (this.isMain && this.profile === 'ASCENT' && this.alt > 250000 && this.velocity > Math.sqrt(SIM.G * this.domBody.m / (this.domBody.r + this.alt))) {
            this.throttle = 0; this.auto = false; showToast("MECO - ORBIT INSERTION");
            if (!this.debriefed) { this.debriefed = true; setTimeout(() => showDebrief(true), 2000); }
        }

        let heatFlux = (this.velocity ** 3) * rho * 1e-7;
        if (this.isMain && heatFlux > 10) {
            this.heatShield -= heatFlux * dt * 0.01;
            if (this.heatShield < 50) {
                blkActive(true);
            }
        } else if (this.isMain) {
            blkActive(false);
        }

        for (let n of this.nodes) {
            let yFac = (n.ry + this.h / 2) / this.h;
            n.s = maxStress * (1 - yFac * 0.2 + (Math.random() * 0.05));
            n.t += (yFac > 0.9 ? heatFlux : 0) * dt;
            n.dx = n.ry * Math.sin(this.gimbal) * 0.2;
            n.dy = -n.s * 0.002;
        }

        if (F_t > 0 && this === getActiveVehicle()) AudioSys.update(this.throttle, rho);
        else if (this === getActiveVehicle()) AudioSys.update(0, 0);

        if (F_t > 0 && visualMode === 'real' && !isPaused && frameCount % 2 === 0) {
            let expand = 1 + Math.max(0, (1.225 - rho) * 3);
            particles.push({ type: 'fire', x: this.x - Math.cos(this.angle) * this.h / 2, y: this.y - Math.sin(this.angle) * this.h / 2, vx: this.vx - Math.cos(this.angle + this.gimbal) * 200, vy: this.vy - Math.sin(this.angle + this.gimbal) * 200, life: 0.5, sz: this.w * expand, c: rho < 0.1 ? '#a855f7' : '#fb923c' });
        }
    }
}
