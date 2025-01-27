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
exports.runnerSelector = void 0;
const multistepQuickPick_1 = require("../utilities/multistepQuickPick");
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
async function runnerSelector(boardfolder) {
    const title = 'Add Runner';
    let runners = ["sysbuild", "non-sysbuild", "non-mcuboot", "non-spe"];
    let boardcmakePath = path_1.default.join(boardfolder, 'board.cmake');
    if (fs.existsSync(boardcmakePath)) {
        const boardCMakeFile = fs.readFileSync(boardcmakePath, 'utf8');
        boardCMakeFile.split(/\r?\n/).forEach(line => {
            if (line.includes("include(${ZEPHYR_BASE}/boards/common/") && line.includes(".board.cmake)")) {
                runners.push(line.replace('include(${ZEPHYR_BASE}/boards/common/', '').replace(".board.cmake)", '').replace(/\s/g, ''));
            }
        });
    }
    async function pickRunner(input, state) {
        // Get runners
        const runnersQpItems = runners.map(label => ({ label }));
        const pickPromise = input.showQuickPick({
            title,
            step: 1,
            totalSteps: 3,
            placeholder: 'Pick Runner',
            items: runnersQpItems,
            ignoreFocusOut: true,
            activeItem: typeof state.runner !== 'string' ? state.runner : undefined,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        let pick = await pickPromise;
        if (!pick) {
            return;
        }
        state.runner = pick.label;
        if (state.runner === undefined) {
            return;
        }
        return (input) => inputRunnerName(input, state);
    }
    async function inputRunnerName(input, state) {
        if (state.runner === undefined) {
            return;
        }
        let inputNamePromise = input.showInputBox({
            title,
            step: 2,
            totalSteps: 3,
            value: state.runner,
            ignoreFocusOut: true,
            prompt: 'Choose a name for this Runner Configuration',
            validate: validate,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        state.name = await inputNamePromise;
        if (state.name === undefined) {
            return;
        }
        return (input) => addRunnerArguments(input, state);
    }
    async function addRunnerArguments(input, state) {
        if (state.name === undefined) {
            return;
        }
        let inputPromise = input.showInputBox({
            title,
            step: 3,
            totalSteps: 3,
            value: "",
            prompt: 'Add Runner Arguments',
            ignoreFocusOut: true,
            validate: validate,
            shouldResume: shouldResume
        }).catch((error) => {
            console.error(error);
            return undefined;
        });
        state.args = await inputPromise;
        if (state.args === undefined) {
            return;
        }
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
        await multistepQuickPick_1.MultiStepInput.run(input => pickRunner(input, state));
        return state;
    }
    const state = await collectInputs();
    return state;
}
exports.runnerSelector = runnerSelector;
//# sourceMappingURL=runner_selector.js.map
