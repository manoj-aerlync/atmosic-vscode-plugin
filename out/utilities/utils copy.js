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
exports.createTerminal = exports.executeShellCommand = exports.executeTaskHelper = exports.output = exports.getShellEnvironment = exports.getLaunchConfigurations = exports.selectLaunchConfiguration = exports.getLaunchConfigurationByName = exports.fileExists = exports.getRootPath = void 0;
const vscode_1 = require("vscode");
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const cp = __importStar(require("child_process"));
const setup_1 = require("../setup_utilities/setup");
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
function fileExists(path) {
    let rootPaths = vscode_1.workspace.workspaceFolders;
    if (rootPaths === undefined) {
        return;
    }
    else {
        return rootPaths[0].uri;
    }
}
exports.fileExists = fileExists;
function getLaunchConfigurationByName(configName) {
    let configurations = getLaunchConfigurations();
    if (!configurations) {
        return;
    }
    for (var config of configurations) {
        if (config.name === configName) {
            return config;
        }
    }
}
exports.getLaunchConfigurationByName = getLaunchConfigurationByName;
async function selectLaunchConfiguration() {
    let configurations = getLaunchConfigurations();
    if (!configurations) {
        return;
    }
    const pickOptions = {
        ignoreFocusOut: true,
        placeHolder: "Select Launch Configuration",
    };
    let names = configurations.map(x => (x.name));
    return await vscode.window.showQuickPick(names, pickOptions);
}
exports.selectLaunchConfiguration = selectLaunchConfiguration;
function getLaunchConfigurations() {
    let rootPath = getRootPath();
    if (rootPath) {
        const config = vscode.workspace.getConfiguration("launch", rootPath);
        const configurations = config.get("configurations");
        return configurations;
    }
}
exports.getLaunchConfigurations = getLaunchConfigurations;
//export function setZshArg(platform_name: string, zsh_argument: string[]) {
//  const configuration = vscode.workspace.getConfiguration();
//  let terminal_profile_name = "terminal.integrated.profiles." + platform_name;
//  let terminal_profile: any = configuration.get(terminal_profile_name);
//  if (Object.keys(terminal_profile)[0] === "zsh" || configuration.get('terminal.integrated.defaultProfile.' + platform_name) == "zsh") {
//    terminal_profile.zsh.args = zsh_argument;
//    configuration.update(terminal_profile_name, terminal_profile);
//  }
//}
function getShellEnvironment(setupState, as_terminal_profile = false) {
    if (setupState === undefined) {
        return process.env;
    }
    //let zsh_argument = []
    //if (setupState.env["VIRTUAL_ENV"]) {
    //  let python_venv_location = setupState.env["VIRTUAL_ENV"];
    //  zsh_argument = ["-c", "source " + path.join(python_venv_location, "bin", "activate") + (as_terminal_profile ? "; zsh -i" : "")]
    //
    //  if (getPlatformName() == "macos") {
    //    setZshArg("osx", zsh_argument);
    //  } else if (getPlatformName() == "linux") {
    //    setZshArg("linux", zsh_argument);
    //  }
    //}
    let envPath = process.env;
    if (setupState.env["VIRTUAL_ENV"]) {
        envPath["VIRTUAL_ENV"] = setupState.env["VIRTUAL_ENV"];
    }
    if (setupState.env["PATH"]) {
        envPath["PATH"] = path.join(setupState.env["PATH"], setup_1.pathdivider + envPath["PATH"]);
    }
    envPath["ZEPHYR_BASE"] = setupState.zephyrDir;
    envPath["ZEPHYR_SDK_INSTALL_DIR"] = (0, setup_1.getToolchainDir)();
    //envPath["VIRTUAL_ENV_PROMPT"] = "(.zephyr-ide)";
    //envPath["PROMPT"] = "(.zephyr-ide)";
    //envPath["PS1"] = "(.zephyr-ide) " + envPath["PS1"];
    return envPath;
}
exports.getShellEnvironment = getShellEnvironment;
const vscode = __importStar(require("vscode"));
exports.output = vscode.window.createOutputChannel("Zephyr IDE");
async function executeTask(task) {
    const execution = await vscode.tasks.executeTask(task);
    exports.output.appendLine("Starting Task: " + task.name);
    return new Promise(resolve => {
        let disposable = vscode.tasks.onDidEndTaskProcess(e => {
            if (e.execution.task.name === task.name) {
                disposable.dispose();
                resolve(e.exitCode);
            }
        });
    });
}
async function executeTaskHelper(taskName, cmd, envPath, cwd) {
    exports.output.appendLine(`Running cmd: ${cmd}`);
    let options = {
        env: envPath,
        cwd: cwd,
    };
    let exec = new vscode.ShellExecution(cmd, options);
    // Task
    let task = new vscode.Task({ type: "zephyr-ide:" + taskName, command: taskName }, vscode.TaskScope.Workspace, taskName, "zephyr-ide", exec);
    let res = await executeTask(task);
    return (res !== undefined && res === 0);
}
exports.executeTaskHelper = executeTaskHelper;
async function executeShellCommand(cmd, cwd, envPath, display_error = true) {
    let exec = util.promisify(cp.exec);
    let res = await exec(cmd, { env: envPath, cwd: cwd }).then(value => {
        return { stdout: value.stdout, stderr: value.stderr };
    }, reason => {
        if (display_error) {
            exports.output.append(reason);
        }
        return { stdout: undefined, stderr: reason.stderr };
    });
    return res;
}
exports.executeShellCommand = executeShellCommand;
;
async function createTerminal(setupState, show = false) {
    let opts = {
        name: "Zephyr IDE Terminal",
        env: getShellEnvironment(setupState, true),
        strictEnv: true,
        hideFromUser: !show
    };
    let setup_terminal = await vscode.window.createTerminal(opts);
    //setup_terminal.sendText(".\\.venv\\Scripts\\activate; Clear-Host");
    //setup_terminal.sendText("Clear-Host");
    //let sh = new vscode.ShellExecution(".\\.venv\\Scripts\\activate; Clear-Host");
    vscode.window.onDidChangeTerminalShellIntegration(async ({ terminal, shellIntegration }) => {
        if (terminal === setup_terminal) {
            const execution = shellIntegration.executeCommand('echo "Hello world3"');
            let dat = execution.read();
            vscode.window.onDidEndTerminalShellExecution(async (event) => {
                for await (const data of dat) {
                    console.log(data);
                }
                if (event.execution === execution) {
                    console.log(`Command exited with code ${event.exitCode}`);
                }
            });
        }
    });
    vscode.window.onDidCloseTerminal(t => {
        console.log("terminal closed");
        if (t.exitStatus && t.exitStatus.code) {
            vscode.window.showInformationMessage(`Exit code: ${t.exitStatus.code}`);
        }
    });
    vscode.window.onDidChangeTerminalState(t => {
        console.log("terminal change");
        if (t.state && t.state.isInteractedWith) {
            vscode.window.showInformationMessage(`Exit code: ${t.state}`);
        }
    });
    return setup_terminal;
}
exports.createTerminal = createTerminal;
class TaskManager {
    initializingTerminals = new Set;
    readyTerminals = new Set;
    constructor(message) {
        //this.greeting = message;
    }
    async setupTerminal(setup_terminal) {
        vscode.window.onDidChangeTerminalShellIntegration(async ({ terminal, shellIntegration }) => {
            if (terminal === setup_terminal) {
                const execution = shellIntegration.executeCommand('echo "Hello world3"');
                let dat = execution.read();
                vscode.window.onDidEndTerminalShellExecution(async (event) => {
                    for await (const data of dat) {
                        console.log(data);
                    }
                    if (event.execution === execution) {
                        console.log(`Command exited with code ${event.exitCode}`);
                    }
                });
            }
        });
    }
    async createTerminal(setupState, show = false) {
        let opts = {
            name: "Zephyr IDE Terminal",
            env: getShellEnvironment(setupState, true),
            strictEnv: true,
            hideFromUser: !show
        };
        let setup_terminal = await vscode.window.createTerminal(opts);
        this.initializingTerminals.add(setup_terminal);
        vscode.window.onDidCloseTerminal(t => {
            this.initializingTerminals.delete(t);
            this.readyTerminals.delete(t);
            if (t.exitStatus && t.exitStatus.code) {
                vscode.window.showInformationMessage(`Exit code: ${t.exitStatus.code}`);
            }
        });
        return setup_terminal;
    }
}
let t = new TaskManager("world");
//# sourceMappingURL=utils%20copy.js.map