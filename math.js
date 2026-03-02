// --- RK4 MATH KERNEL ---

export function integrateRK4(state, dt, derivFunc) {
    let k1 = derivFunc(state);
    let s2 = state.map((v, i) => v + 0.5 * dt * k1[i]);
    let k2 = derivFunc(s2);
    let s3 = state.map((v, i) => v + 0.5 * dt * k2[i]);
    let k3 = derivFunc(s3);
    let s4 = state.map((v, i) => v + dt * k3[i]);
    let k4 = derivFunc(s4);
    return state.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
