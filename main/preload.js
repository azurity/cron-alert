const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
    getInfo: () => ipcRenderer.invoke('get-info'),
    toggleActive: (name, state) => ipcRenderer.invoke('toggle-active', name, state),
    onUpdate: (callback) => ipcRenderer.on('update', (_event, value) => callback(value)),
    getData: (name) => ipcRenderer.invoke('get-data', name),
    openFolder: (name) => ipcRenderer.send('open-folder', name),
    reload: () => ipcRenderer.invoke('reload'),
});
