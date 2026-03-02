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
                p.style.left = Math.max(0, Math.min(window.innerWidth - p.offsetWidth, ev.clientX - dx)) + 'px';
                p.style.top = Math.max(0, Math.min(window.innerHeight - p.offsetHeight, ev.clientY - dy)) + 'px';
            };
            const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); sendToBack(); };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        });
        h.addEventListener('touchstart', e => {
            if (e.target.closest('.btn-icon')) return;
            bringToFront();
            let t = e.touches[0]; let dx = t.clientX - p.offsetLeft, dy = t.clientY - p.offsetTop;
            const mv = (ev) => {
                let t2 = ev.touches[0];
                p.style.left = Math.max(0, Math.min(window.innerWidth - p.offsetWidth, t2.clientX - dx)) + 'px';
                p.style.top = Math.max(0, Math.min(window.innerHeight - p.offsetHeight, t2.clientY - dy)) + 'px';
            };
            const up = () => { document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up); sendToBack(); };
            document.addEventListener('touchmove', mv, { passive: false }); document.addEventListener('touchend', up);
        });
    });
}
