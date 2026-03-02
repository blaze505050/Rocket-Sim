import { el, frameCount } from '../core/state.js';

export const CFDShader = {
    program: null, uniforms: {}, gl: null,
    vSrc: `attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`,
    fSrc: `
        precision highp float;
        uniform vec2 u_res; 
        uniform vec2 u_rpos; 
        uniform float u_rang;
        uniform float u_scale; 
        uniform vec2 u_cam; 
        uniform float u_camRot; 
        uniform float u_mach; 
        uniform float u_time; 
        uniform int u_mode;
        uniform float u_q;
        uniform float u_throttle;

        // --- PROCEDURAL FBM NOISE ---
        float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
        
        float noise(vec2 x) {
            vec2 i = floor(x); vec2 f = fract(x);
            float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 x) {
            float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
            mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
            for (int i = 0; i < 5; ++i) {
                v += a * noise(x); x = rot * x * 2.0 + shift; a *= 0.5;
            }
            return v;
        }

        // --- TURBO COLORMAP ---
        vec3 turbo(float t) {
            t = clamp(t, 0.0, 1.0);
            float r = max(0.0, min(1.0, 4.0 * abs(t - 0.75) - 1.0) * -1.0 + 1.0); if(t>0.75) r=1.0;
            float g = max(0.0, min(1.0, 4.0 * abs(t - 0.5) - 1.0) * -1.0 + 1.0);
            float b = max(0.0, min(1.0, 4.0 * abs(t - 0.25) - 1.0) * -1.0 + 1.0); if(t<0.25) b=1.0;
            return vec3(r,g,b);
        }

        void main() {
            if(u_mode == 0) { gl_FragColor = vec4(0.0); return; }
            vec2 screenCoord = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
            vec2 offsetWorld = (screenCoord - u_cam) / u_scale;
            vec2 d_rot = offsetWorld - u_rpos;
            
            float cr = cos(-u_camRot), sr = sin(-u_camRot);
            vec2 dWorld = vec2(d_rot.x*cr - d_rot.y*sr, d_rot.x*sr + d_rot.y*cr);
            
            float rc = cos(-u_rang - 1.5707), rs = sin(-u_rang - 1.5707);
            vec2 loc = vec2(dWorld.x*rc - dWorld.y*rs, dWorld.x*rs + dWorld.y*rc);
            
            float dist = length(loc);
            float val = 0.3; // Base ambient background
            
            // Background flow turbulence based on speed
            vec2 flowUV = loc * 0.02 + vec2(0.0, u_time * u_mach * 10.0);
            float turb = fbm(flowUV);
            val += (turb - 0.5) * 0.1 * min(u_mach, 2.0);

            // Stagnation zone (High Pressure at nose)
            float dotP = -loc.y / (dist + 0.1);
            if(dist < 50.0 && dotP > 0.8) {
                val += 0.6 * smoothstep(50.0, 10.0, dist);
            } 
            // Wake zone (Low Pressure behind)
            else if(loc.y > 0.0 && abs(loc.x) < 40.0 + loc.y * 0.5) {
                float wakeFalloff = exp(-loc.y * 0.005);
                val -= 0.2 * wakeFalloff;
                // Add exhaust disruption
                vec2 exhaustUV = loc * 0.05 - vec2(0.0, u_time * 20.0);
                val += (fbm(exhaustUV) - 0.5) * 0.3 * wakeFalloff * u_throttle;
            }

            // --- SUPERSONIC SHOCKWAVE (MACH CONE) ---
            if(u_mach > 1.0) {
                float mu = asin(1.0 / u_mach); // Mach angle
                float angleFromNose = acos(abs(dotP)); // Angle relative to trajectory vector
                
                // Determine if we are on the shock boundary
                float shockDist = abs(angleFromNose - mu);
                if(loc.y < 20.0 && angleFromNose > mu) {
                    // Inside the mach cone wake (Expansion fan)
                    val -= 0.15 * min(1.0, (angleFromNose - mu)*5.0);
                }
                
                // Shockwave boundary spike (Compression)
                float shockIntensity = smoothstep(0.1, 0.0, shockDist) * exp(-dist * 0.002);
                val += shockIntensity * 0.5 * min(u_mach - 1.0, 2.0);
            }

            // --- HIGH-Q THERMAL PLASMA (Re-entry / MAX-Q) ---
            float qFactor = clamp(u_q / 50000.0, 0.0, 1.0); // Normalize based on 50kPa
            if(qFactor > 0.1 && dist < 60.0 && dotP > 0.5) {
                // Nosecone plasma
                float heatVal = smoothstep(60.0, 5.0, dist) * qFactor;
                // Plasma flickering
                heatVal *= 0.8 + 0.4 * fbm(loc * 0.1 + vec2(u_time * 50.0, 0.0));
                
                vec3 baseColor = turbo(val);
                vec3 plasmaColor = vec3(1.0, 0.9, 0.5) * heatVal * 2.0; // Glow white-yellow
                gl_FragColor = vec4(clamp(baseColor + plasmaColor, 0.0, 1.0), 0.8);
                return;
            }

            gl_FragColor = vec4(turbo(clamp(val, 0.0, 1.0)), 0.7); 
        }
    `,
    init: function (c) {
        this.gl = c.getContext('webgl'); if (!this.gl) return;
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER); this.gl.shaderSource(vs, this.vSrc); this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER); this.gl.shaderSource(fs, this.fSrc); this.gl.compileShader(fs);
        this.program = this.gl.createProgram(); this.gl.attachShader(this.program, vs); this.gl.attachShader(this.program, fs); this.gl.linkProgram(this.program);
        const posBuffer = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);
        const posAttr = this.gl.getAttribLocation(this.program, "a_position");
        this.gl.enableVertexAttribArray(posAttr); this.gl.vertexAttribPointer(posAttr, 2, this.gl.FLOAT, false, 0, 0);
        ['u_res', 'u_rpos', 'u_rang', 'u_scale', 'u_cam', 'u_camRot', 'u_mach', 'u_time', 'u_mode', 'u_q', 'u_throttle'].forEach(u => {
            this.uniforms[u] = this.gl.getUniformLocation(this.program, u);
        });
    },
    draw: function (r, cam, modeStr, glCanvasObj) {
        if (!this.gl || !this.program) return;
        let m = 0; if (modeStr === 'cfd') m = 1;
        this.gl.useProgram(this.program);
        this.gl.uniform2f(this.uniforms.u_res, glCanvasObj.width, glCanvasObj.height);
        this.gl.uniform2f(this.uniforms.u_cam, cam.x, cam.y);
        this.gl.uniform1f(this.uniforms.u_scale, cam.scale);
        this.gl.uniform1f(this.uniforms.u_camRot, cam.rotZ || 0);
        this.gl.uniform2f(this.uniforms.u_rpos, r.x, r.y);
        this.gl.uniform1f(this.uniforms.u_rang, r.angle);
        this.gl.uniform1f(this.uniforms.u_mach, r.mach);
        this.gl.uniform1f(this.uniforms.u_time, frameCount * 0.05);
        this.gl.uniform1f(this.uniforms.u_q, r.q);
        this.gl.uniform1f(this.uniforms.u_throttle, r.throttle);
        this.gl.uniform1i(this.uniforms.u_mode, m);
        this.gl.viewport(0, 0, glCanvasObj.width, glCanvasObj.height);
        this.gl.clearColor(0, 0, 0, 0); this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND); this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
};
