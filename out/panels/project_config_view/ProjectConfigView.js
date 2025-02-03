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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectConfigView = exports.ProjectConfigState = void 0;
const vscode = __importStar(require("vscode"));
const path_1 = __importDefault(require("path"));
const project_1 = require("../../project_utilities/project");
const getNonce_1 = require("../../utilities/getNonce");
const build_1 = require("../../zephyr_utilities/build");
const flash_1 = require("../../zephyr_utilities/flash");
const setup_1 = require("../../setup_utilities/setup");
class ProjectConfigState {
    projectOpenState = true;
    buildOpenState = true;
    runnerOpenState = true;
    projectKConfigOpenState = true;
    projectOverlayOpenState = true;
    buildKConfigOpenState = true;
    buildOverlayOpenState = true;
}
exports.ProjectConfigState = ProjectConfigState;
class ProjectConfigView {
    extensionPath;
    context;
    wsConfig;
    view;
    needToClearHtml = false;
    treeData = [];
    projectConfigState;
    path_icons = {
        branch: 'folder-library',
        leaf: 'folder-library',
        open: 'folder-library',
    };
    fileActions = [{
            icon: "add",
            actionId: "addFile",
            tooltip: "Add File",
        }];
    fileItemActions = [{
            icon: "trash",
            actionId: "deleteFile",
            tooltip: "Delete File",
        }];
    constructor(extensionPath, context, wsConfig) {
        this.extensionPath = extensionPath;
        this.context = context;
        this.wsConfig = wsConfig;
        this.projectConfigState = this.context.workspaceState.get("zephyr-ide.project-config-view-state") ?? new ProjectConfigState;
    }
    async setProjectConfigState() {
        await this.context.workspaceState.update("zephyr-ide.project-config-view-state", this.projectConfigState);
    }
    generateOverlayFileEntry(entry, projectName, buildName, confFiles, open) {
        entry.subItems = [];
        entry.open = open === undefined ? true : open;
        for (let index = 0; index < confFiles.overlay.length; index++) {
            entry.subItems.push({
                icons: {
                    branch: 'file',
                    leaf: 'file',
                    open: 'file',
                }, label: 'dtc',
                value: { project: projectName, build: buildName, cmd: "removeOverlayFile", isExtra: false, filename: confFiles.overlay[index] },
                actions: this.fileItemActions,
                description: confFiles.overlay[index]
            });
        }
        for (let index = 0; index < confFiles.extraOverlay.length; index++) {
            entry.subItems.push({
                icons: {
                    branch: 'file',
                    leaf: 'file',
                    open: 'file',
                }, label: 'Extra dtc',
                value: { project: projectName, build: buildName, cmd: "removeOverlayFile", isExtra: true, filename: confFiles.extraOverlay[index] },
                actions: this.fileItemActions,
                description: confFiles.extraOverlay[index]
            });
        }
        return { entry };
    }
    generateConfigFileEntry(entry, projectName, buildName, confFiles, open) {
        entry.subItems = [];
        entry.open = open === undefined ? true : open;
        if (confFiles !== undefined) {
            for (let index = 0; index < confFiles.config.length; index++) {
                entry.subItems.push({
                    icons: {
                        branch: 'file',
                        leaf: 'file',
                        open: 'file',
                    }, label: 'Conf',
                    value: { project: projectName, build: buildName, cmd: "removeKConfigFile", isExtra: false, filename: confFiles.config[index] },
                    actions: this.fileItemActions,
                    description: confFiles.config[index]
                });
            }
            for (let index = 0; index < confFiles.extraConfig.length; index++) {
                entry.subItems.push({
                    icons: {
                        branch: 'file',
                        leaf: 'file',
                        open: 'file',
                    }, label: 'Extra Conf',
                    value: { project: projectName, build: buildName, cmd: "removeKConfigFile", isExtra: true, filename: confFiles.extraConfig[index] },
                    actions: this.fileItemActions,
                    description: confFiles.extraConfig[index]
                });
            }
        }
        return entry;
    }
    generateRunnerString(projectName, buildName, runner, open) {
        let entry = {
            icons: {
                branch: 'chip',
                leaf: 'chip',
                open: 'chip',
            },
            label: runner.name,
            value: { project: projectName, build: buildName, runner: runner.name },
            open: open === undefined ? true : open,
            subItems: [
                {
                    icons: {
                        branch: 'tools',
                        leaf: 'tools',
                        open: 'tools',
                    }, label: 'Runner', description: runner.runner
                },
                {
                    icons: {
                        branch: 'file-code',
                        leaf: 'file-code',
                        open: 'file-code',
                    }, label: 'Args', description: runner.args
                }
            ]
        };
        return entry;
    }
    generateBuildString(buildData, projectName, build, open, kConfigOpen, overlayOpen) {
        if (buildData === undefined) {
            buildData = {};
            buildData['icons'] = {
                branch: 'project',
                leaf: 'project',
                open: 'project',
            };
            buildData['label'] = build.name;
            buildData['value'] = { project: projectName, build: build.name };
            buildData['open'] = open === undefined ? true : open;
            buildData['subItems'] = [
                {
                    icons: {
                        branch: 'circuit-board',
                        leaf: 'circuit-board',
                        open: 'circuit-board',
                    },
                    value: { cmd: "openBoardDtc", project: projectName, build: build.name },
                    label: 'Board',
                    description: build.board
                },
                {
                    icons: {
                        branch: 'file-submodule',
                        leaf: 'file-submodule',
                        open: 'file-submodule',
                    },
                    value: { cmd: "openBoardDir", project: projectName, build: build.name },
                    label: 'Board Dir',
                    description: build.relBoardDir,
                },
                {
                    icons: {
                        branch: 'settings',
                        leaf: 'settings',
                        open: 'settings',
                    },
                    actions: this.fileActions,
                    label: "KConfig",
                    value: { project: projectName, build: build.name, cmd: "addKConfigFile" },
                    open: true,
                    subItems: []
                }, {
                    icons: {
                        branch: 'circuit-board',
                        leaf: 'circuit-board',
                        open: 'circuit-board',
                    },
                    actions: this.fileActions,
                    label: "DTC Overlay",
                    value: { project: projectName, build: build.name, cmd: "addOverlayFile" },
                    open: true,
                    subItems: []
                }, {
                    icons: {
                        branch: 'circuit-board',
                        leaf: 'circuit-board',
                        open: 'circuit-board',
                    },
                    label: "West Args",
                    value: { project: projectName, build: build.name, cmd: "modifyBuildArgs" },
                    description: build.westBuildArgs,
                }, {
                    icons: {
                        branch: 'circuit-board',
                        leaf: 'circuit-board',
                        open: 'circuit-board',
                    },
                    label: "CMake Args",
                    value: { project: projectName, build: build.name, cmd: "modifyBuildArgs" },
                    description: build.westBuildCMakeArgs,
                },
            ];
        }
        this.generateConfigFileEntry(buildData.subItems[2], projectName, build.name, build.confFiles, kConfigOpen);
        this.generateOverlayFileEntry(buildData.subItems[3], projectName, build.name, build.confFiles, overlayOpen);
        //if statements may be removed in the future once everyone has upgraded.
        if (build.westBuildArgs) {
            buildData.subItems[4].description = build.westBuildArgs;
        }
        if (build.westBuildCMakeArgs) {
            buildData.subItems[5].description = build.westBuildCMakeArgs;
        }
        return buildData;
    }
    generateProjectString(projectData, project, open, kConfigOpen, overlayOpen) {
        if (projectData === undefined) {
            projectData = {};
            projectData['icons'] = {
                branch: 'folder',
                leaf: 'file',
                open: 'folder-opened',
            };
            projectData['label'] = project.name;
            projectData['value'] = { project: project.name };
            projectData['open'] = open === undefined ? true : open;
            projectData['subItems'] = [
                {
                    icons: this.path_icons,
                    label: 'main',
                    description: project.rel_path,
                    value: { cmd: "openMain", project: project.name },
                },
                {
                    icons: this.path_icons,
                    label: 'CMake File',
                    value: { cmd: "openCmakeFile", project: project.name },
                },
                {
                    icons: {
                        branch: 'settings',
                        leaf: 'settings',
                        open: 'settings',
                    },
                    actions: this.fileActions,
                    label: "KConfig",
                    value: { project: project.name, build: undefined, cmd: "addKConfigFile" },
                    open: true,
                    subItems: []
                }, {
                    icons: {
                        branch: 'circuit-board',
                        leaf: 'circuit-board',
                        open: 'circuit-board',
                    },
                    actions: this.fileActions,
                    label: "DTC Overlay",
                    value: { project: project.name, build: undefined, cmd: "addOverlayFile" },
                    open: true,
                    subItems: []
                },
            ];
        }
        this.generateConfigFileEntry(projectData.subItems[2], project.name, undefined, project.confFiles, kConfigOpen);
        this.generateOverlayFileEntry(projectData.subItems[3], project.name, undefined, project.confFiles, overlayOpen);
        return projectData;
    }
    updateWebView(wsConfig) {
        if (Object.keys(wsConfig.projects).length === 0) {
            let bodyString = '<vscode-label side-aligned="end">No Projects Registered In Workspace</vscode-label>';
            this.setHtml(bodyString);
            this.needToClearHtml = true;
            return;
        }
        else if (this.needToClearHtml) {
            this.setHtml("");
        }
        if (wsConfig.activeProject === undefined) {
            wsConfig.activeProject = Object.keys(wsConfig.projects)[0];
        }
        let activeProject = wsConfig.projects[wsConfig.activeProject];
        let activeBuild = (0, setup_1.getActiveBuildConfigOfProject)(wsConfig, wsConfig.activeProject);
        let activeRunner;
        if (activeBuild) {
            activeRunner = (0, setup_1.getActiveRunnerConfigOfBuild)(wsConfig, wsConfig.activeProject, activeBuild.name);
        }
        if (this.treeData[0] != undefined) {
            this.projectConfigState.projectOpenState = (this.treeData[0].open != undefined) ? this.treeData[0].open : this.projectConfigState.projectOpenState;
            if (this.treeData[0].subItems != undefined) {
                if (this.treeData[0].subItems.length >= 4) {
                    this.projectConfigState.projectKConfigOpenState = this.treeData[0].subItems[2].open != undefined ? this.treeData[0].subItems[2].open : this.projectConfigState.projectKConfigOpenState;
                    this.projectConfigState.projectOverlayOpenState = this.treeData[0].subItems[3].open != undefined ? this.treeData[0].subItems[3].open : this.projectConfigState.projectOverlayOpenState;
                }
            }
        }
        if (this.treeData[1] != undefined) {
            this.projectConfigState.buildOpenState = this.treeData[1].open != undefined ? this.treeData[1].open : this.projectConfigState.buildOpenState;
            if (this.treeData[1].subItems != undefined) {
                if (this.treeData[1].subItems.length >= 4) {
                    this.projectConfigState.buildKConfigOpenState = this.treeData[1].subItems[2].open != undefined ? this.treeData[1].subItems[2].open : this.projectConfigState.buildKConfigOpenState;
                    this.projectConfigState.buildOverlayOpenState = this.treeData[1].subItems[3].open != undefined ? this.treeData[1].subItems[3].open : this.projectConfigState.buildOverlayOpenState;
                }
            }
        }
        if (this.treeData[2] != undefined) {
            this.projectConfigState.runnerOpenState = this.treeData[2].open != undefined ? this.treeData[2].open : this.projectConfigState.runnerOpenState;
        }
        this.projectConfigState.buildKConfigOpenState = (this.treeData[2] != undefined && this.treeData[2].open != undefined) ? this.treeData[2].open : this.projectConfigState.runnerOpenState;
        this.projectConfigState.buildOverlayOpenState = (this.treeData[2] != undefined && this.treeData[2].open != undefined) ? this.treeData[2].open : this.projectConfigState.runnerOpenState;
        if (activeProject) {
            this.treeData[0] = this.generateProjectString(undefined, wsConfig.projects[wsConfig.activeProject], this.projectConfigState.projectOpenState, this.projectConfigState.projectKConfigOpenState, this.projectConfigState.projectOverlayOpenState);
            if (activeBuild) {
                this.treeData[1] = this.generateBuildString(undefined, activeProject.name, activeBuild, this.projectConfigState.buildOpenState, this.projectConfigState.buildKConfigOpenState, this.projectConfigState.buildOverlayOpenState);
                if (activeRunner) {
                    this.treeData[2] = this.generateRunnerString(activeProject.name, activeBuild?.name, activeRunner, this.projectConfigState.runnerOpenState);
                }
                else {
                    this.treeData[2] = {};
                }
            }
            else {
                this.treeData[1] = {};
                this.treeData[2] = {};
            }
        }
        else {
            this.treeData = [];
        }
        if (this.view) {
            this.view.webview.postMessage(this.treeData);
        }
    }
    setHtml(body) {
        if (this.view !== undefined) {
            const fileUri = (fp) => {
                const fragments = fp.split('/');
                return vscode.Uri.file(path_1.default.join(this.extensionPath, ...fragments));
            };
            const assetUri = (fp) => {
                if (this.view) {
                    return this.view.webview.asWebviewUri(fileUri(fp));
                }
            };
            const nonce = (0, getNonce_1.getNonce)();
            this.view.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <link rel="stylesheet" href="${assetUri('node_modules/@vscode/codicons/dist/codicon.css')}"  id="vscode-codicon-stylesheet">
      <link rel="stylesheet" href="${assetUri('src/panels/view.css')}">
      <script nonce="${nonce}" src="${assetUri('node_modules/@vscode-elements/elements/dist/bundled.js')}"  type="module"></script>
      <script nonce="${nonce}" src="${assetUri('src/panels/project_config_view/ProjectConfigViewHandler.js')}"  type="module"></script>
    </head>
    <body>
    <vscode-tree id="project-config-tree" indent-guides arrows></vscode-tree>
    ${body}
    </body>
    </html>`;
        }
    }
    ;
    resolveWebviewView(webviewView, context, token) {
        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        };
        this.view = webviewView;
        webviewView.webview.onDidReceiveMessage(message => {
            console.log(message);
            if (message.treeData) {
                this.treeData = message.treeData;
                this.setProjectConfigState();
            }
            switch (message.command) {
                case "deleteProject": {
                    (0, project_1.removeProject)(this.context, this.wsConfig, message.value.project).finally(() => { vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                    break;
                }
                case "addBuild": {
                    (0, project_1.addBuildToProject)(this.wsConfig, this.context, message.value.project).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project); vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                    break;
                }
                case "deleteBuild": {
                    (0, project_1.removeBuild)(this.context, this.wsConfig, message.value.project, message.value.build).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project); vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                    break;
                }
                case "addRunner": {
                    (0, project_1.addRunnerToBuild)(this.wsConfig, this.context, message.value.project, message.value.build).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build); vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                    break;
                }
                case "deleteRunner": {
                    (0, project_1.removeRunner)(this.context, this.wsConfig, message.value.project, message.value.build, message.value.runner).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build); vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                    break;
                }
                case "build": {
                    (0, build_1.buildByName)(this.wsConfig, false, message.value.project, message.value.build);
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build);
                    break;
                }
                case "buildPristine": {
                    (0, build_1.buildByName)(this.wsConfig, true, message.value.project, message.value.build);
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build);
                    break;
                }
                case "menuConfig": {
			vscode.window.showErrorMessage("Invalid");

                    (0, build_1.buildByName)(this.wsConfig, true, message.value.project, message.value.build, true);
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build);
                    break;
                }
                case "debugging": {
                    (0, build_1.buildByName)(this.wsConfig, true, message.value.project, message.value.build, true);
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build);
                    break;
                }
                case "flash": {
                    (0, flash_1.flashByName)(this.wsConfig, message.value.project, message.value.build, message.value.runner);
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build, message.value.runner);
                    break;
                }
                case "setActive": {
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build, message.value.runner);
                    break;
                }
                case "openBoardDtc": {
                    let build = this.wsConfig.projects[message.value.project].buildConfigs[message.value.build];
                    let filePath = vscode.Uri.file(path_1.default.join(build.relBoardSubDir, "board.cmake"));
                    if (path_1.default.isAbsolute(build.relBoardSubDir)) {
                        if (build.board.includes("/")) {
                            filePath = vscode.Uri.file(path_1.default.join(build.relBoardSubDir, "board.cmake"));
                        }
                        else {
                            filePath = vscode.Uri.file(path_1.default.join(build.relBoardSubDir, build.board + ".dts"));
                        }
                    }
                    else {
                        if (build.relBoardDir) {
                            //Custom Folder
                            filePath = vscode.Uri.file(path_1.default.join(this.wsConfig.rootPath, build.relBoardDir, build.relBoardSubDir, build.board + ".dts"));
                        }
                        else if (this.wsConfig.activeSetupState) {
                            //Default zephyr folder
                            filePath = vscode.Uri.file(path_1.default.join(this.wsConfig.activeSetupState?.zephyrDir, 'boards', build.relBoardSubDir, build.board + ".dts"));
                        }
                    }
                    vscode.workspace.openTextDocument(filePath).then(document => vscode.window.showTextDocument(document));
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build, message.value.runner);
                    break;
                }
                case "openMain": {
                    let project = this.wsConfig.projects[message.value.project];
                    let filePath = vscode.Uri.file(path_1.default.join(this.wsConfig.rootPath, project.rel_path, "src", "main.c"));
                    vscode.workspace.openTextDocument(filePath).then(document => vscode.window.showTextDocument(document));
                    filePath = vscode.Uri.file(path_1.default.join(this.wsConfig.rootPath, project.rel_path, "src", "main.cpp"));
                    vscode.workspace.openTextDocument(filePath).then(document => vscode.window.showTextDocument(document));
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build, message.value.runner);
                    break;
                }
                case "openCmakeFile": {
                    let project = this.wsConfig.projects[message.value.project];
                    let filePath = vscode.Uri.file(path_1.default.join(this.wsConfig.rootPath, project.rel_path, "CMakeLists.txt"));
                    vscode.workspace.openTextDocument(filePath).then(document => vscode.window.showTextDocument(document));
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build, message.value.runner);
                    break;
                }
                case "modifyBuildArgs": {
                    (0, project_1.modifyBuildArguments)(this.context, this.wsConfig, message.value.project, message.value.build).finally(() => { vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                    (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build, message.value.runner);
                }
                case "addFile": {
                    switch (message.value.cmd) {
                        case "addOverlayFile": {
                            (0, project_1.addConfigFiles)(this.context, this.wsConfig, false, !message.value.build, message.value.project, message.value.build).finally(() => { vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                            break;
                        }
                        case "addKConfigFile": {
                            (0, project_1.addConfigFiles)(this.context, this.wsConfig, true, !message.value.build, message.value.project, message.value.build).finally(() => { vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                            break;
                        }
                    }
                    break;
                }
                case "deleteFile": {
                    switch (message.value.cmd) {
                        case "removeOverlayFile": {
                            (0, project_1.removeConfigFile)(this.context, this.wsConfig, false, !message.value.build, message.value.project, !message.value.isExtra, [message.value.filename], message.value.build).finally(() => { vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                            break;
                        }
                        case "removeKConfigFile": {
                            (0, project_1.removeConfigFile)(this.context, this.wsConfig, true, !message.value.build, message.value.project, !message.value.isExtra, [message.value.filename], message.value.build).finally(() => { vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                            break;
                        }
                    }
                    break;
                }
                default:
                    console.log("unknown command");
                    console.log(message);
            }
        });
        this.setHtml("");
        vscode.commands.executeCommand("zephyr-ide.update-web-view");
    }
}
exports.ProjectConfigView = ProjectConfigView;
//# sourceMappingURL=ProjectConfigView.js.map
