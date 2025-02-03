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
exports.clean = exports.runDtshShell = exports.buildRamRomReport = exports.buildMenuConfig = exports.buildNonSys = exports.build = exports.buildByName = exports.buildHelper = exports.regenerateCompileCommands = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const utils_1 = require("../utilities/utils");
const setup_1 = require("../setup_utilities/setup");
const project_1 = require("../project_utilities/project");
async function regenerateCompileCommands(wsConfig) {
    let compileCommandData = [];
    for (let projectName in wsConfig.projects) {
        let project = wsConfig.projects[projectName];
        for (let buildName in project.buildConfigs) {
            let build = project.buildConfigs[buildName];
            let basepath = path.join(wsConfig.rootPath, project.rel_path, build.name);
            let basefile = path.join(basepath, "compile_commands.json");
            let extfile = path.join(basepath, project.name, "compile_commands.json");
            if (fs.existsSync(basefile)) {
                let rawdata = await fs.readFile(basefile, 'utf8');
                compileCommandData.push(...JSON.parse(rawdata));
            }
            else if (fs.existsSync(extfile)) {
                let rawdata = await fs.readFile(extfile, 'utf8');
                compileCommandData.push(...JSON.parse(rawdata));
            }
        }
    }
    let data = JSON.stringify(compileCommandData);
    fs.writeFile(path.join(wsConfig.rootPath, '.vscode', 'compile_commands.json'), data);
}
exports.regenerateCompileCommands = regenerateCompileCommands;
async function buildHelper(context, wsConfig, pristine) {
    if (wsConfig.activeSetupState === undefined) {
        return;
    }
    if (wsConfig.activeSetupState.westUpdated) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to build");
            return;
        }
        let project = wsConfig.projects[wsConfig.activeProject];
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await (0, project_1.addBuild)(wsConfig, context);
            buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
            if (buildName === undefined) {
                await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
                return;
            }
        }
        return await build(wsConfig, project, project.buildConfigs[buildName], pristine);
    }
    else {
        vscode.window.showErrorMessage("Run `Zephyr IDE: West Update` command first.");
    }
}
exports.buildHelper = buildHelper;
async function buildByName(wsConfig, pristine, projectName, buildName, isMenuConfig = false) {
   if (wsConfig.activeSetupState && wsConfig.activeSetupState.westUpdated) {
        let project = wsConfig.projects[projectName];
        let buildconfig = project.buildConfigs[buildName];
        if (project && buildconfig) {
            if (isMenuConfig) {
                buildMenuConfig(wsConfig, true, project, buildconfig);
            }
            else {
		build(wsConfig, project, buildconfig, pristine);
            }
        }
        else {
            vscode.window.showErrorMessage("Invalid project or build");
        }
    }
    else {
        vscode.window.showErrorMessage("Run `Zephyr IDE: West Update` command first.");
    }
}
exports.buildByName = buildByName;
async function build(wsConfig, project, build, pristine) {
    let primaryConfFiles = project.confFiles.config.concat(build.confFiles.config);
    primaryConfFiles = primaryConfFiles.map(x => (path.join(wsConfig.rootPath, x)));
    let secondaryConfFiles = project.confFiles.extraConfig.concat(build.confFiles.extraConfig);
    secondaryConfFiles = secondaryConfFiles.map(x => (path.join(wsConfig.rootPath, x)));
    let overlayFiles = project.confFiles.overlay.concat(build.confFiles.overlay);
    overlayFiles = overlayFiles.map(x => (path.join(wsConfig.rootPath, x)));
    let extraOverlayFiles = project.confFiles.extraOverlay.concat(build.confFiles.extraOverlay);
    extraOverlayFiles = extraOverlayFiles.map(x => (path.join(wsConfig.rootPath, x)));
    let extraWestBuildArgs = "";
    if (build.westBuildArgs !== undefined) {
        extraWestBuildArgs = build.westBuildArgs;
    }
    let extraWestBuildCMakeArgs = "";
    if (build.westBuildCMakeArgs !== undefined) {
        extraWestBuildCMakeArgs = build.westBuildCMakeArgs;
    }
    let projectFolder = path.join(wsConfig.rootPath, project.rel_path);
    let buildFolder = path.join(wsConfig.rootPath, project.rel_path, build.name);
    let cmd = `west build always ${extraWestBuildArgs} ${project.rel_path} -b ${build.board.split('/')[0]}@mcuboot//ns -T ${extraWestBuildCMakeArgs} `;
    let buildFsDir;
    if (fs.existsSync(buildFolder)) {
        buildFsDir = fs.readdirSync(buildFolder);
    }
    if (pristine || buildFsDir == undefined || buildFsDir.length == 0) {
        let boardRoot;
        if (build.relBoardDir) {
            boardRoot = path.dirname(path.join(wsConfig.rootPath, build.relBoardDir));
        }
        else if (wsConfig.activeSetupState) {
            boardRoot = wsConfig.activeSetupState?.zephyrDir;
        }
		    cmd = `west build -p always --sysbuild ${project.rel_path} -b ${build.board.split('/')[0]}@mcuboot//ns -T ${extraWestBuildCMakeArgs}`;
        
	if (primaryConfFiles.length) {
            let confFileString = "";
            primaryConfFiles.map(x => (confFileString = confFileString + x + ";"));
            cmd = cmd + ` -DCONF_FILE='${confFileString}' `;
        }
        if (secondaryConfFiles.length) {
            let confFileString = "";
            secondaryConfFiles.map(x => (confFileString = confFileString + x + ";"));
            cmd = cmd + ` -DEXTRA_CONF_FILE='${confFileString}' `;
        }
        if (overlayFiles.length) {
            let overlayFileString = "";
            overlayFiles.map(x => (overlayFileString = overlayFileString + x + ";"));
            cmd = cmd + ` -DDTC_OVERLAY_FILE='${overlayFileString}' `;
        }
        if (extraOverlayFiles.length) {
            let overlayFileString = "";
            extraOverlayFiles.map(x => (overlayFileString = overlayFileString + x + ";"));
            cmd = cmd + ` -DEXTRA_DTC_OVERLAY_FILE='${overlayFileString}' `;
        }
    }
    let taskName = "Zephyr IDE Build: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Building ${build.name} from project: ${project.name}`);
    let ret = await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
    regenerateCompileCommands(wsConfig);
    return ret;
}
exports.build = build;
async function buildNonSysBuild(wsConfig, isMenuConfig, project, build) {
    if (project === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to build");
            return;
        }
        project = wsConfig.projects[wsConfig.activeProject];
    }   
    if (build === undefined) {
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
            return;
        }       
        build = project.buildConfigs[buildName];
    }       
    let projectFolder = path.join(wsConfig.rootPath, project.rel_path);
    let buildFolder = path.join(wsConfig.rootPath, project.rel_path, build.name);
    let buildFsDir;
    if (fs.existsSync(buildFolder)) {
        buildFsDir = fs.readdirSync(buildFolder);
    }
	let cmd;

	if (build.board.startsWith("ATMEVK-3330")) {
		cmd = `west build -p -s bootloader/mcuboot/boot/zephyr -b ${build.board.split('/')[0]}@mcuboot -d build/${build.board.split('/')[0]}/bootloader/mcuboot/boot/zephyr -- \  -DCONFIG_BOOT_SIGNATURE_TYPE_ECDSA_P256=y \ -DCONFIG_BOOT_MAX_IMG_SECTORS=512 -DDTC_OVERLAY_FILE="$PWD/zephyr/boards/zephyr/atm33evk/${build.board.split('/')[0]}_mcuboot_bl.overlay" && west build -p -s openair/samples/spe -b ${build.board.split('/')[0]}@mcuboot -d build/${build.board.split('/')[0]}/openair/samples/spe -- -DCONFIG_BOOTLOADER_MCUBOOT=y -DCONFIG_MCUBOOT_GENERATE_UNSIGNED_IMAGE=n -DDTS_EXTRA_CPPFLAGS=-DATMWSTK=LL && west build -p -s ${project.rel_path}  -b ${build.board.split('/')[0]}@mcuboot//ns  -d build/${build.board.split('/')[0]}_ns/${project.rel_path}  -- -DCONFIG_BOOTLOADER_MCUBOOT=y -DCONFIG_MCUBOOT_SIGNATURE_KEY_FILE=\\"bootloader/mcuboot/root-ec-p256.pem\\" -DCONFIG_SPE_PATH=\\"$PWD/build/${build.board.split('/')[0]}/openair/samples/spe\\" `;
	}
	if (build.board.startsWith("ATMEVK-3430")) {
		cmd = `west build -p -s bootloader/mcuboot/boot/zephyr -b ${build.board.split('/')[0]}@mcuboot -d build/${build.board.split('/')[0]}/bootloader/mcuboot/boot/zephyr -- \  -DCONFIG_BOOT_SIGNATURE_TYPE_ECDSA_P256=y \ -DCONFIG_BOOT_MAX_IMG_SECTORS=512 -DDTC_OVERLAY_FILE="$PWD/zephyr/boards/zephyr/atm34evk/${build.board.split('/')[0]}_mcuboot_bl.overlay" && west build -p -s openair/samples/spe -b ${build.board.split('/')[0]}@mcuboot -d build/${build.board.split('/')[0]}/openair/samples/spe -- -DCONFIG_BOOTLOADER_MCUBOOT=y -DCONFIG_MCUBOOT_GENERATE_UNSIGNED_IMAGE=n -DDTS_EXTRA_CPPFLAGS=-DATMWSTK=LL && west build -p -s ${project.rel_path}  -b ${build.board.split('/')[0]}@mcuboot//ns  -d build/${build.board.split('/')[0]}_ns/${project.rel_path}  -- -DCONFIG_BOOTLOADER_MCUBOOT=y -DCONFIG_MCUBOOT_SIGNATURE_KEY_FILE=\\"bootloader/mcuboot/root-ec-p256.pem\\" -DCONFIG_SPE_PATH=\\"$PWD/build/${build.board.split('/')[0]}/openair/samples/spe\\" `;
	}
	let taskName = "Zephyr IDE Build: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Running without sysbuild ${build.name} from project: ${project.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
    regenerateCompileCommands(wsConfig);
}
exports.buildNonSysBuild = buildNonSysBuild;
async function buildNonMcuboot(wsConfig, isMenuConfig, project, build) {
    if (project === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to build");
            return;
        }
        project = wsConfig.projects[wsConfig.activeProject];
    }   
    if (build === undefined) {
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
            return;
        }       
        build = project.buildConfigs[buildName];
    }       
    let projectFolder = path.join(wsConfig.rootPath, project.rel_path);
    let buildFolder = path.join(wsConfig.rootPath, project.rel_path, build.name);
    let buildFsDir;
    if (fs.existsSync(buildFolder)) {
        buildFsDir = fs.readdirSync(buildFolder);
    }       
    let cmd = `west build -p -s openair/samples/spe -b ${build.board.split('/')[0]} -d build/${build.board.split('/')[0]}/openair/samples/spe && west build -p -s ${project.rel_path}  -b ${build.board.split('/')[0]}//ns  -d build/${build.board.split('/')[0]}_ns/${project.rel_path}  -- -DCONFIG_SPE_PATH=\\"$PWD/build/${build.board.split('/')[0]}/openair/samples/spe\\"`;

    let taskName = "Zephyr IDE Build: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Running without sysbuild ${build.name} from project: ${project.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
    regenerateCompileCommands(wsConfig);
}
exports.buildNonMcuboot = buildNonMcuboot;
async function buildNonSpeMcuboot(wsConfig, isMenuConfig, project, build) {
    if (project === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to build");
            return;
        }
        project = wsConfig.projects[wsConfig.activeProject];
    }   
    if (build === undefined) {
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
            return;
        }       
        build = project.buildConfigs[buildName];
    }       
    let projectFolder = path.join(wsConfig.rootPath, project.rel_path);
    let buildFolder = path.join(wsConfig.rootPath, project.rel_path, build.name);
    let buildFsDir;
    if (fs.existsSync(buildFolder)) {
        buildFsDir = fs.readdirSync(buildFolder);
    }       
    let cmd = `west build -p -s openair/samples/spe -b ${build.board.split('/')[0]} -d build/${build.board.split('/')[0]}/openair/samples/spe && west build -p -s ${project.rel_path}  -b ${build.board.split('/')[0]}//ns  -d build/${build.board.split('/')[0]}_ns/${project.rel_path}  -- -DCONFIG_SPE_PATH=\\"$PWD/build/${build.board.split('/')[0]}/openair/samples/spe\\" -DCONFIG_MERGE_SPE_NSPE=y`;

    let taskName = "Zephyr IDE Build: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Running without sysbuild ${build.name} from project: ${project.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
    regenerateCompileCommands(wsConfig);
}
exports.buildNonSpeMcuboot = buildNonSpeMcuboot;

