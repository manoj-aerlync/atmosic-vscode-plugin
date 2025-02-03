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
exports.installSdk = exports.getToolchainVersionList = exports.pickToolchainTarget = exports.getPlatformArch = exports.getPlatformName = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const compare_versions_1 = require("compare-versions");
const setup_1 = require("./setup");
const defines_1 = require("../defines");
const download_1 = require("./download");
// Platform
let platform = os.platform();
// Arch
let arch = os.arch();
function getPlatformName() {
    // Determine what sdk/toolchain to download
    switch (platform) {
        case "darwin":
            return "macos";
        case "linux":
            return "linux";
        case "win32":
            return "windows";
    }
    return;
}
exports.getPlatformName = getPlatformName;
function getPlatformArch() {
    switch (arch) {
        case "x64":
            return "x86_64";
        case "arm64":
            return "aarch64";
    }
    return;
}
exports.getPlatformArch = getPlatformArch;
async function pickToolchainTarget(context, globalConfig, toolchainVersion) {
    if (toolchainVersion === undefined) {
        let toolchainVersionList = await getToolchainVersionList(context);
        toolchainVersion = toolchainVersionList[0];
    }
    let currentToolchain = globalConfig.toolchains[toolchainVersion];
    if (currentToolchain) {
        for (const obj of defines_1.toolchainTargets) {
            if (currentToolchain.targetsInstalled.includes(obj.label)) {
                obj.description = "installed";
            }
        }
    }
    const toolchainTargetPicks = await vscode.window.showQuickPick(defines_1.toolchainTargets, { canPickMany: true, ignoreFocusOut: true, title: "Select Toolchain Target Architecture" });
    if (toolchainTargetPicks) {
        return toolchainTargetPicks.map(x => (x.label));
    }
    return;
}
exports.pickToolchainTarget = pickToolchainTarget;
async function getToolchainVersionList(context) {
    let toolchainVersionList = [];
    let toolchainMd5Path = context.asAbsolutePath("manifest/sdk_md5");
    let toolchainMd5Files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(toolchainMd5Path));
    for (const [index, [filename, type]] of toolchainMd5Files.entries()) {
        if (path.parse(filename).ext === ".sum") {
            toolchainVersionList.push(path.parse(filename).name);
        }
    }
    return toolchainVersionList.sort(compare_versions_1.compareVersions).reverse();
}
exports.getToolchainVersionList = getToolchainVersionList;
async function installSdk(context, globalConfig, output, installLatest = false, toolchainsToInstall, solo = true) {
    // Show setup progress..
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Installing Zephyr SDK",
        cancellable: false,
    }, async (progress, token) => {
        output.show();
        progress.report({ increment: 5 });
        if (getPlatformName() === undefined) {
            vscode.window.showErrorMessage("Unsupported platform for Zephyr IDE");
            return;
        }
        let exists = await fs.pathExists((0, setup_1.getToolsDir)());
        if (!exists) {
            await fs.mkdirp((0, setup_1.getToolsDir)());
        }
        let toolchainVersionList = await getToolchainVersionList(context);
        let toolchainVersion = toolchainVersionList[0];
        if (!installLatest) {
            // Pick options
            const pickOptions = {
                ignoreFocusOut: true,
                placeHolder: "Which toolchain version would you like to install?",
            };
            toolchainVersion = await vscode.window.showQuickPick(toolchainVersionList, pickOptions);
        }
        // Check if user canceled
        if (toolchainVersion === undefined) {
            vscode.window.showErrorMessage("Zephyr IDE Setup canceled. Toolchain version not specified.");
            return;
        }
        if (toolchainsToInstall === undefined) {
            toolchainsToInstall = await pickToolchainTarget(context, globalConfig, toolchainVersion);
        }
        if (toolchainsToInstall === undefined) {
            vscode.window.showErrorMessage("Zephyr IDE Setup canceled. Toolchain targets not specified");
            return;
        }
        globalConfig.sdkInstalled = false;
        (0, setup_1.setGlobalState)(context, globalConfig);
        let selectedToolchainFile = context.asAbsolutePath("manifest/sdk_md5/" + toolchainVersion + ".sum");
        // Set up downloader path
        download_1.FileDownload.init(path.join((0, setup_1.getToolsDir)(), "downloads"));
        let toolchainFileRawText = fs.readFileSync(selectedToolchainFile, 'utf8');
        let toolchainMinimalDownloadEntry;
        let toolchainTargetDownloadEntries = [];
        let toolchainTargetFileNames = toolchainsToInstall.map(targetName => ({ name: targetName, fileName: "toolchain_" + getPlatformName() + "-" + getPlatformArch() + "_" + targetName + (targetName.includes("xtensa") ? "_" : "-") + "zephyr-" + (targetName === "arm" ? "eabi" : "elf") }));
        let toolchainBasePath = "toolchains/zephyr-sdk-" + toolchainVersion;
        for (const line of toolchainFileRawText.trim().split('\n')) {
            let s = line.trim().split(/[\s\s]+/g);
            let md5 = s[0];
            let fileName = s[1];
            let parsedFileName = path.parse(fileName);
            if (parsedFileName.ext === ".xz") {
                parsedFileName = path.parse(parsedFileName.name);
            }
            if (parsedFileName.name === "zephyr-sdk-" + toolchainVersion + "_" + getPlatformName() + "-" + getPlatformArch() + "_minimal") {
                toolchainMinimalDownloadEntry = {
                    "name": "toolchains",
                    "filename": fileName,
                    "url": "https://github.com/zephyrproject-rtos/sdk-ng/releases/download/v" + toolchainVersion + "/" + fileName,
                    "md5": md5,
                    "clearTarget": true,
                    "targetName": "minimal"
                };
                if (getPlatformName() === "macos") {
                    toolchainMinimalDownloadEntry.cmd = toolchainsToInstall.map(targetName => ({
                        "cmd": "zephyr-sdk-" + toolchainVersion + "/setup.sh -t " + targetName + (targetName.includes("xtensa") ? "_" : "-") + "zephyr-" + (targetName === "arm" ? "eabi" : "elf"),
                        "usepath": true
                    }));
                }
            }
            for (const e in toolchainTargetFileNames) {
                if (toolchainTargetFileNames[e].fileName === parsedFileName.name) {
                    toolchainTargetDownloadEntries.push({
                        "name": toolchainBasePath,
                        "filename": fileName,
                        "url": "https://github.com/zephyrproject-rtos/sdk-ng/releases/download/v" + toolchainVersion + "/" + fileName,
                        "md5": md5,
                        "clearTarget": false,
                        "targetName": toolchainTargetFileNames[e].name
                    });
                    break;
                }
            }
        }
        if (toolchainTargetDownloadEntries.length === 0 || toolchainMinimalDownloadEntry === undefined) {
            vscode.window.showErrorMessage("Error finding appropriate toolchain file");
            return;
        }
        // Output indicating toolchain install
        output.appendLine(`[SETUP] Installing zephyr-sdk-${toolchainVersion} toolchain...`);
        // Download minimal sdk file
        let res = await (0, download_1.processDownload)(toolchainMinimalDownloadEntry, output);
        if (!res) {
            vscode.window.showErrorMessage("Error downloading minimal toolchain file. Check output for more info.");
            return;
        }
        progress.report({ increment: 5 });
        if (globalConfig.toolchains[toolchainVersion] === undefined) {
            globalConfig.toolchains[toolchainVersion] = {
                version: toolchainVersion,
                basePath: path.join((0, setup_1.getToolsDir)(), toolchainBasePath),
                targetsInstalled: [],
            };
            (0, setup_1.setGlobalState)(context, globalConfig);
        }
        for (const entry in toolchainTargetDownloadEntries) {
            // Download arm sdk file
            res = await (0, download_1.processDownload)(toolchainTargetDownloadEntries[entry], output);
            if (!res) {
                vscode.window.showErrorMessage("Error downloading arm toolchain file. Check output for more info.");
                return;
            }
            else {
                let targetName = toolchainTargetDownloadEntries[entry].targetName;
                if (!globalConfig.toolchains[toolchainVersion].targetsInstalled.includes(targetName)) {
                    globalConfig.toolchains[toolchainVersion].targetsInstalled.push(targetName);
                    (0, setup_1.setGlobalState)(context, globalConfig);
                }
            }
        }
        progress.report({ increment: 10 });
        // Setup flag complete
        progress.report({ increment: 100 });
        output.appendLine(`[SETUP] Installing zephyr-sdk-${toolchainVersion} complete`);
        globalConfig.armGdbPath = path.join((0, setup_1.getToolsDir)(), toolchainBasePath, "arm-zephyr-eabi", "bin", "arm-zephyr-eabi-gdb");
        globalConfig.sdkInstalled = true;
        await (0, setup_1.setGlobalState)(context, globalConfig);
        if (solo) {
            vscode.window.showInformationMessage(`Zephyr IDE: Toolchain Setup Complete!`);
        }
    });
}
exports.installSdk = installSdk;
;
//# sourceMappingURL=setup_toolchain.js.map