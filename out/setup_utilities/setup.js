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
exports.westUpdate = exports.setupWestEnvironment = exports.westInit = exports.checkWestInit = exports.workspaceInit = exports.checkIfToolsAvailable = exports.checkIfToolAvailable = exports.getToolchainDir = exports.getToolsDir = exports.pathdivider = exports.clearWorkspaceState = exports.setWorkspaceState = exports.saveSetupState = exports.setSetupState = exports.oneTimeWorkspaceSetup = exports.setDefaultTerminal = exports.loadWorkspaceState = exports.setExternalSetupState = exports.loadExternalSetupState = exports.setGlobalState = exports.loadGlobalState = exports.loadProjectsFromFile = exports.getVariable = exports.getActiveRunnerConfigOfBuild = exports.getActiveBuildConfigOfProject = exports.getActiveRunnerOfBuild = exports.getActiveBuildOfProject = exports.SetupStateType = exports.generateSetupState = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const setup_toolchain_1 = require("../setup_utilities/setup_toolchain");
const utils_1 = require("../utilities/utils");
const west_selector_1 = require("./west_selector");
function generateSetupState(setupPath) {
    return {
        toolsAvailable: false,
        pythonEnvironmentSetup: false,
        westUpdated: false,
        zephyrDir: '',
        env: {},
        setupPath: setupPath
    };
}
exports.generateSetupState = generateSetupState;
var SetupStateType;
(function (SetupStateType) {
    SetupStateType["NONE"] = "None";
    SetupStateType["LOCAL"] = "Local";
    SetupStateType["GLOBAL"] = "Global";
    SetupStateType["EXTERNAL"] = "External";
    SetupStateType["SELECTED"] = "Selected";
})(SetupStateType || (exports.SetupStateType = SetupStateType = {}));
function projectLoader(config, projects) {
    config.projects = {};
    if (config.projectStates === undefined) {
        config.projectStates = {};
    }
    for (let key in projects) {
        config.projects[key] = projects[key];
        //generate project States if they don't exist
        if (config.projectStates[key] == undefined) {
            config.projectStates[key] = { buildStates: {} };
            if (config.activeProject == undefined) {
                config.activeProject = key;
            }
        }
        for (let build_key in projects[key].buildConfigs) {
            if (config.projectStates[key].buildStates[build_key] == undefined) {
                config.projectStates[key].buildStates[build_key] = { runnerStates: {} };
                if (config.projectStates[key].activeBuildConfig == undefined) {
                    config.projectStates[key].activeBuildConfig = build_key;
                }
            }
            //Remove after upgrade
            if (projects[key].buildConfigs[build_key].runnerConfigs == undefined) {
                config.projects[key].buildConfigs[build_key].runnerConfigs = projects[key].buildConfigs[build_key].runners;
            }
            for (let runner_key in projects[key].buildConfigs[build_key].runnerConfigs) {
                if (config.projectStates[key].buildStates[build_key].runnerStates[runner_key] == undefined) {
                    config.projectStates[key].buildStates[build_key].runnerStates[runner_key] = {};
                    if (config.projectStates[key].buildStates[build_key].activeRunner == undefined) {
                        config.projectStates[key].buildStates[build_key].activeRunner = runner_key;
                    }
                }
            }
        }
    }
}
function getActiveBuildOfProject(wsConfig, project) {
    return wsConfig.projectStates[project].activeBuildConfig;
}
exports.getActiveBuildOfProject = getActiveBuildOfProject;
function getActiveRunnerOfBuild(wsConfig, project, build) {
    return wsConfig.projectStates[project].buildStates[build].activeRunner;
}
exports.getActiveRunnerOfBuild = getActiveRunnerOfBuild;
function getActiveBuildConfigOfProject(wsConfig, project) {
    let buildName = wsConfig.projectStates[project].activeBuildConfig;
    if (buildName) {
        return wsConfig.projects[project].buildConfigs[buildName];
    }
    return;
}
exports.getActiveBuildConfigOfProject = getActiveBuildConfigOfProject;
function getActiveRunnerConfigOfBuild(wsConfig, project, build) {
    let activeBuild = getActiveBuildConfigOfProject(wsConfig, project);
    if (activeBuild && wsConfig.projectStates[project].buildStates[build].activeRunner != undefined) {
        let activeRunnerName = wsConfig.projectStates[project].buildStates[build].activeRunner;
        if (activeRunnerName) {
            return activeBuild.runnerConfigs[activeRunnerName];
        }
    }
    return;
}
exports.getActiveRunnerConfigOfBuild = getActiveRunnerConfigOfBuild;
async function getVariable(config, variable_name, project_name, build_name) {
    const zephyrIdeSettingFilePath = path.join(config.rootPath, ".vscode/zephyr-ide.json");
    try {
        var object = await JSON.parse(fs.readFileSync(zephyrIdeSettingFilePath, 'utf8'));
        if (project_name) {
            let projects = object.projects;
            if (build_name) {
                return projects[project_name]["buildConfigs"][build_name]["vars"][variable_name];
            }
            return projects[project_name]["vars"][variable_name];
        }
        return object[variable_name];
    }
    catch (error) {
        console.error('Failed to get custom var, ${variable_name}');
        console.error(error);
        return "";
    }
}
exports.getVariable = getVariable;
async function loadProjectsFromFile(config) {
    const configuration = await vscode.workspace.getConfiguration();
    let useExternalJson = await configuration.get("atmosic-ide.use-zephyr-ide-json");
    if (useExternalJson) {
        const zephyrIdeSettingFilePath = path.join(config.rootPath, ".vscode/zephyr-ide.json");
        try {
            if (!fs.pathExistsSync(zephyrIdeSettingFilePath)) {
                await fs.outputFile(zephyrIdeSettingFilePath, JSON.stringify({}, null, 2), { flag: 'w+' }, function (err) {
                    if (err) {
                        throw err;
                    }
                    console.log('Created zephyr-ide file');
                });
            }
            else {
                var object = await JSON.parse(fs.readFileSync(zephyrIdeSettingFilePath, 'utf8'));
                let projects = object.projects;
                projectLoader(config, projects);
            }
        }
        catch (error) {
            console.error("Failed to load .vscode/zephyr-ide.json");
            console.error(error);
        }
    }
    else {
        let temp = await configuration.get("atmosic-ide.projects");
        temp = JSON.parse(JSON.stringify(temp));
        if (temp) {
            projectLoader(config, temp);
        }
    }
}
exports.loadProjectsFromFile = loadProjectsFromFile;
async function loadGlobalState(context) {
    let globalConfig = await context.globalState.get("zephyr-ide.state") ?? {
        toolchains: {},
        armGdbPath: '',
        setupStateDictionary: {}
    };
    return globalConfig;
}
exports.loadGlobalState = loadGlobalState;
async function setGlobalState(context, globalConfig) {
    await context.globalState.update("zephyr-ide.state", globalConfig);
}
exports.setGlobalState = setGlobalState;
async function loadExternalSetupState(context, globalConfig, path) {
    if (globalConfig.setupStateDictionary) {
        for (let prexistingPath in globalConfig.setupStateDictionary) {
            if (!fs.pathExistsSync(prexistingPath)) {
                delete globalConfig.setupStateDictionary[prexistingPath];
            }
        }
        if (path in globalConfig.setupStateDictionary) {
            return globalConfig.setupStateDictionary[path];
        }
    }
    if (fs.pathExistsSync(path)) {
        let setupState = generateSetupState(path);
        if (globalConfig.setupStateDictionary === undefined) {
            globalConfig.setupStateDictionary = {};
        }
        globalConfig.setupStateDictionary[path] = setupState;
        return setupState;
    }
    return;
}
exports.loadExternalSetupState = loadExternalSetupState;
async function setExternalSetupState(context, globalConfig, path, setupState) {
    if (globalConfig.setupStateDictionary === undefined) {
        globalConfig.setupStateDictionary = {};
    }
    globalConfig.setupStateDictionary[path] = setupState;
    //delete folders that don't exist
    for (path in globalConfig.setupStateDictionary) {
        if (!fs.pathExistsSync(path)) {
            delete globalConfig.setupStateDictionary[path];
        }
    }
    setGlobalState(context, globalConfig);
}
exports.setExternalSetupState = setExternalSetupState;
async function loadWorkspaceState(context) {
    let rootPath = (0, utils_1.getRootPath)()?.fsPath;
    if (!rootPath) {
        rootPath = "";
    }
    let config = await context.workspaceState.get("zephyr.env") ?? {
        rootPath: rootPath,
        projects: {},
        automaticProjectSelction: true,
        initialSetupComplete: false,
        selectSetupType: SetupStateType.NONE,
        projectStates: {}
    };
    loadProjectsFromFile(config);
    return config;
}
exports.loadWorkspaceState = loadWorkspaceState;
function setDefaultTerminal(configuration, target, platform_name) {
    configuration.update('terminal.integrated.defaultProfile.' + platform_name, "Atmosic IDE Terminal", target, false);
}
exports.setDefaultTerminal = setDefaultTerminal;
async function oneTimeWorkspaceSetup(context) {
    let configName = "zephyr-ide-v50-one-time-config.env";
    let oneTimeConfig = await context.workspaceState.get(configName);
    if (oneTimeConfig === undefined || oneTimeConfig === false) {
        const configuration = await vscode.workspace.getConfiguration();
        const target = vscode.ConfigurationTarget.Workspace;
        if ((0, setup_toolchain_1.getPlatformName)() === "windows") {
            setDefaultTerminal(configuration, target, "windows");
        }
        if ((0, setup_toolchain_1.getPlatformName)() === "linux") {
            setDefaultTerminal(configuration, target, "linux");
        }
        if ((0, setup_toolchain_1.getPlatformName)() === "macos") {
            setDefaultTerminal(configuration, target, "osx");
        }
        configuration.update("C_Cpp.default.compileCommands", path.join("${workspaceFolder}", '.vscode', 'compile_commands.json'), target);
        configuration.update("cmake.configureOnOpen", false, target);
        await context.workspaceState.update(configName, true);
    }
}
exports.oneTimeWorkspaceSetup = oneTimeWorkspaceSetup;
async function generateGitIgnore(context, wsConfig) {
    const extensionPath = context.extensionPath;
    let srcPath = path.join(extensionPath, "git_ignores", "gitignore_workspace_install");
    let desPath = path.join(wsConfig.rootPath, ".gitignore");
    let exists = await fs.pathExists(desPath);
    if (!exists) {
        let res = await fs.copyFile(srcPath, desPath, fs.constants.COPYFILE_FICLONE);
    }
}
async function setSetupState(context, wsConfig, globalConfig, setupStateType, ext_path = "") {
    generateGitIgnore(context, wsConfig); // Try to generate a .gitignore each time this is run
    if (setupStateType !== SetupStateType.NONE) {
        oneTimeWorkspaceSetup(context);
    }
    if (setupStateType === SetupStateType.SELECTED) {
        wsConfig.activeSetupState = await loadExternalSetupState(context, globalConfig, ext_path);
        if (wsConfig.activeSetupState) {
            wsConfig.selectSetupType = setupStateType;
        }
        else {
            wsConfig.selectSetupType = SetupStateType.NONE;
        }
    }
    else {
        wsConfig.activeSetupState = undefined;
        wsConfig.selectSetupType = setupStateType;
    }
    await setWorkspaceState(context, wsConfig);
    const configuration = await vscode.workspace.getConfiguration();
    const target = vscode.ConfigurationTarget.Workspace;
    if (wsConfig.activeSetupState && wsConfig.activeSetupState.zephyrDir) {
        if (wsConfig.activeSetupState.setupPath === wsConfig.rootPath) {
            configuration.update("devicetree.zephyr", path.join("${workspaceFolder}", path.relative(wsConfig.rootPath, wsConfig.activeSetupState.zephyrDir)), target);
            configuration.update("kconfig.zephyr.base", path.join("${workspaceFolder}", path.relative(wsConfig.rootPath, wsConfig.activeSetupState.zephyrDir)), target);
        }
        else {
            configuration.update("devicetree.zephyr", wsConfig.activeSetupState.zephyrDir, target);
            configuration.update("kconfig.zephyr.base", wsConfig.activeSetupState.zephyrDir, target);
        }
    }
}
exports.setSetupState = setSetupState;
function saveSetupState(context, wsConfig, globalConfig) {
    if (wsConfig.activeSetupState) {
        setExternalSetupState(context, globalConfig, wsConfig.activeSetupState.setupPath, wsConfig.activeSetupState);
    }
    setGlobalState(context, globalConfig);
}
exports.saveSetupState = saveSetupState;
async function setWorkspaceState(context, wsConfig) {
    fs.outputFile(path.join(wsConfig.rootPath, ".vscode/zephyr-ide.json"), JSON.stringify({ projects: wsConfig.projects }, null, 2), { flag: 'w+' }, function (err) {
        if (err) {
            throw err;
        }
    });
    const configuration = await vscode.workspace.getConfiguration();
    const target = vscode.ConfigurationTarget.Workspace;
    await configuration.update("atmosic-ide.use-zephyr-ide-json", true, target);
    await configuration.update('atmosic-ide.projects', null, false);
    await context.workspaceState.update("zephyr.env", wsConfig);
}
exports.setWorkspaceState = setWorkspaceState;
async function clearWorkspaceState(context, wsConfig) {
    wsConfig.automaticProjectSelction = true;
    wsConfig.initialSetupComplete = false;
    wsConfig.selectSetupType = SetupStateType.NONE;
    setWorkspaceState(context, wsConfig);
}
exports.clearWorkspaceState = clearWorkspaceState;
let python = os.platform() === "linux" ? "python3" : "python";
exports.pathdivider = os.platform() === "win32" ? ";" : ":";
let toolsfoldername = ".zephyr_ide";
function getToolsDir() {
    let toolsdir = path.join(os.homedir(), toolsfoldername);
    const configuration = vscode.workspace.getConfiguration();
    let toolsDirFromFile = configuration.get("atmosic-ide.tools_directory");
    if (toolsDirFromFile != undefined || toolsDirFromFile != null) {
        toolsdir = toolsDirFromFile;
    }
    return toolsdir;
}
exports.getToolsDir = getToolsDir;
function getToolchainDir() {
    return path.join(getToolsDir(), "toolchains");
}
exports.getToolchainDir = getToolchainDir;
async function checkIfToolAvailable(tool, cmd, wsConfig, printStdOut, includes) {
    if (wsConfig.activeSetupState == undefined) {
        vscode.window.showErrorMessage(`Unable to check for tools. Select Global or Local Install First.`);
        return;
    }
    let res = await (0, utils_1.executeShellCommand)(cmd, wsConfig.activeSetupState?.setupPath, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), true);
    if (res.stdout) {
        if (printStdOut) {
            utils_1.output.append(res.stdout);
        }
        if ((includes && res.stdout.includes(includes)) || includes === undefined) {
            utils_1.output.appendLine(`[SETUP] ${tool} installed`);
            return true;
        }
        utils_1.output.appendLine(`[SETUP] ${tool} of the correct version is not found`);
        vscode.window.showErrorMessage(`Unable to continue. ${tool} not installed. Check output for more info.`);
        return false;
    }
    else {
        utils_1.output.appendLine(`[SETUP] ${tool} is not found`);
        utils_1.output.appendLine(`[SETUP] Follow zephyr getting started guide for how to install ${tool}`);
        vscode.window.showErrorMessage(`Unable to continue. ${tool} not installed. Check output for more info.`);
        return false;
    }
}
exports.checkIfToolAvailable = checkIfToolAvailable;
async function checkIfToolsAvailable(context, wsConfig, globalConfig, solo = true) {
    if (wsConfig.activeSetupState === undefined) {
        return;
    }
    wsConfig.activeSetupState.toolsAvailable = false;
    saveSetupState(context, wsConfig, globalConfig);
    utils_1.output.show();
    utils_1.output.appendLine("Atmosic IDE will now check if build tools are installed and available in system path.");
    utils_1.output.appendLine("Please follow the section Install Dependencies. https://docs.zephyrproject.org/latest/develop/getting_started/index.html#install-dependencies.");
    utils_1.output.appendLine("The remaining sections on that page will automatically be handled by the zephyr tools extension");
    utils_1.output.appendLine("For Windows you may use Chocolately, for debian you may use apt, and for macOS you may use Homebrew");
    let res = await checkIfToolAvailable("git", "git --version", wsConfig, true);
    if (!res) {
        return false;
    }
    res = await checkIfToolAvailable("python", `${python} --version`, wsConfig, true, "Python 3");
    if (!res) {
        return false;
    }
    res = await checkIfToolAvailable("pip", `${python} -m pip --version`, wsConfig, true);
    if (!res) {
        return false;
    }
    res = await checkIfToolAvailable("python3 venv", `${python} -m venv --help`, wsConfig, false);
    if (!res) {
        return false;
    }
    res = await checkIfToolAvailable("cmake", `cmake --version`, wsConfig, true);
    if (!res) {
        return false;
    }
    res = await checkIfToolAvailable("dtc", "dtc --version", wsConfig, true);
    if (!res) {
        return false;
    }
    wsConfig.activeSetupState.toolsAvailable = true;
    saveSetupState(context, wsConfig, globalConfig);
    if (solo) {
        vscode.window.showInformationMessage("Atmosic IDE: Build Tools are available");
    }
    return true;
}
exports.checkIfToolsAvailable = checkIfToolsAvailable;
function workspaceInit(context, wsConfig, globalConfig, progressUpdate) {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Atmosic IDE Workspace Initialization',
        cancellable: false,
    }, async (progress, token) => {
        if (wsConfig.activeSetupState === undefined) {
            return;
        }
        let westInited = await checkWestInit(wsConfig.activeSetupState);
        let westSelection;
        if (!westInited) {
            westSelection = await (0, west_selector_1.westSelector)(context, wsConfig);
            if (westSelection === undefined || westSelection.failed) {
                vscode.window.showErrorMessage("Atmosic IDE Initialization: Invalid West Init Selection");
                return;
            }
        }
        let toolchainSelection = await (0, setup_toolchain_1.pickToolchainTarget)(context, globalConfig);
        progress.report({ message: "Checking for Build Tools In Path (1/5)" });
        await checkIfToolsAvailable(context, wsConfig, globalConfig, false);
        progressUpdate(wsConfig);
        if (!wsConfig.activeSetupState.toolsAvailable) {
            vscode.window.showErrorMessage("Atmosic IDE Initialization: Missing Build Tools. See Output. Workspace Init Failed");
            return;
        }
        progress.report({ message: "Setting Up Python Environment (2/5)", increment: 5 });
        await setupWestEnvironment(context, wsConfig, globalConfig, false);
        progressUpdate(wsConfig);
        if (!wsConfig.activeSetupState.pythonEnvironmentSetup) {
            vscode.window.showErrorMessage("Atmosic IDE Initialization Step 2/5: Failed to Create Python Environment");
            return;
        }
        progress.report({ message: "Installing SDK (3/5)", increment: 20 });
        await (0, setup_toolchain_1.installSdk)(context, globalConfig, utils_1.output, true, toolchainSelection, false);
        progressUpdate(wsConfig);
        if (!globalConfig.sdkInstalled) {
            vscode.window.showErrorMessage("Atmosic IDE Initialization Step 3/5: Sdk failed to install");
            return;
        }
        progress.report({ message: "Initializing West Respository (4/5)", increment: 20 });
        westInited = await checkWestInit(wsConfig.activeSetupState);
        if (!westInited) {
            let result = await westInit(context, wsConfig, globalConfig, false, westSelection);
            progressUpdate(wsConfig);
            if (result === false) {
                vscode.window.showErrorMessage("Atmosic IDE Initialization Step 4/5: West Failed to initialize");
                return;
            }
        }
        progress.report({ message: "Updating West Repository (5/5)", increment: 30 });
        await westUpdate(context, wsConfig, globalConfig, false);
        progressUpdate(wsConfig);
        if (!wsConfig.activeSetupState.westUpdated) {
            vscode.window.showErrorMessage("Atmosic IDE Initialization Step 5/5: West Failed to update");
            return;
        }
        progress.report({ message: "Atmosic IDE Initialization Complete", increment: 100 });
        progressUpdate(wsConfig);
        vscode.window.showInformationMessage("Atmosic IDE Initialization Complete");
    });
}
exports.workspaceInit = workspaceInit;
function checkWestInit(setupState) {
    let westPath = path.join(setupState.setupPath, ".west");
    let res = fs.pathExistsSync(westPath);
    return res;
}
exports.checkWestInit = checkWestInit;
async function westInit(context, wsConfig, globalConfig, solo = true, westSelection) {
    if (wsConfig.activeSetupState === undefined || wsConfig.activeSetupState.setupPath === undefined) {
        return;
    }
    let westInited = await checkWestInit(wsConfig.activeSetupState);
    if (westInited) {
        const selection = await vscode.window.showWarningMessage('Atmosic IDE: West already initialized. Call West Update instead. If you would like to reinitialize the .west folder will be deleted', 'Reinitialize', 'Cancel');
        if (selection !== 'Reinitialize') {
            return true;
        }
    }
    if (westSelection === undefined) {
        westSelection = await (0, west_selector_1.westSelector)(context, wsConfig);
        if (westSelection === undefined || westSelection.failed) {
            return false;
        }
    }
    let westPath = path.join(wsConfig.activeSetupState.setupPath, ".west");
    wsConfig.activeSetupState.westUpdated = false;
    saveSetupState(context, wsConfig, globalConfig);
    // Delete .west if it already exists 
    if ((await fs.pathExists(westPath))) {
        await fs.rmSync(westPath, { recursive: true, force: true });
    }
    const configuration = vscode.workspace.getConfiguration();
    const target = vscode.ConfigurationTarget.Workspace;
    configuration.update('git.enabled', false, target, false);
    configuration.update('git.path', false, target, false);
    configuration.update('git.autofetch', false, target, false);
    configuration.update('git.autorefresh', false, target, false);
    let cmd;
    if (westSelection.gitRepo) {
        cmd = `west init -m ${westSelection.gitRepo} ${westSelection.additionalArgs} ${westSelection.emptyArgument}`;
    }
    else if (westSelection.path === undefined) {
        cmd = `west init ${westSelection.additionalArgs}`;
    }
    else {
        cmd = `west init -l ${westSelection.path} ${westSelection.additionalArgs}`;
    }
    wsConfig.activeSetupState.zephyrDir = "";
    let westInitRes = await (0, utils_1.executeTaskHelper)("Atmosic IDE: West Init", cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState.setupPath);
    if (!westInitRes) {
        vscode.window.showErrorMessage("West Init Failed. See terminal for error information.");
    }
    else {
        if (solo) {
            vscode.window.showInformationMessage(`Successfully Completed West Init`);
        }
        saveSetupState(context, wsConfig, globalConfig);
    }
    configuration.update('git.enabled', undefined, target, false);
    configuration.update('git.path', undefined, target, false);
    configuration.update('git.autofetch', undefined, target, false);
    configuration.update('git.autorefresh', undefined, target, false);
    return westInitRes;
}
exports.westInit = westInit;
async function setupWestEnvironment(context, wsConfig, globalConfig, solo = true) {
    if (wsConfig.activeSetupState === undefined) {
        return;
    }
    let pythonenv = path.join(wsConfig.activeSetupState.setupPath, ".venv");
    let env_exists = await fs.pathExists(pythonenv);
    let westEnvironmentSetup = 'Reinitialize';
    if (wsConfig.activeSetupState.pythonEnvironmentSetup || env_exists) {
        if (env_exists) {
            westEnvironmentSetup = await vscode.window.showWarningMessage('Atmosic IDE: Python Env already exists', 'Use Existing', 'Reinitialize', 'Cancel');
        }
        else {
            westEnvironmentSetup = await vscode.window.showWarningMessage('Atmosic IDE: Python Env already setup', 'Reinitialize', 'Cancel');
        }
        if (westEnvironmentSetup !== 'Reinitialize' && westEnvironmentSetup !== 'Use Existing') {
            return;
        }
    }
    // Show setup progress..
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Setting up West Python Environment",
        cancellable: false,
    }, async (progress, token) => {
        if (wsConfig.activeSetupState === undefined) {
            return;
        }
        wsConfig.activeSetupState.pythonEnvironmentSetup = false;
        wsConfig.activeSetupState.env = {};
        saveSetupState(context, wsConfig, globalConfig);
        if (westEnvironmentSetup === "Reinitialize") {
            // Delete python env if it already exists 
            if ((await fs.pathExists(pythonenv))) {
                await fs.rmSync(pythonenv, { recursive: true, force: true });
            }
            // Then create the virtualenv
            let cmd = `${python} -m venv "${pythonenv}"`;
            let res = await (0, utils_1.executeShellCommand)(cmd, wsConfig.activeSetupState.setupPath, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), true);
            if (res.stderr) {
                utils_1.output.appendLine("[SETUP] Unable to create Python Virtual Environment");
                vscode.window.showErrorMessage("Error installing virtualenv. Check output for more info.");
                return;
            }
            else {
                utils_1.output.appendLine("[SETUP] Python Virtual Environment created");
            }
        }
        // Report progress
        progress.report({ increment: 5 });
        wsConfig.activeSetupState.env["VIRTUAL_ENV"] = pythonenv;
        // Add env/bin to path
        wsConfig.activeSetupState.env["PATH"] = path.join(pythonenv, `bin${exports.pathdivider}`);
        wsConfig.activeSetupState.env["PATH"] = path.join(path.join(pythonenv, `Scripts${exports.pathdivider}`), exports.pathdivider + wsConfig.activeSetupState.env["PATH"]);
        // Install `west`
        let res = await (0, utils_1.executeShellCommand)(`python -m pip install west`, wsConfig.activeSetupState.setupPath, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), true);
        if (res.stdout) {
            utils_1.output.append(res.stdout);
            utils_1.output.appendLine("[SETUP] west installed");
        }
        else {
            utils_1.output.appendLine("[SETUP] Unable to install west");
            vscode.window.showErrorMessage("Error installing west. Check output for more info.");
            return;
        }
        utils_1.output.appendLine("[SETUP] West Python Environment Setup complete!");
        // Setup flag complete
        wsConfig.activeSetupState.pythonEnvironmentSetup = true;
        saveSetupState(context, wsConfig, globalConfig);
        progress.report({ increment: 100 });
        if (solo) {
            vscode.window.showInformationMessage(`Atmosic IDE: West Python Environment Setup!`);
        }
    });
}
exports.setupWestEnvironment = setupWestEnvironment;
;
async function westUpdate(context, wsConfig, globalConfig, solo = true) {
    if (wsConfig.activeSetupState === undefined) {
        return;
    }
    // Get the active workspace root path
    if (solo) {
        vscode.window.showInformationMessage(`Atmosic IDE: West Update`);
    }
    let westUpdateRes = await (0, utils_1.executeTaskHelper)("Atmosic IDE: West Update", `west update`, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState.setupPath);
    if (!westUpdateRes) {
        vscode.window.showErrorMessage("West Update Failed. Check output for more info.");
        return false;
    }
    // Get zephyr BASE
    let base = undefined;
    // Get listofports
    let cmd = `west list -f {path:28} zephyr`;
    let res = await (0, utils_1.executeShellCommand)(cmd, wsConfig.activeSetupState.setupPath, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), true);
    if (res.stdout && res.stdout.includes("zephyr")) {
        base = res.stdout.trim();
    }
    if (base) {
        wsConfig.activeSetupState.zephyrDir = path.join(wsConfig.activeSetupState.setupPath, base);
    }
    else {
        vscode.window.showErrorMessage("West Update Failed. Could not find Zephyr Directory.");
        return;
    }
    if (!wsConfig.activeSetupState.zephyrDir) {
        vscode.window.showErrorMessage("West Update Failed. Missing zephyr base directory.");
        return false;
    }
    cmd = `pip install -r ${path.join(wsConfig.activeSetupState.zephyrDir, "scripts", "requirements.txt")}`;
    let pipInstallRes = await (0, utils_1.executeTaskHelper)("Atmosic IDE: West Update", cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState.setupPath);
    if (!pipInstallRes) {
        vscode.window.showErrorMessage("West Update Failed. Error installing python requirements.");
        return false;
    }
    cmd = `pip install -U dtsh`;
    let dtshInstallRes = await (0, utils_1.executeTaskHelper)("Atmosic IDE: West Update", cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState.setupPath);
    if (!dtshInstallRes) {
        vscode.window.showWarningMessage("Failed to install dtsh");
    }
    wsConfig.initialSetupComplete = true;
    wsConfig.activeSetupState.westUpdated = true;
    saveSetupState(context, wsConfig, globalConfig);
    setWorkspaceState(context, wsConfig);
    if (solo) {
        vscode.window.showInformationMessage("Atmosic IDE: West Update Complete");
    }
    return true;
}
exports.westUpdate = westUpdate;
//# sourceMappingURL=setup.js.map
