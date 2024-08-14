const url = new URL(window.location.href);
const name = url.searchParams.get('name') ?? '';
document.querySelector('#name').innerText = name;
