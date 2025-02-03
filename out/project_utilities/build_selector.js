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
exports.buildSelector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const multistepQuickPick_1 = require("../utilities/multistepQuickPick");
const utils_1 = require("../utilities/utils");
async function buildSelector(context, setupState, rootPath) {
    const title = 'Add Build Configuration';
    async function pickBoardDir(input, state) {
        // Looks for board directories
        let boardDirectories = [];
        // Look in root
        let boardDir = path.join(rootPath, `boards`);
        if (fs.pathExistsSync(boardDir)) {
            boardDirectories = boardDirectories.concat(boardDir);
        }
        let zephyrBoardDir;
        if (setupState.zephyrDir) {
            zephyrBoardDir = path.join(setupState.zephyrDir, `boards`);
            boardDirectories.push('Zephyr Directory Only');
        }
        console.log("Boards dir: " + boardDirectories);
        boardDirectories.push("Select Other Folder");
        const boardDirectoriesQpItems = boardDirectories.map(label => ({ label }));
        const pickPromise = input.showQuickPick({
            title,
            step: 1,
            totalSteps: 4,
            placeholder: 'Pick Additional Board Directory',
            ignoreFocusOut: true,
            items: boardDirectoriesQpItems,
            activeItem: typeof state.relBoardDir !== 'string' ? state.relBoardDir : undefined,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        let pick = await pickPromise;
        if (!pick) {
            return;
        }
        ;
        state.relBoardDir = path.relative(rootPath, pick.label);
        if (pick.label === "Select Other Folder") {
            const boarddir = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
            });
            if (boarddir) {
                state.relBoardDir = path.relative(rootPath, boarddir[0].fsPath);
            }
            else {
                vscode.window.showInformationMessage(`Failed to select board directory`);
                return;
            }
        }
        else if (pick.label === 'Zephyr Directory Only') {
            state.relBoardDir = undefined;
        }
        return (input) => inputBoardName(input, state);
    }
    async function inputBoardName(input, state) {
        let boards = [];
        //console.log("Changing board dir to " + state.relBoardDir);
        let boardList;
        if (state.relBoardDir) {
            boardList = await getBoardlistWest(vscode.Uri.file(path.join(rootPath, state.relBoardDir)));
        }
        else {
            boardList = await getBoardlistWest(undefined);
        }
        if (!boardList) {
            return;
        }
        boards = boards.concat(boardList);
        const boardQpItems = boards.map(x => ({ label: x.name, description: x.subdir }));
        const pickPromise = input.showQuickPick({
            title,
            step: 2,
            totalSteps: 4,
            placeholder: 'Pick Board',
            ignoreFocusOut: true,
            items: boardQpItems,
            activeItem: typeof state.relBoardDir !== 'string' ? state.relBoardDir : undefined,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        let pick = await pickPromise;
        if (!pick) {
            return;
        }
        ;
        state.board = pick.label;
        if (pick.description) {
            if (state.relBoardDir) {
                state.relBoardSubDir = path.relative(path.join(rootPath, state.relBoardDir), pick.description);
            }
            else {
                state.relBoardSubDir = path.relative(path.join(setupState.zephyrDir, "boards"), pick.description);
            }
        }
        return (input) => inputBuildName(input, state);
    }
    async function getBoardlistWest(folder) {
        let boardRootString = "";
        if (folder) {
            boardRootString = " --board-root " + path.dirname(folder.fsPath);
        }
        let prevError;
        let res = await (0, utils_1.executeShellCommand)("west boards -f '{name}:{qualifiers}:{dir}'" + boardRootString, setupState.setupPath, (0, utils_1.getShellEnvironment)(setupState), false);
        if (!res.stdout) {
            prevError = res.stderr;
            res = await (0, utils_1.executeShellCommand)("west boards -f '{name}:{name}:{dir}'" + boardRootString, setupState.setupPath, (0, utils_1.getShellEnvironment)(setupState), false);
        }
        if (!res.stdout) {
            utils_1.output.append(prevError);
            utils_1.output.append(res.stderr);
            vscode.window.showErrorMessage("Failed to run west boards command. See Zephyr IDE Output for error message");
            return;
        }
        let allBoardData = res.stdout.split(/\r?\n/);
        let outputData = [];
        for (let i = 0; i < allBoardData.length; i++) {
            let arr = allBoardData[i].replaceAll("'", "").split(":");
            let boardData = arr.splice(0, 2);
            boardData.push(arr.join(':'));
            let qualifiers = boardData[1].split(",");
            if (qualifiers.length > 1) {
                for (let j = 0; j < qualifiers.length; j++) {
                    outputData.push({ name: boardData[0] + "/" + qualifiers[j], subdir: boardData[2] });
                }
            }
            else {
                if (boardData.length > 2) {
                    outputData.push({ name: boardData[0], subdir: boardData[2] });
                }
            }
        }
        return outputData;
    }
    async function inputBuildName(input, state) {
        if (state.board === undefined) {
            return;
        }
        const inputPromise = input.showInputBox({
            title,
            step: 3,
            totalSteps: 4,
            ignoreFocusOut: true,
            value: path.join("build", state.board),
            prompt: 'Choose a name for the Build',
            validate: validate,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        let name = await inputPromise;
        if (!name) {
            return;
        }
        ;
        state.name = name;
        return (input) => setBuildOptimization(input, state);
    }
    async function setBuildOptimization(input, state) {
        const buildOptimizations = ["Debug", "Speed", "Size", "No Optimizations", "Don't set. Will be configured in included KConfig file"];
        const buildOptimizationsQpItems = buildOptimizations.map(label => ({ label }));
        const pickPromise = input.showQuickPick({
            title,
            step: 4,
            totalSteps: 4,
            placeholder: 'Select Build Optimization',
            ignoreFocusOut: true,
            items: buildOptimizationsQpItems,
            activeItem: typeof state.debugOptimization !== 'string' ? state.debugOptimization : undefined,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        let pick = await pickPromise;
        if (!pick) {
            return;
        }
        ;
        let debugOptimization = pick.label;
        const westArgsInputPromise = input.showInputBox({
            title,
            step: 5,
            totalSteps: 6,
            ignoreFocusOut: true,
            value: "",
            prompt: 'Additional Build Arguments',
            placeholder: '--sysbuild',
            validate: validate,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        let westBuildArgs = await westArgsInputPromise;
        if (westBuildArgs === undefined) {
            return;
        }
        ;
        state.westBuildArgs = westBuildArgs;
        let cmakeArg = "";
        switch (debugOptimization) {
            case "Debug":
                cmakeArg = ` -DCONFIG_DEBUG_OPTIMIZATIONS=y -DCONFIG_DEBUG_THREAD_INFO=y `;
                break;
            case "Speed":
                cmakeArg = ` -DCONFIG_SPEED_OPTIMIZATIONS=y `;
                break;
            case "Size":
                cmakeArg = ` -DCONFIG_SIZE_OPTIMIZATIONS=y `;
                break;
            case "No Optimizations":
                cmakeArg = ` -DCONFIG_NO_OPTIMIZATIONS=y`;
                break;
            default:
                break;
        }
        const cmakeArgsInputPromise = input.showInputBox({
            title,
            step: 6,
            totalSteps: 6,
            ignoreFocusOut: true,
            value: cmakeArg,
            prompt: 'Modify CMake Arguments',
            validate: validate,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        let cmakeBuildArgs = await cmakeArgsInputPromise;
        if (cmakeBuildArgs === undefined) {
            return;
        }
        ;
        state.westBuildCMakeArgs = cmakeBuildArgs;
        state.confFiles = {
            config: [],
            extraConfig: [],
            overlay: [],
            extraOverlay: []
        };
        return;
    }
    async function validate(name) {
        return undefined;
    }
    function shouldResume() {
        // Could show a notification with the option to resume.
        return new Promise((resolve, reject) => {
            reject();
        });
    }
    async function collectInputs() {
        const state = {};
        await multistepQuickPick_1.MultiStepInput.run(input => pickBoardDir(input, state));
        return state;
    }
    const state = await collectInputs();
    return state;
}
exports.buildSelector = buildSelector;
//# sourceMappingURL=build_selector.js.map