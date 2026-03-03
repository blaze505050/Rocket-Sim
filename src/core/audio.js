// --- AUDIO ---
export const AudioSys = {
    ctx: null, osc: null, gain: null,
    init: function () {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC(); this.osc = this.ctx.createOscillator(); this.gain = this.ctx.createGain();
        this.osc.type = 'sawtooth'; this.osc.frequency.value = 50;

        // Add a lowpass filter to make the rumble sound heavier
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 150;

        this.osc.connect(this.filter); this.filter.connect(this.gain); this.gain.connect(this.ctx.destination);
        this.gain.gain.value = 0; this.osc.start();
    },
    update: function (throttle, density) {
        if (!this.ctx) return;
        // Audio fades out as density drops (vacuum of space = silence)
        const vol = throttle * (0.05 + density) * 0.15;
        const freq = 40 + throttle * 70;
        const now = this.ctx.currentTime;
        this.gain.gain.setTargetAtTime(vol, now, 0.1);
        this.osc.frequency.setTargetAtTime(freq, now, 0.1);
    }
};
