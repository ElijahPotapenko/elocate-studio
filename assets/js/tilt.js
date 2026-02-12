document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.about-logo');

    if (!logo) return;

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Calculate rotation based on cursor position relative to window center
        // Sensitivity can be adjusted (e.g., / 20 or / 30)
        const rotateX = ((y - centerY) / window.innerHeight) * -60; // Max rotation +/- 30deg (increased sensitivity)
        const rotateY = ((x - centerX) / window.innerWidth) * 60;

        logo.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
});
