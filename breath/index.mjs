import { BrowserWindow } from 'electron';
import path from 'node:path';

const htmlPath = path.resolve(import.meta.dirname, 'warn.html');

export class Breath {
    constructor(debug) {
        debug = !!debug;
        this.win = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            minimizable: false,
            skipTaskbar: true,
            transparent: debug != true,
            resizable: debug != false,
            frame: debug != false,
            alwaysOnTop: debug != true,
            fullscreen: debug != true,
        });
        this.win.setIgnoreMouseEvents(true);
    }

    warn(color, width) {
        this.win.loadFile(htmlPath, { query: { color, width } });
        this.win.show();
        this.win.setAlwaysOnTop(true, 'pop-up-menu');
        this.win.focus();
    }

    ignore() {
        this.win.hide();
    }
}
