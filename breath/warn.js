const url = new URL(window.location.href);
const color = url.searchParams.get('color') ?? 'red';
document.body.style.setProperty('--warn-color', color);
const width = parseInt(url.searchParams.get('width')) ?? 32;
document.body.style.setProperty('--warn-width', `${width}px`);
