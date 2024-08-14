import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import { CronJob } from 'cron';
import md5 from 'md5';

const htmlPath = path.resolve(import.meta.dirname, 'index.html');
const preloadPath = path.resolve(import.meta.dirname, 'preload.js');

const validLevel = new Set(['FATAL', 'WARN', 'INFO']);

function generateExecutor(cli, cwd, resultPath, resultBox, next) {
    return () => {
        resultBox[0] = true;
        try {
            const process = spawn(cli[0], cli.slice(1), {
                cwd: cwd, env: {
                    'RESULT_DIR': resultPath,
                }
            });
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (chunk) => {
                stdout += chunk;
            });
            process.stdout.on('close', () => {
                resultBox[1] = stdout;
            });
            process.stderr.on('data', (chunk) => {
                stderr += chunk;
            });
            process.stderr.on('close', () => {
                resultBox[2] = stderr;
            });
            process.on('close', () => {
                resultBox[0] = false;
                resultBox[3] = Date.now();
                next();
            });
        } catch (err) {
            resultBox[0] = false;
            resultBox[1] = '';
            resultBox[2] = err.toString();
            resultBox[3] = Date.now();
            next();
        }
    }
}

export class Main extends EventEmitter {
    notifiers = new Map();
    actions = [];
    workdir = '';
    quit = false;

    constructor(actionPath, workdir, resultDir) {
        super();
        this.actionPath = actionPath;
        this.workdir = workdir;
        this.resultDir = resultDir;
        this.win = new BrowserWindow({
            width: 1280,
            height: 960,
            webPreferences: {
                preload: preloadPath,
            },
        });
        this.win.loadFile(htmlPath);
        ipcMain.handle('get-info', (_event) => {
            return this.getInfo();
        });
        ipcMain.handle('toggle-active', (_event, name, state) => {
            const item = this.actions.find(it => it.name == name);
            if (item) {
                if (state) {
                    item.task.start();
                } else {
                    item.task.stop();
                }
            }
        });
        ipcMain.handle('get-data', (_event, name) => {
            this.emit('view', name);
            const item = this.actions.find(it => it.name == name);
            if (item) {
                return item.result.slice(1);
            } else {
                return [];
            }
        });
        ipcMain.on('open-folder', async (_event, name) => {
            if (name === null) {
                shell.openPath(workdir);
            } else {
                const resultPath = path.join(resultDir, md5(name));
                try {
                    await fs.access(resultPath, fs.constants.R_OK);
                    shell.openPath(resultPath);
                } catch (err) {
                    dialog.showErrorBox('', err.toString());
                }
            }
        });
        ipcMain.handle('reload', async () => {
            const result = await dialog.showMessageBox(this.win, {
                type: 'question',
                detail: 'Sure to reload?',
                buttons: ['Cancel', 'OK'],
                cancelId: 0,
            });
            if (result.response == 1) {
                const actions = JSON.parse(fsSync.readFileSync(actionPath, { encoding: 'utf-8' }));
                this.loadAction(actions);
                this.emit('clear');
                return true;
            }
            return false;
        });
        const actions = JSON.parse(fsSync.readFileSync(actionPath, { encoding: 'utf-8' }));
        this.loadAction(actions);
        this.win.on('close', (event) => {
            if (!this.quit) {
                this.win.hide();
                event.preventDefault();
            }
        });
    }

    show() {
        this.win.show();
    }

    update(name) {
        const item = this.actions.find(it => it.name == name);
        this.emit('update', name, item?.level);
        this.win.webContents.send('update', name);
    }

    async loadAction(actions) {
        const newActions = [];
        for (const item of actions) {
            if (typeof item.name != 'string' || item.name == '') {
                continue;
            }
            if (typeof item.cron != 'string' || item.cron == '') {
                continue;
            }
            if (!(item.cli instanceof Array) || item.cli.length == 0) {
                continue;
            }
            const result = [false, '', '', 0];
            const resultPath = path.join(this.resultDir, md5(item.name));
            try {
                await fs.stat(resultPath, fs.constants.R_OK)
            } catch (err) {
                await fs.mkdir(resultPath);
            }
            const action = {
                name: item.name,
                cron: item.cron,
                level: validLevel.has(item.level) ? item.level : null,
                task: new CronJob(
                    item.cron,
                    generateExecutor(item.cli, this.workdir, resultPath, result, () => {
                        this.update(item.name);
                    }),
                    null, !!item.active, Intl.DateTimeFormat().resolvedOptions().timeZone),
                result: result,
            };
            const stamps = action.task.nextDates(2);
            // if (stamps[2].toJSDate().getTime() - stamps[2].toJSDate().getTime() < 6e4) {
            //     continue;
            // }
            newActions.push(action);
        }

        for (const it of this.actions) {
            it.task.stop();
        }
        this.actions = newActions;
    }

    getInfo() {
        return this.actions.map(it => ({
            name: it.name,
            running: it.task.running,
            executing: it.result[0],
        }));
    }

    start(name) {
        const action = this.actions.find(it => it.name == name);
        if (action) {
            action.start();
        }
    }

    stop(name) {
        const action = this.actions.find(it => it.name == name);
        if (action) {
            action.stop();
        }
    }
}