async function westDebug(wsConfig, isNonSysBuild, project, build) {
    if (project === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to build");
            return;
        }
        project = wsConfig.projects[wsConfig.activeProject];
    }   
    if (build === undefined) {
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
            return;
        }       
        build = project.buildConfigs[buildName];
    }       
    let projectFolder = path.join(wsConfig.rootPath, project.rel_path);
    let buildFolder = path.join(wsConfig.rootPath, project.rel_path, build.name);
    let buildFsDir;
    if (fs.existsSync(buildFolder)) {
        buildFsDir = fs.readdirSync(buildFolder);
    }       
    
    let cmd = `west debug --build-dir build/${build.board.split('/')[0]}_ns/${project.rel_path} --openocd ./modules/hal/zephyr_lib/tools/openocd/bin/Linux/openocd `;

    let taskName = "Zephyr IDE Build: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Running without sysbuild ${build.name} from project: ${project.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
    regenerateCompileCommands(wsConfig);
}
exports.westDebug = westDebug;
async function buildMenuConfig(wsConfig, isMenuConfig, project, build) {
    if (project === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to build");
            return;
        }
        project = wsConfig.projects[wsConfig.activeProject];
    }
    if (build === undefined) {
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
            return;
        }
        build = project.buildConfigs[buildName];
    }
    let projectFolder = path.join(wsConfig.rootPath, project.rel_path);
    let buildFolder = path.join(wsConfig.rootPath, build.name);
    let buildFsDir;
    if (fs.existsSync(buildFolder)) {
        buildFsDir = fs.readdirSync(buildFolder);
    }
        await vscode.window.showErrorMessage(`Run a Build or Build Pristine before running Menu/GUI Config.${buildFolder}`);
    let cmd = `west build -t ${isMenuConfig ? "menuconfig" : "guiconfig"} ${projectFolder} --build-dir build/`;
    let taskName = "Zephyr IDE Build: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Running MenuConfig ${build.name} from project: ${project.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
    regenerateCompileCommands(wsConfig);
}
exports.buildMenuConfig = buildMenuConfig;
async function buildRamRomReport(wsConfig, isRamReport, project, build) {
    if (project === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to run report");
            return;
        }
        project = wsConfig.projects[wsConfig.activeProject];
    }
    if (build === undefined) {
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
            return;
        }
        build = project.buildConfigs[buildName];
    }
    let projectFolder = path.join(wsConfig.rootPath, project.rel_path);
    let buildFolder = path.join(wsConfig.rootPath, project.rel_path, build.name);
    let buildFsDir;
    if (fs.existsSync(buildFolder)) {
        buildFsDir = fs.readdirSync(buildFolder);
    }
    if (buildFsDir == undefined || buildFsDir.length == 0) {
        await vscode.window.showErrorMessage(`Run a Build or Build Pristine before running Menu/GUI Config.`);
        return;
    }
    let cmd = `west build -t ${isRamReport ? "ram_report" : "rom_report"} ${projectFolder} --build-dir ${buildFolder} `;
    let taskName = "Zephyr IDE Build: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Running ${isRamReport ? "RAM" : "ROM"} Report ${build.name} from project: ${project.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
    regenerateCompileCommands(wsConfig);
}
exports.buildRamRomReport = buildRamRomReport;
async function runDtshShell(wsConfig, project, build) {
    if (project === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to open dtsh shell");
            return;
        }
        project = wsConfig.projects[wsConfig.activeProject];
    }
    if (build === undefined) {
        let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, project.name);
        if (buildName === undefined) {
            await vscode.window.showErrorMessage(`You must choose a Build Configuration to continue.`);
            return;
        }
        build = project.buildConfigs[buildName];
    }
    let cmd = `dtsh ${path.join(wsConfig.rootPath, project.rel_path, build.name, 'zephyr', 'zephyr.dts')} `;
    let taskName = "Zephyr IDE DTSH Sehll: " + project.name + " " + build.name;
    vscode.window.showInformationMessage(`Running DTSH Shell ${build.name} from project: ${project.name}`);
    await (0, utils_1.executeTaskHelper)(taskName, cmd, (0, utils_1.getShellEnvironment)(wsConfig.activeSetupState), wsConfig.activeSetupState?.setupPath);
}
exports.runDtshShell = runDtshShell;
async function clean(wsConfig, projectName) {
    if (projectName === undefined) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Select a project before trying to clean");
            return;
        }
        projectName = wsConfig.activeProject;
    }
    let activeBuild = wsConfig.projectStates[projectName].activeBuildConfig;
    if (activeBuild === undefined) {
        vscode.window.showErrorMessage("Select a build before trying to clean");
        return;
    }
    await fs.remove(path.join(wsConfig.rootPath, wsConfig.projects[projectName].rel_path, activeBuild));
    vscode.window.showInformationMessage(`Cleaning ${wsConfig.projects[projectName].rel_path}`);
}
exports.clean = clean;
//# sourceMappingURL=build.js.map
