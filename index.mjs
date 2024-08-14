import path from 'node:path';
import { app, BrowserWindow, Tray, nativeImage, Menu, MenuItem } from 'electron';
import { Breath } from './breath/index.mjs';
import { Main } from './main/index.mjs';
import fs from 'node:fs';
import { Badge } from './badge/index.mjs';

let badge = null;
let breather = null;
let main = null;
const alert = new Map();

function updateAlert(name) {
    let fatal = false;
    let warn = false;
    let info = false;
    for (const item of alert.values()) {
        fatal ||= item == 'FATAL';
        warn ||= item == 'WARN';
        info ||= item == 'INFO';
    }
    if (fatal) {
        breather.warn('red', 32);
    } else if (warn) {
        breather.warn('orange', 32);
    } else if (info) {
        breather.ignore();
    } else {
        breather.ignore();
    }
    if (name) {
        badge.warn(name);
    } else {
        badge.ignore();
    }
}

const exampleConfig = [
    {
        "name": "example",
        "cron": "* * * * */10",
        "level": "FATAL",
        "cli": ["cmd", "/C", "echo example %RESULT_DIR%"],
        "active": true
    }
];

const createWindow = () => {
    breather = new Breath(false);
    badge = new Badge(false);
    const taskPath = path.join(app.getAppPath(), 'task');
    const resultPath = path.join(app.getAppPath(), 'result');
    if (!fs.existsSync(taskPath)) {
        fs.mkdirSync(taskPath);
    }
    if (!fs.existsSync(resultPath)) {
        fs.mkdirSync(resultPath);
    }
    if (!fs.existsSync(path.join(taskPath, 'config.json'))) {
        fs.writeFileSync(path.join(taskPath, 'config.json'), JSON.stringify(exampleConfig));
    }
    main = new Main(path.join(taskPath, 'config.json'), taskPath, resultPath);
    main.on('update', (name, level) => {
        alert.set(name, level ?? 'INFO');
        updateAlert(name);
    });
    main.on('view', (name) => {
        alert.delete(name);
        updateAlert();
    });
    main.on('clear', () => {
        alert.clear();
        updateAlert();
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    const appIcon = new Tray(nativeImage.createFromPath('heartbeat.png'));
    const appMenu = Menu.buildFromTemplate([
        {
            label: 'main window', click() {
                main.show();
            }
        },
        {
            label: 'quit', click() {
                main.quit = true;
                app.quit();
            }
        },
    ]);
    appIcon.setContextMenu(appMenu);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
