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
exports.twisterSelector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const multistepQuickPick_1 = require("../utilities/multistepQuickPick");
const build_selector_1 = require("./build_selector");
//export type BuildStateDictionary = { [name: string]: BuildState };
async function twisterSelector(projectFolder, context, setupState, rootPath) {
    const title = 'Add Twister Configuration';
    let twisterConfig = {};
    //check if project contain sample.yaml or testcase.yaml
    let projectPath = path.join(rootPath, projectFolder);
    let sampleFile = path.join(projectPath, "sample.yaml");
    let testCaseFile = path.join(projectPath, "testcase.yaml");
    if (!fs.pathExistsSync(sampleFile) && !fs.pathExistsSync(testCaseFile)) {
        vscode.window.showInformationMessage(`Project Directory does not contain either a sample.yaml or testcase.yaml file`);
    }
    //ask if you want native_sim qemu or hardware
    let platfroms = ["native_sim", "qemu"];
    const platformsQpItems = platfroms.map(label => ({ label }));
    platformsQpItems.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
    let boardlistQpItems = [];
    let boardlist = await (0, build_selector_1.getBoardlistWest)(setupState, undefined);
    if (boardlist) {
        boardlistQpItems = boardlist.map(x => ({ label: x.name }));
    }
    platformsQpItems.push(...boardlistQpItems);
    function shouldResume() {
        // Could show a notification with the option to resume.
        return new Promise((resolve, reject) => {
            reject();
        });
    }
    async function validate(name) {
        return undefined;
    }
    const platformPick = await (0, multistepQuickPick_1.showQuickPick)({
        title,
        step: 1,
        totalSteps: 4,
        placeholder: 'Select Platform',
        ignoreFocusOut: true,
        items: platformsQpItems,
        activeItem: undefined,
        shouldResume: shouldResume,
    }).catch((error) => {
        console.error(error);
        return undefined;
    });
    if (platformPick) {
        twisterConfig.platform = platformPick[0].label;
        if (!platfroms.includes(twisterConfig.platform)) {
            const comPortPick = await (0, multistepQuickPick_1.showInputBox)({
                title,
                step: 2,
                totalSteps: 4,
                prompt: "Input a COM Port",
                value: "",
                validate: validate,
                placeholder: "COM1",
                shouldResume
            });
            twisterConfig.serialPort = comPortPick;
            const comPortBaudPick = await (0, multistepQuickPick_1.showInputBox)({
                title,
                step: 3,
                totalSteps: 4,
                prompt: "Input a COM Port Baudrate",
                value: "",
                validate: validate,
                placeholder: "115200",
                shouldResume
            });
            twisterConfig.serialBaud = comPortBaudPick;
        }
    }
    return twisterConfig;
}
exports.twisterSelector = twisterSelector;
//# sourceMappingURL=twister_selector.js.map