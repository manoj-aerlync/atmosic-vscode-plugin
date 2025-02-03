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
exports.ProjectTreeView = void 0;
const vscode = __importStar(require("vscode"));
const path_1 = __importDefault(require("path"));
const project_1 = require("../../project_utilities/project");
const getNonce_1 = require("../../utilities/getNonce");
const build_1 = require("../../zephyr_utilities/build");
const flash_1 = require("../../zephyr_utilities/flash");
class ProjectTreeView {
    extensionPath;
    context;
    wsConfig;
    view;
    needToClearHtml = false;
    treeData = [];
    path_icons = {
        branch: 'folder-library',
        leaf: 'folder-library',
        open: 'folder-library',
    };
    projectActions = [
        {
            icon: "add",
            actionId: "addBuild",
            tooltip: "Add Build",
        }, {
            icon: "trash",
            actionId: "deleteProject",
            tooltip: "Delete Project",
        },
    ];
    buildActions = [
        {
            icon: "play",
            actionId: "build",
            tooltip: "Build",
        }, {
            icon: "debug-rerun",
            actionId: "buildPristine",
            tooltip: "Build Pristine",
        }, {
            icon: "settings-gear",
            actionId: "menuConfig",
            tooltip: "Menu Config",
        }, {
            icon: "add",
            actionId: "addRunner",
            tooltip: "Add Runner",
        }, {
            icon: "trash",
            actionId: "deleteBuild",
            tooltip: "Delete Build",
        },
    ];
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
    runnerActions = [
        {
            icon: "arrow-circle-up",
            actionId: "flash",
            tooltip: "Flash",
        }, {
            icon: "trash",
            actionId: "deleteRunner",
            tooltip: "Delete Runner",
        },
    ];
    constructor(extensionPath, context, wsConfig) {
        this.extensionPath = extensionPath;
        this.context = context;
        this.wsConfig = wsConfig;
    }
    generateRunnerString(projectName, buildName, runner) {
        if (this.wsConfig.projectStates[projectName].buildStates[buildName].runnerStates[runner.name] == undefined) {
            this.wsConfig.projectStates[projectName].buildStates[buildName].runnerStates[runner.name] = { viewOpen: true };
        }
        let viewOpen = this.wsConfig.projectStates[projectName].buildStates[buildName].runnerStates[runner.name].viewOpen;
        let entry = {
            icons: {
                branch: 'chip',
                leaf: 'chip',
                open: 'chip',
            },
            actions: this.runnerActions,
            label: runner.name,
            value: { project: projectName, build: buildName, runner: runner.name },
            open: viewOpen !== undefined ? viewOpen : true,
            subItems: []
        };
        return entry;
    }
    generateBuildString(projectName, build) {
        let viewOpen = this.wsConfig.projectStates[projectName].buildStates[build.name].viewOpen;
        let buildData = {};
        buildData['icons'] = {
            branch: 'project',
            leaf: 'project',
            open: 'project',
        };
        buildData['actions'] = this.buildActions;
        buildData['label'] = build.name;
        buildData['value'] = { project: projectName, build: build.name };
        buildData['open'] = viewOpen !== undefined ? viewOpen : true;
        buildData['description'] = build.board;
        buildData['subItems'] = [];
        let runnerNames = [];
        //Add runners
        for (let key in build.runnerConfigs) {
            runnerNames.push(key);
            buildData.subItems.push(this.generateRunnerString(projectName, build.name, build.runnerConfigs[key]));
        }
        // If no runners then add Add Runner command
        if (buildData.subItems.length === 0) {
            buildData.subItems.push({
                icons: {
                    branch: 'add',
                    leaf: 'add',
                    open: 'add',
                },
                label: 'Add Runner',
                value: { cmd: "addRunner", project: projectName, build: build.name },
                description: 'Add Runner',
            });
        }
        return buildData;
    }
    generateProjectString(project) {
        let viewOpen = this.wsConfig.projectStates[project.name].viewOpen;
        let projectData = {};
        projectData['icons'] = {
            branch: 'folder',
            leaf: 'file',
            open: 'folder-opened',
        };
        projectData['actions'] = this.projectActions;
        projectData['label'] = project.name;
        projectData['value'] = { project: project.name };
        projectData['subItems'] = [];
        projectData['open'] = viewOpen !== undefined ? viewOpen : true;
        let buildNames = [];
        for (let key in project.buildConfigs) {
            buildNames.push(key);
            projectData.subItems.push(this.generateBuildString(project.name, project.buildConfigs[key]));
        }
        if (projectData.subItems.length === 0) {
            projectData.subItems.push({
                icons: {
                    branch: 'add',
                    leaf: 'add',
                    open: 'add',
                },
                label: 'Add Build',
                value: { cmd: "addBuild", project: project.name },
                description: 'Add Build',
            });
        }
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
        let projectNames = [];
        this.treeData = [];
        for (let key in wsConfig.projects) {
            projectNames.push(key);
            this.treeData.push(this.generateProjectString(wsConfig.projects[key]));
        }
        if (this.view) {
            this.view.webview.postMessage(this.treeData);
        }
    }
    saveTreeDataOpenState() {
        try {
            this.treeData.forEach((element) => {
                if (element.label in this.wsConfig.projects) {
                    this.wsConfig.projectStates[element.label].viewOpen = element.open;
                    element.subItems.forEach((build_element) => {
                        if (build_element.label in this.wsConfig.projects[element.label].buildConfigs) {
                            this.wsConfig.projectStates[element.label].buildStates[build_element.label].viewOpen = build_element.open;
                        }
                    });
                }
            });
        }
        catch (e) {
            console.log(e.Message);
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
      <script nonce="${nonce}" src="${assetUri('src/panels/project_tree_view/ProjectTreeViewHandler.js')}"  type="module"></script>
    </head>
    <body>
    <vscode-tree id="project-tree" indent-guides arrows></vscode-tree>
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
                this.saveTreeDataOpenState();
            }
            switch (message.command) {
                case "deleteProject": {
                    (0, project_1.removeProject)(this.context, this.wsConfig, message.value.project).finally(() => { vscode.commands.executeCommand("zephyr-ide.update-web-view"); });
                    break;
                }
                case "addBuild": {
                    (0, project_1.addBuildToProject)(this.wsConfig, this.context, message.value.project).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project); });
                    break;
                }
                case "deleteBuild": {
                    (0, project_1.removeBuild)(this.context, this.wsConfig, message.value.project, message.value.build).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project); });
                    break;
                }
                case "addRunner": {
                    (0, project_1.addRunnerToBuild)(this.wsConfig, this.context, message.value.project, message.value.build).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build); });
                    break;
                }
                case "deleteRunner": {
                    (0, project_1.removeRunner)(this.context, this.wsConfig, message.value.project, message.value.build, message.value.runner).finally(() => { (0, project_1.setActive)(this.wsConfig, message.value.project, message.value.build); });
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
                default:
                    console.log("unknown command");
                    console.log(message);
            }
        });
        this.setHtml("");
    }
}
exports.ProjectTreeView = ProjectTreeView;
//# sourceMappingURL=ProjectTreeView.js.map