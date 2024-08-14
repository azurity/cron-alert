let current = '';

async function select(event) {
    event.stopPropagation();
    event.currentTarget.classList.remove('active');
    const name = event.currentTarget.dataset.name;
    current = name;
    const result = await window.electronAPI.getData(name);
    document.querySelector('.main-title-text').innerText = name;
    document.querySelector('.main-body').innerHTML = `
    <pre class="subtitle">[stdout][${new Date(result[2]).toISOString()}]</pre>
    <pre>${result[0]}</pre>
    <pre class="subtitle">[stderr][${new Date(result[2]).toISOString()}]</pre>
    <pre>${result[1]}</pre>`;
}

function toggleEnable(event) {
    let enabled = event.currentTarget.dataset.status == 'enabled';
    enabled = !enabled;
    event.stopPropagation();
    event.currentTarget.nextSibling.innerText = enabled ? 'enabled' : 'disabled';
    event.currentTarget.classList.remove('ti-square', 'ti-square-check');
    event.currentTarget.classList.add(enabled ? 'ti-square-check' : 'ti-square');
    event.currentTarget.dataset.status = enabled ? 'enabled' : 'disabled';
    window.electronAPI.toggleActive(event.currentTarget.dataset.name, enabled);
}

const template = document.getElementById('template');
const list = document.querySelector('.list');

async function loadInfo() {
    const value = await window.electronAPI.getInfo();
    list.innerHTML = '';
    for (const task of value) {
        const item = template.content.cloneNode(true);
        item.firstElementChild.dataset.name = task.name;
        item.firstElementChild.addEventListener('click', select);
        item.firstElementChild.firstElementChild.innerText = task.name;
        const status = item.querySelector('.status').firstElementChild;
        status.dataset.name = task.name;
        status.dataset.status = task.running ? 'enabled' : 'disabled';
        status.classList.add(task.running ? 'ti-square-check' : 'ti-square');
        status.addEventListener('click', toggleEnable);
        item.querySelector('.status').lastElementChild.innerText = task.running ? 'enabled' : 'disabled';
        list.appendChild(item);
    }
}

window.electronAPI.onUpdate((name) => {
    for (const item of list.children) {
        if (item.dataset.name == name) {
            item.classList.add('active');
            break;
        }
    }
});

document.querySelector('#open-result').addEventListener('click', () => {
    if (current !== '') {
        window.electronAPI.openFolder(current);
    }
});

document.querySelector('#open-config').addEventListener('click', () => {
    window.electronAPI.openFolder(null);
});

document.querySelector('#reload').addEventListener('click', async () => {
    if (await window.electronAPI.reload()) {
        await loadInfo();
    }
});

loadInfo();
