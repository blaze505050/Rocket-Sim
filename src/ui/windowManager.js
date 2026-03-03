export function initDraggable() {
    document.querySelectorAll('.window').forEach(p => {
        const h = p.querySelector('.window-header');
        if (!h) return;
        const bringToFront = () => { p.style.zIndex = 1000; };
        const sendToBack = () => { p.style.zIndex = 20; };

        h.addEventListener('mousedown', e => {
            if (e.target.closest('.btn-icon')) return;
            bringToFront();
            let dx = e.clientX - p.offsetLeft, dy = e.clientY - p.offsetTop;
            const mv = (ev) => {
                let wW = window.innerWidth, hW = window.innerHeight;
                let nwX = Math.max(0, Math.min(wW - p.offsetWidth, ev.clientX - dx));
                let nwY = Math.max(0, Math.min(hW - p.offsetHeight, ev.clientY - dy));
                p.style.left = nwX + 'px';
                p.style.top = nwY + 'px';
                p.style.transform = 'none'; // Clear translate so dragged coordinates stick properly
            };
            const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); sendToBack(); };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        });
        h.addEventListener('touchstart', e => {
            if (e.target.closest('.btn-icon')) return;
            bringToFront();
            let t = e.touches[0];
            // Normalize translate logic if it was centered
            let dx = t.clientX - p.getBoundingClientRect().left;
            let dy = t.clientY - p.getBoundingClientRect().top;
            const mv = (ev) => {
                let t2 = ev.touches[0];
                let wW = window.innerWidth, hW = window.innerHeight;
                let nwX = Math.max(0, Math.min(wW - p.offsetWidth, t2.clientX - dx));
                let nwY = Math.max(0, Math.min(hW - p.offsetHeight, t2.clientY - dy));
                p.style.left = nwX + 'px';
                p.style.top = nwY + 'px';
                p.style.transform = 'none';
            };
            const up = () => { document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up); sendToBack(); };
            document.addEventListener('touchmove', mv, { passive: false }); document.addEventListener('touchend', up);
        });
    });
}
