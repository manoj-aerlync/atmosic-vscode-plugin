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
exports.westSelector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const multistepQuickPick_1 = require("../utilities/multistepQuickPick");
const yaml = __importStar(require("js-yaml"));
const defines_1 = require("../defines");
async function westSelector(context, wsConfig) {
    const title = 'Initialize West';
    async function getAdditionalArguments(input, state) {
        async function validateArgs(name) {
            return undefined;
        }
        state.additionalArgs = await input.showQuickPick({
            title,
            step: 3,
            totalSteps: 3,
            ignoreFocusOut: true,
            placeholder: "--mr main",
            items: [
            { label: "rc/25.01.0" },
            { label: "rc/24.11.0" },
            { label: "Other" }
	    ],
        canPickMany: false,
	validate: (selection) => {
            return undefined;
        },
		/*value: "",*/
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return "";
        });
	     if (state.additionalArgs) {
        if (state.additionalArgs.label === "Other") {
            const customInput = await input.showInputBox({
                title: 'Enter custom value',
                step: 3,
                totalSteps: 3,
                ignoreFocusOut: true,
                placeholder: "e.g. rc_24.07.0",
                validate: (input) => {
                    return undefined;
                },
                shouldResume: shouldResume
            }).catch((error) => {
                console.error(error);
                return "";
            });
            if (customInput) {
                state.additionalArgs = `--mr ${customInput}`;
            } else {
                state.additionalArgs = '--mr';
            }
        } else {
            state.additionalArgs = `--mr ${state.additionalArgs.label}`;
        }
    } else {
        state.additionalArgs = '--mr';
    }

    }
    async function pickWestYml(input, state) {
        // Looks for board directories
        let westOptions = {};
        westOptions["From Atmosic Repo"] = "";
        westOptions["From Git Repo"] = "";
        westOptions["Select west.yml in Workspace"] = "";
        const westOptionQpItems = [];
        for (let key in westOptions) {
            westOptionQpItems.push({ label: key });
        }
        const pickPromise = await input.showQuickPick({
            title,
            step: 1,
            totalSteps: 3,
            placeholder: 'Select west.yml',
            ignoreFocusOut: true,
            items: westOptionQpItems,
            activeItem: typeof state.path !== 'string' ? state.path : undefined,
            shouldResume: shouldResume,
        }).catch((error) => {
            return;
        });
        let pick = await pickPromise;
        if (!pick) {
            state.failed = true;
            return;
        }
        let copyTemplate = false;
        let westFile;
        if (pick.label === "From Git Repo") {
            async function validateGitRepoString(name) {
                return undefined;
            }
            state.gitRepo = await input.showInputBox({
                title,
                step: 2,
                totalSteps: 3,
                ignoreFocusOut: true,
                placeholder: "https://github.com/zephyrproject-rtos/example-application",
                value: "",
                prompt: 'Specify a git repository to clone from',
                validate: validateGitRepoString,
                shouldResume: shouldResume
            }).catch((error) => {
                console.error(error);
                return undefined;
            });
            if (state.gitRepo && state.gitRepo !== "") {
                await getAdditionalArguments(input, state);
                state.failed = false;
            }
            else {
                state.failed = true;
            }
            return;
        }
        else if (pick.label === "Select west.yml in Workspace") {
            let browsedWestFile = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'west.yml': ['yml']
                },
            });
            if (browsedWestFile !== undefined) {
                westFile = path.dirname(browsedWestFile[0].fsPath);
            }
            else {
                state.failed = true;
                return;
            }
        }
        else if (pick.label === "From Atmosic Repo") {
            async function validateGitRepoString(name) {
                return undefined;
            }
            state.gitRepo = await input.showInputBox({
                title,
                step: 2,
                totalSteps: 3,
                ignoreFocusOut: true,
                placeholder: "https://github.com/Atmosic/openair.git",
                value: "https://github.com/Atmosic/openair.git",
                prompt: 'Specify the atmosic git repository',
                validate: validateGitRepoString,
                shouldResume: shouldResume
            }).catch((error) => {
                console.error(error);
                return undefined;
            });
            if (state.gitRepo && state.gitRepo !== "") {
                await getAdditionalArguments(input, state);
                state.failed = false;
            }
            else {
                state.failed = true;
            }
            return;
        }
        else {
            westFile = westOptions[pick.label];
            copyTemplate = true;
        }
        if (westFile === undefined || pick.label === undefined) {
            await vscode.window.showInformationMessage(`Failed to select west.yml file`);
            state.failed = true;
            return;
        }
        if (copyTemplate) {
            let desiredHals;
            if (westFile === "minimal_west.yml" || westFile === "minimal_ble_west.yml") {
                const pickPromise = await (0, multistepQuickPick_1.showQuickPick)({
                    title,
                    step: 2,
                    totalSteps: 3,
                    ignoreFocusOut: true,
                    placeholder: "",
                    items: defines_1.zephyrHals,
                    shouldResume: shouldResume,
                    canSelectMany: true,
                }).catch((error) => {
                    return;
                });
                desiredHals = pickPromise;
            }
            const extensionPath = context.extensionPath;
            let srcPath = path.join(extensionPath, "west_templates", westFile);
            let westDirPath = "";
            if (wsConfig.activeSetupState) {
                westDirPath = path.join(wsConfig.activeSetupState.setupPath, "west-manifest");
            }
            let desPath = path.join(westDirPath, "west.yml");
            let exists = await fs.pathExists(westDirPath);
            if (!exists) {
                await fs.mkdirp(westDirPath);
            }
            let res = await fs.copyFile(srcPath, desPath, fs.constants.COPYFILE_FICLONE);
            let doc = yaml.load(fs.readFileSync(desPath, 'utf-8'));
            let isNcsProject = false;
            for (let i = 0; i < doc.manifest.projects.length; i++) {
                if (doc.manifest.projects[i].name === "sdk-nrf") {
                    isNcsProject = true;
                }
            }
            let versionList = defines_1.zephyrVersions;
            let versionSelectionString = "Select Zephyr Version";
            if (isNcsProject) {
                versionList = defines_1.ncsVersions;
                versionSelectionString = "Select NCS Version";
            }
            const versionQP = [];
            versionQP.push({ label: "Default" });
            versionQP.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
            for (let key in versionList) {
                versionQP.push({ label: versionList[key] });
            }
            const pickPromise = await input.showQuickPick({
                title,
                step: 3,
                totalSteps: 3,
                ignoreFocusOut: true,
                placeholder: versionSelectionString,
                items: versionQP,
                activeItem: typeof state.path !== 'string' ? state.path : undefined,
                shouldResume: shouldResume,
            }).catch((error) => {
                return;
            });
            let pick = await pickPromise;
            if (!pick) {
                state.failed = true;
                return;
            }
            if (pick.label === "Other Version") {
                async function validate(name) {
                    return undefined;
                }
                const inputPromise = input.showInputBox({
                    title,
                    step: 3,
                    totalSteps: 4,
                    ignoreFocusOut: true,
                    value: "Default",
                    prompt: 'Input a Version Number (i.e vX.X.X) or branch name (i.e main)',
                    validate: validate,
                    shouldResume: shouldResume
                }).catch((error) => {
                    console.error(error);
                    return undefined;
                });
                let version = await inputPromise;
                if (!version) {
                    return;
                }
                ;
                pick.label = version;
            }
            if (pick.label === "Default") {
                pick.label = versionList[0];
            }
            for (let i = 0; i < doc.manifest.projects.length; i++) {
                if ((isNcsProject && doc.manifest.projects[i].name === "sdk-nrf") || !isNcsProject && doc.manifest.projects[i].name === "zephyr") {
                    doc.manifest.projects[i].revision = pick.label;
                }
            }
            if (desiredHals) {
                desiredHals.forEach(e => {
                    doc.manifest.projects[0].import["name-allowlist"].push(e.description);
                });
            }
            fs.writeFileSync(desPath, yaml.dump(doc));
            state.failed = false;
            state.path = westDirPath;
        }
        else {
            state.failed = false;
            state.path = westFile.toString();
        }
        await getAdditionalArguments(input, state);
        return;
    }
    function shouldResume() {
        // Could show a notification with the option to resume.
        return new Promise((resolve, reject) => {
            reject();
        });
    }
    async function collectInputs() {
        const state = {};
        await multistepQuickPick_1.MultiStepInput.run(input => pickWestYml(input, state));
        return state;
    }
    const state = await collectInputs();
    return state;
}
exports.westSelector = westSelector;
//# sourceMappingURL=west_selector.js.map
