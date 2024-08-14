import { BrowserWindow } from 'electron';
import path from 'node:path';

const htmlPath = path.resolve(import.meta.dirname, 'warn.html');

export class Badge {
    constructor(debug) {
        debug = !!debug;
        this.win = new BrowserWindow({
            x: 64,
            y: 64,
            width: 160,
            height: 40,
            show: false,
            minimizable: false,
            skipTaskbar: true,
            resizable: debug != false,
            frame: debug != false,
            alwaysOnTop: debug != true,
        });
    }

    warn(name) {
        this.win.loadFile(htmlPath, { query: { name } });
        this.win.show();
        this.win.setAlwaysOnTop(true, 'pop-up-menu');
        this.win.focus();
        this.win.setPosition(64, 64, true);
    }

    ignore() {
        this.win.hide();
    }
}
