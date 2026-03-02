export const SIM = { G: 6.6743e-11, dt: 0.05 };

export const CELESTIALS = [
    { name: "Earth", m: 5.972e24, r: 6371000, x: 0, y: 0, c: "#1e3a8a", atm: 8500, rho: 1.225 },
    { name: "Moon", m: 7.342e22, r: 1737000, x: 0, y: -150000000, c: "#cbd5e1", atm: 0, rho: 0 }, 
    { name: "Mars", m: 6.39e23, r: 3389000, x: 0, y: -600000000, c: "#b91c1c", atm: 11000, rho: 0.02 } 
];

export const MISSIONS = {
    SLS: { name: "NASA SLS", payload: "Orion", dest: "Moon", fact: "Artemis II will fly a lunar free-return trajectory.", target: CELESTIALS[1], rocket: { stages: [{name:"Core", dry:400e3,fuel:2.2e6,thrust:39e6,isp:280,w:8.4,h:65,c:"#e2e8f0"}, {name:"ICPS", dry:85e3,fuel:3e5,thrust:7.4e6,isp:452,w:8.4,h:50,c:"#ea580c"}] } },
    FALCON_HEAVY: { name: "Falcon Heavy", payload: "Roadster", dest: "Mars Transfer", fact: "Side boosters separate and autonomously fly back to land.", target: CELESTIALS[2], type: "FH", rocket: { stages: [{name:"Boosters + Core", dry:100e3,fuel:1.2e6,thrust:22.8e6,isp:285,w:12,h:45,c:"#fff"}, {name:"S2", dry:22e3,fuel:1e5,thrust:7.6e6,isp:311,w:3.7,h:40,c:"#f8fafc"}] } },
    STARSHIP: { name: "SpaceX Starship", payload: "100t Cargo", dest: "LEO", fact: "Performs a bellyflop maneuver to aerobrake before landing.", target: CELESTIALS[0], type: "STARSHIP", rocket: { stages: [{name:"SuperHeavy", dry:200e3,fuel:3.4e6,thrust:72e6,isp:330,w:9,h:70,c:"#cbd5e1"}, {name:"Starship", dry:120e3,fuel:1.2e6,thrust:12e6,isp:380,w:9,h:50,c:"#e2e8f0"}] } },
    SATURN_V: { name: "Saturn V", payload: "Apollo 11", dest: "Moon", fact: "Remains the only launch vehicle to carry humans beyond LEO.", target: CELESTIALS[1], rocket: { stages: [{name:"S-IC", dry:130e3,fuel:2.1e6,thrust:35e6,isp:263,w:10,h:42,c:"#fff"}, {name:"S-II", dry:40e3,fuel:4.4e5,thrust:5e6,isp:421,w:10,h:25,c:"#e2e8f0"}] } },
    LVM3: { name: "ISRO LVM3", payload: "Chandrayaan-3", dest: "Moon", fact: "Successfully placed Chandrayaan-3 into a lunar transfer trajectory.", target: CELESTIALS[1], rocket: { stages: [{name:"Core", dry:30e3,fuel:4e5,thrust:10e6,isp:270,w:4,h:25,c:"#f8fafc"}, {name:"C25", dry:10e3,fuel:1.1e5,thrust:1.6e6,isp:298,w:4,h:17,c:"#94a3b8"}] } },
    PSLV: { name: "ISRO PSLV", payload: "Mangalyaan", dest: "Mars Orbit", fact: "Highly reliable workhorse of the Indian Space Research Organisation.", target: CELESTIALS[2], rocket: { stages: [{name:"PS1", dry:20e3,fuel:1.3e5,thrust:4.8e6,isp:269,w:2.8,h:20,c:"#b91c1c"}, {name:"PS2", dry:5000,fuel:41000,thrust:8e5,isp:293,w:2.8,h:12,c:"#f8fafc"}] } },
    GSLV_MK2: { name: "GSLV Mk II", payload: "GSAT", dest: "GTO", fact: "Uses an indigenously developed Cryogenic Upper Stage.", target: {dist: 42164000, rad: 500, color: '#ffd700', name: 'GEO'}, rocket: { stages: [{dry:25000,fuel:300000,thrust:8e6,isp:250,w:3.4,h:25,c:"#e2e8f0"}, {dry:5000,fuel:40000,thrust:7.5e5,isp:295,w:3.4,h:15,c:"#94a3b8"}] } },
    SSLV: { name: "ISRO SSLV", payload: "EOS-07", dest: "LEO", fact: "Designed for rapid, cost-effective deployment of small satellites.", target: {dist: 7000000, rad: 50, color: '#fff', name: 'LEO'}, rocket: { stages: [{dry:8000,fuel:80000,thrust:2.5e6,isp:245,w:2,h:15,c:"#fff"}, {dry:2000,fuel:10000,thrust:5e5,isp:280,w:2,h:10,c:"#ccc"}] } },
    ARIANE5: { name: "ESA Ariane 5", payload: "JWST", dest: "L2 Point", fact: "Injected the James Webb Space Telescope with extreme precision.", target: CELESTIALS[1], rocket: { stages: [{name:"EPC", dry:50e3,fuel:5e5,thrust:13e6,isp:275,w:5.4,h:30,c:"#fff"}, {name:"ESC-A", dry:15e3,fuel:1.7e5,thrust:1.3e6,isp:432,w:5.4,h:20,c:"#e2e8f0"}] } },
    SOYUZ: { name: "Soyuz-2", payload: "Progress MS", dest: "ISS", fact: "The most frequently flown launch vehicle family in history.", target: {dist: 6771000, rad: 100, color: '#fff', name: 'ISS'}, rocket: { stages: [{name:"Blok-A", dry:40e3,fuel:2.5e5,thrust:8.3e6,isp:310,w:10,h:20,c:"#166534"}, {name:"Blok-I", dry:10e3,fuel:8e4,thrust:9e5,isp:330,w:2.9,h:15,c:"#9ca3af"}] } }
};
