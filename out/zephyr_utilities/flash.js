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
exports.flash = exports.flashActive = exports.flashByName = void 0;
const vscode = __importStar(require("vscode"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utilities/utils");
async function flashByName(wsConfig, projectName, buildName, runnerName) {
    let project = wsConfig.projects[projectName];
    let buildConfig = project.buildConfigs[buildName];
    let runnerConfig = buildConfig.runnerConfigs[runnerName];
    if (project && buildConfig && runnerConfig) {
        await flash(wsConfig, project, buildConfig, runnerConfig);
    }
    else {
        vscode.window.showErrorMessage("Invalid project or build");
    }
}
exports.flashByName = flashByName;
async function flashActive(wsConfig) {
    if (wsConfig.activeProject === undefined) {
        vscode.window.showErrorMessage("Select a project before trying to flash");
        return;
    }
    let projectName = wsConfig.activeProject;
    let project = wsConfig.projects[projectName];
    let activeBuildConfig = wsConfig.projectStates[wsConfig.activeProject].activeBuildConfig;
    if (activeBuildConfig === undefined) {
        vscode.window.showErrorMessage("Select a build before trying to flash");
        return;
    }
    let build = project.buildConfigs[activeBuildConfig];
    let activeRunnerConfig = wsConfig.projectStates[wsConfig.activeProject].buildStates[activeBuildConfig].activeRunner;
    if (activeRunnerConfig === undefined) {
        vscode.window.showErrorMessage("Select a runner before trying to flash");
        return;
    }
    let runner = build.runnerConfigs[activeRunnerConfig];
    flash(wsConfig, project, build, runner);
}
exports.flashActive = flashActive;
async function flash(wsConfig, project, build, runner) {
    //let cmds = await vscode.commands.getCommands();
    //const subArr = cmds.filter(str => str.includes("debug"));
    // Tasks
	let cmd;

    if (runner.runner === "sysbuild") {
	    vscode.window.showErrorMessage("flash");
    cmd = ` west flash -d build --verify --device=${runner.args} --jlink`;
    }

    if (runner.runner === "non-sysbuild") {
	    vscode.window.showErrorMessage("flash mcu");
	cmd = `west flash --verify --device=${runner.args} -d build/${build.board.split('/')[0]}/bootloader/mcuboot/boot/zephyr --noreset --jlink && west flash --verify --device=${runner.args} -d build/${build.board.split('/')[0]}_ns/${project.rel_path} --jlink `;
    }
    
    if (runner.runner === "non-mcuboot") {
	    vscode.window.showErrorMessage("flash non-mcu");
	cmd = `west flash --verify --device=${runner.args} -d build/${build.board.split('/')[0]}/openair/samples/spe --noreset --jlink && west flash --verify --device=${runner.args} -d build/${build.board.split('/')[0]}_ns/${project.rel_path} --jlink `;
    }
    if (runner.runner === "non-spe") {
	    vscode.window.showErrorMessage("flash non-spe");
	cmd = `west flash --verify --device=${runner.args} -d build/${build.board.split('/')[0]}_ns/${project.rel_path} --jlink `;
    }

    let taskName = "Zephyr IDE Flash: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Flashing for ${build.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
}
exports.flash = flash;
//# sourceMappingURL=flash.js.map
