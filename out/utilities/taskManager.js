"use strict";
/*
Copyright 2024 mylonics
Author Rijesh Augustine

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = exports.getRootPath = void 0;
const vscode_1 = require("vscode");
const vscode = __importStar(require("vscode"));
const setup_toolchain_1 = require("../setup_utilities/setup_toolchain");
function getRootPath() {
    let rootPaths = vscode_1.workspace.workspaceFolders;
    if (rootPaths === undefined) {
        return;
    }
    else {
        return rootPaths[0].uri;
    }
}
exports.getRootPath = getRootPath;
class Defer {
    promise;
    resolve;
    reject;
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
class Task {
    term;
    cmd;
    deferPromise = new Defer;
    ready = false;
    sourceTerminal;
    inputStream;
    startedExecution = false;
    constructor(cmd, term, sourceTerminal) {
        this.cmd = cmd;
        this.term = term;
        this.sourceTerminal = sourceTerminal;
    }
    getResult() {
        return this.deferPromise.promise;
        ;
    }
}
class TaskManager {
    tasks = new Set;
    //constructor(message: string) {
    //  this.loadSetupTerminal();
    //}
    addTask(terminal) {
        for (const t of this.tasks) {
            if (t.term.processId === terminal.processId) {
                return true;
            }
        }
        this.tasks.add(new Task("", terminal, true));
        return false;
    }
    getTask(terminal) {
        for (let c of this.tasks) {
            if (c.term === terminal) {
                return c;
            }
        }
    }
    async loadSetupTerminal() {
        vscode.window.onDidChangeTerminalShellIntegration(async ({ terminal, shellIntegration }) => {
            if (terminal.name === "Zephyr IDE Terminal") {
                this.addTask(terminal);
                let task = this.getTask(terminal);
                if (task && !task.ready) {
                    let execution = undefined;
                    if (!task.ready && task.sourceTerminal) {
                        if ((0, setup_toolchain_1.getPlatformName)() === "windows") {
                            execution = shellIntegration.executeCommand(".\\.venv\\Scripts\\activate; ");
                        }
                        else {
                            execution = shellIntegration.executeCommand("source .\\.venv\\Scripts\\activate && clc;");
                        }
                    }
                    else if (task.cmd && terminal.shellIntegration) {
                        execution = terminal.shellIntegration.executeCommand(task.cmd);
                        task.startedExecution = true;
                    }
                    if (execution) {
                        task.ready = true;
                        task.inputStream = execution.read();
                    }
                    vscode.window.onDidEndTerminalShellExecution(async (event) => {
                        if (event.execution === execution) {
                            let outputstring = "";
                            for await (const data of task.inputStream) {
                                outputstring = outputstring + data;
                                console.log(data);
                            }
                            if (task.cmd && !task.startedExecution && terminal.shellIntegration) {
                                console.log(`Terminal for task ${task.cmd} is ready`);
                                task.startedExecution = true;
                                execution = terminal.shellIntegration.executeCommand(task.cmd);
                                task.inputStream = execution.read();
                                outputstring = "";
                            }
                            else {
                                task.deferPromise.resolve({ code: event.exitCode, stdout: outputstring });
                                console.log(`Setup ${task?.cmd} exited with code ${event.exitCode}`);
                            }
                        }
                    });
                }
            }
        });
    }
    ;
    async createTerminal(cmd, cwd, show = false) {
        let opts = {
            name: "Zephyr IDE Terminal",
            //cwd: cwd,
            //strictEnv: true,
            hideFromUser: !show
        };
        let setup_terminal = await vscode.window.createTerminal(opts);
        if (show) {
            setup_terminal.show();
        }
        let command = new Task(cmd, setup_terminal, true);
        if (this.tasks.has(command)) {
            console.log("command already in termianls");
        }
        this.tasks.add(command);
        vscode.window.onDidCloseTerminal(t => {
            let task = this.getTask(t);
            if (task) {
                this.tasks.delete(task);
            }
        });
        return command;
    }
}
;
exports.t = new TaskManager();
//# sourceMappingURL=taskManager.js.map
