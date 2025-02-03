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
exports.ActiveProjectView = void 0;
const vscode = __importStar(require("vscode"));
const path_1 = __importDefault(require("path"));
const getNonce_1 = require("../../utilities/getNonce");
const setup_1 = require("../../setup_utilities/setup");
class ActiveProjectView {
    extensionPath;
    context;
    wsConfig;
    view;
    launchActions = [
        {
            icon: "arrow-swap",
            actionId: "changeLaunchTarget",
            tooltip: "Change Launch Target",
        },
    ];
    buildActions = [
        {
            icon: "settings-gear",
            actionId: "startMenuConfig",
            tooltip: "MenuConfig",
        },
    ];
    constructor(extensionPath, context, wsConfig) {
        this.extensionPath = extensionPath;
        this.context = context;
        this.wsConfig = wsConfig;
    }
    updateWebView(wsConfig) {
        if (this.view) {
            let activeProject;
            let activeBuild;
            let activeRunner;
            if (wsConfig.activeProject !== undefined) {
                activeProject = wsConfig.projects[wsConfig.activeProject];
                activeBuild = (0, setup_1.getActiveBuildConfigOfProject)(wsConfig, wsConfig.activeProject);
                if (activeBuild !== undefined) {
                    activeRunner = (0, setup_1.getActiveRunnerConfigOfBuild)(wsConfig, wsConfig.activeProject, activeBuild.name);
                    this.view.title = activeProject.name + ": " + activeBuild.name;
                }
                else {
                    this.view.title = activeProject.name;
                }
            }
            else {
                this.view.title = "Active Project: None";
                this.view.webview.postMessage([{}]);
                return;
            }
            let data = [{
                    icons: {
                        leaf: 'project',
                    },
                    actions: this.buildActions,
                    label: "Build with Sysbuild",
                    description: activeBuild ? activeBuild.name : "Not Available",
                    value: { command: "vsCommand", vsCommand: "atmosic-ide.build-pristine" },
                }, {
                    icons: {
                        leaf: 'project',
                    },
		    actions: this.buildActions,
                    label: "Build without sysbuild",
                    description: activeBuild ? activeBuild.name : "Not Available",
                    value: { command: "vsCommand", vsCommand: "atmosic-ide.buildNonSys" },
                },{
                    icons: {
                        leaf: 'project',
                    },
                    actions: this.buildActions,
                    label: "Build SPE-NSPE Merge",
                    description: activeBuild ? activeBuild.name : "Not Available",
                    value: { command: "vsCommand", vsCommand: "atmosic-ide.buildNonSpeMcu" },
                },{
                    icons: {
                        leaf: 'project',
                    },
                    actions: this.buildActions,
                    label: "Build without MCUBOOT",
                    description: activeBuild ? activeBuild.name : "Not Available",
                    value: { command: "vsCommand", vsCommand: "atmosic-ide.buildNonMcu" },
                },{
                    icons: {
                        leaf: 'project',
                    },
                    actions: this.buildActions,
                    label: "West Debug",
                    description: activeBuild ? activeBuild.name : "Not Available",
                    value: { command: "vsCommand", vsCommand: "atmosic-ide.westDebug" },
                },{
                    icons: {
                        leaf: 'chip',
                    },
                    label: "Flash",
                    description: activeRunner ? activeRunner.name : "Not Available",
                    value: { command: "vsCommand", vsCommand: "atmosic-ide.flash" },
                }
                ];
            this.view.webview.postMessage(data);
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
      <script nonce="${nonce}" src="${assetUri('src/panels/active_project_view/ActiveProjectViewHandler.js')}"  type="module"></script>
    </head>
    <body>
    <vscode-tree id="basic-example" ></vscode-tree>
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
            switch (message.command) {
                case "vsCommand": {
                    vscode.commands.executeCommand(message.value.vsCommand);
                    break;
                }
                case "changeLaunchTarget": {
                    vscode.commands.executeCommand(message.value.launchChangeCmd);
                    break;
                }
                case "startMenuConfig": {
                    vscode.commands.executeCommand("atmosic-ide.start-menu-config");
                    break;
                }
                default:
                    console.log("unknown command");
                    console.log(message);
            }
        });
        this.setHtml("");
        this.updateWebView(this.wsConfig);
    }
}
exports.ActiveProjectView = ActiveProjectView;
//# sourceMappingURL=ActiveProjectView.js.map
