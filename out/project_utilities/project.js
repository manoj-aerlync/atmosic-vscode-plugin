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
exports.selectDebugAttachLaunchConfiguration = exports.selectBuildDebugLaunchConfiguration = exports.selectDebugLaunchConfiguration = exports.getActiveBuild = exports.addRunner = exports.addRunnerToBuild = exports.setActiveRunner = exports.askUserForRunner = exports.setActive = exports.addBuild = exports.removeRunner = exports.removeBuild = exports.addBuildToProject = exports.addProject = exports.changeProjectNameInCMakeFile = exports.removeProject = exports.setActiveBuild = exports.askUserForBuild = exports.setActiveProject = exports.askUserForProject = exports.removeConfigFile = exports.removeConfigFiles = exports.addConfigFiles = exports.createNewProjectFromSample = exports.modifyBuildArguments = exports.getBuildName = exports.getProjectName = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const utils_1 = require("../utilities/utils");
const build_selector_1 = require("./build_selector");
const setup_1 = require("../setup_utilities/setup");
const runner_selector_1 = require("./runner_selector");
const config_selector_1 = require("./config_selector");
function getProjectName(wsConfig, projectName) {
    if (!projectName) {
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Set Active Project before running this command");
            return;
        }
        projectName = wsConfig.activeProject;
    }
    return projectName;
}
exports.getProjectName = getProjectName;
function getBuildName(wsConfig, projectName, buildName) {
    if (!buildName) {
        buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, projectName);
        if (buildName === undefined) {
            vscode.window.showErrorMessage("Set Active Build before running this command");
            return;
        }
    }
    return buildName;
}
exports.getBuildName = getBuildName;
async function modifyBuildArguments(context, wsConfig, projectName, buildName) {
    projectName = getProjectName(wsConfig, projectName);
    if (!projectName) {
        return;
    }
    buildName = getBuildName(wsConfig, projectName, buildName);
    if (!buildName) {
        return;
    }
    const newWestBuildArgs = await vscode.window.showInputBox({ title: "Modify West Build Arguments", value: wsConfig.projects[projectName].buildConfigs[buildName].westBuildArgs, prompt: "West Build arguments i.e --sysbuild", placeHolder: "--sysbuild" });
    if (newWestBuildArgs !== undefined) {
        wsConfig.projects[projectName].buildConfigs[buildName].westBuildArgs = newWestBuildArgs;
    }
    const newCMakeBuildArgs = await vscode.window.showInputBox({ title: "Modify CMake Build Arguments", value: wsConfig.projects[projectName].buildConfigs[buildName].westBuildCMakeArgs, prompt: "CMake Build arguments i.e -DCMAKE_VERBOSE_MAKEFILE=ON", placeHolder: "-DCMAKE_VERBOSE_MAKEFILE=ON" });
    if (newCMakeBuildArgs !== undefined) {
        wsConfig.projects[projectName].buildConfigs[buildName].westBuildCMakeArgs = newCMakeBuildArgs;
    }
    await (0, setup_1.setWorkspaceState)(context, wsConfig);
}
exports.modifyBuildArguments = modifyBuildArguments;
async function readAllDirectories(directory, projectList, relativePath = '') {
    try {
        const files = await vscode.workspace.fs.readDirectory(directory);
        for (const [name, type] of files) {
            const filePath = vscode.Uri.joinPath(directory, name);
            const fullPath = path.join(relativePath, name); // Keep track of the full path
            if (type === vscode.FileType.Directory) {
                const sampleYamlPath = vscode.Uri.joinPath(filePath, "sample.yaml");
                try {
                    await vscode.workspace.fs.stat(sampleYamlPath);
                    projectList.push({ label: name, description: fullPath });
                }
                catch (error) {
                    await readAllDirectories(filePath, projectList, fullPath);
                }
            }
        }
    }
    catch (error) {
    }
}
async function createNewProjectFromSample(context, wsConfig) {
    if (!wsConfig.activeSetupState || !wsConfig.activeSetupState.zephyrDir) {
        vscode.window.showErrorMessage("Run `Atmosic IDE: West Update` first.");
        return;
    }
    const samplesDir = path.join(wsConfig.activeSetupState.zephyrDir, 'samples');
    const samplesUri = vscode.Uri.file(samplesDir);
    const projectList = [];
    await readAllDirectories(samplesUri, projectList);
    const pickOptions = {
        ignoreFocusOut: true,
        matchOnDescription: true,
        placeHolder: "Select Sample Project",
    };
    let selectedRelativePath = await vscode.window.showQuickPick(projectList, pickOptions);
    if (selectedRelativePath && selectedRelativePath.description && selectedRelativePath.label) {
        const projectDest = await vscode.window.showInputBox({ title: "Choose Project Destination", value: selectedRelativePath.label });
        if (projectDest) {
            const destinationPath = path.join(wsConfig.rootPath, projectDest);
            const selectedProject = path.join(samplesDir, selectedRelativePath.description);
            fs.cpSync(selectedProject, destinationPath, { recursive: true });
            let newProjectName = path.parse(projectDest).name;
            if (selectedRelativePath.label !== newProjectName) {
                changeProjectNameInCMakeFile(destinationPath, newProjectName);
            }
            return destinationPath;
        }
    }
}
exports.createNewProjectFromSample = createNewProjectFromSample;
async function addConfigFiles(context, wsConfig, isKConfig, isToProject, projectName, buildName, isPrimary) {
    projectName = getProjectName(wsConfig, projectName);
    if (!projectName) {
        return;
    }
    if (!isToProject) {
        buildName = getBuildName(wsConfig, projectName, buildName);
        if (!buildName) {
            return;
        }
    }
    let result = await (0, config_selector_1.configSelector)(wsConfig, isKConfig, isToProject, isPrimary);
    if (result) {
        if (isToProject) {
            wsConfig.projects[projectName].confFiles.config = wsConfig.projects[projectName].confFiles.config.concat(result.config);
            wsConfig.projects[projectName].confFiles.extraConfig = wsConfig.projects[projectName].confFiles.extraConfig.concat(result.extraConfig);
            wsConfig.projects[projectName].confFiles.overlay = wsConfig.projects[projectName].confFiles.overlay.concat(result.overlay);
            wsConfig.projects[projectName].confFiles.extraOverlay = wsConfig.projects[projectName].confFiles.extraOverlay.concat(result.extraOverlay);
        }
        else {
            if (buildName) {
                wsConfig.projects[projectName].buildConfigs[buildName].confFiles.config = wsConfig.projects[projectName].buildConfigs[buildName].confFiles.config.concat(result.config);
                wsConfig.projects[projectName].buildConfigs[buildName].confFiles.extraConfig = wsConfig.projects[projectName].buildConfigs[buildName].confFiles.extraConfig.concat(result.extraConfig);
                wsConfig.projects[projectName].buildConfigs[buildName].confFiles.overlay = wsConfig.projects[projectName].buildConfigs[buildName].confFiles.overlay.concat(result.overlay);
                wsConfig.projects[projectName].buildConfigs[buildName].confFiles.extraOverlay = wsConfig.projects[projectName].buildConfigs[buildName].confFiles.extraOverlay.concat(result.extraOverlay);
            }
            else {
                return;
            }
        }
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
        vscode.window.showInformationMessage(`Successfully Added Config Files`);
    }
}
exports.addConfigFiles = addConfigFiles;
async function removeConfigFiles(context, wsConfig, isKConfig, isToProject, projectName, buildName, isPrimary) {
    projectName = getProjectName(wsConfig, projectName);
    if (!projectName) {
        return;
    }
    let confFiles = wsConfig.projects[projectName].confFiles;
    if (!isToProject) {
        buildName = getBuildName(wsConfig, projectName, buildName);
        if (buildName) {
            confFiles = wsConfig.projects[projectName].buildConfigs[buildName].confFiles;
        }
    }
    let result = await (0, config_selector_1.configRemover)(confFiles, isKConfig, isToProject, isPrimary);
    if (result) {
        if (isToProject) {
            wsConfig.projects[projectName].confFiles = result;
        }
        else {
            if (buildName) {
                wsConfig.projects[projectName].buildConfigs[buildName].confFiles = result;
            }
        }
    }
    await (0, setup_1.setWorkspaceState)(context, wsConfig);
    vscode.window.showInformationMessage(`Successfully Removed Config Files`);
}
exports.removeConfigFiles = removeConfigFiles;
async function removeConfigFile(context, wsConfig, isKConfig, isToProject, projectName, isPrimary, fileNames, buildName) {
    let confFiles = wsConfig.projects[projectName].confFiles;
    if (!isToProject) {
        if (buildName === undefined) {
            vscode.window.showErrorMessage("Set build before trying to remove Config Files");
            return;
        }
        confFiles = wsConfig.projects[projectName].buildConfigs[buildName].confFiles;
    }
    if (isKConfig) {
        if (isPrimary) {
            confFiles.config = confFiles.config.filter(function (el) {
                return !fileNames.includes(el);
            });
        }
        else {
            confFiles.extraConfig = confFiles.extraConfig.filter(function (el) {
                return !fileNames.includes(el);
            });
        }
    }
    else {
        if (isPrimary) {
            confFiles.overlay = confFiles.overlay.filter(function (el) {
                return !fileNames.includes(el);
            });
        }
        else {
            confFiles.extraOverlay = confFiles.extraOverlay.filter(function (el) {
                return !fileNames.includes(el);
            });
        }
    }
    await (0, setup_1.setWorkspaceState)(context, wsConfig);
    vscode.window.showInformationMessage(`Successfully Removed Config Files`);
}
exports.removeConfigFile = removeConfigFile;
async function askUserForProject(wsConfig) {
    const pickOptions = {
        ignoreFocusOut: true,
        placeHolder: "Select Project",
    };
    if (Object.keys(wsConfig.projects).length === 0) {
        vscode.window.showErrorMessage("First Run `Add Project` or `Create Project`");
        return;
    }
    let projectList = [];
    for (let key in wsConfig.projects) {
        projectList.push(key);
    }
    let selectedProject = await vscode.window.showQuickPick(projectList, pickOptions);
    return selectedProject;
}
exports.askUserForProject = askUserForProject;
async function setActiveProject(context, wsConfig) {
    let selectedProject = await askUserForProject(wsConfig);
    if (selectedProject === undefined) {
        return;
    }
    wsConfig.activeProject = selectedProject;
    await (0, setup_1.setWorkspaceState)(context, wsConfig);
    vscode.window.showInformationMessage(`Successfully Set ${selectedProject} as Active Project`);
}
exports.setActiveProject = setActiveProject;
async function askUserForBuild(context, wsConfig, projectName) {
    const pickOptions = {
        ignoreFocusOut: true,
        placeHolder: "Select Build",
    };
    let buildConfigs = wsConfig.projects[projectName].buildConfigs;
    let buildList = [];
    for (let key in buildConfigs) {
        buildList.push(key);
    }
    let selectedBuild = await vscode.window.showQuickPick(buildList, pickOptions);
    return selectedBuild;
}
exports.askUserForBuild = askUserForBuild;
async function setActiveBuild(context, wsConfig) {
    if (wsConfig.activeProject === undefined) {
        setActiveProject(context, wsConfig);
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Set Active Project before trying to Set Active Build");
            return;
        }
    }
    let selectedBuild = await askUserForBuild(context, wsConfig, wsConfig.activeProject);
    if (selectedBuild === undefined) {
        return;
    }
    let buildConfigs = wsConfig.projects[wsConfig.activeProject].buildConfigs;
    wsConfig.projectStates[wsConfig.activeProject].activeBuildConfig = buildConfigs[selectedBuild].name;
    await (0, setup_1.setWorkspaceState)(context, wsConfig);
    vscode.window.showInformationMessage(`Successfully Set ${selectedBuild} as Active Build of ${wsConfig.activeProject}`);
}
exports.setActiveBuild = setActiveBuild;
async function removeProject(context, wsConfig, projectName) {
    if (projectName === undefined) {
        projectName = await askUserForProject(wsConfig);
        if (projectName === undefined) {
            return;
        }
    }
    if (projectName in wsConfig.projects) {
        const selection = await vscode.window.showWarningMessage('Are you sure you want to remove ' + projectName + '?', 'Yes', 'Cancel');
        if (selection !== 'Yes') {
            return;
        }
        delete wsConfig.projects[projectName];
        if (wsConfig.activeProject === projectName) {
            wsConfig.activeProject = undefined;
        }
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
        return true;
    }
}
exports.removeProject = removeProject;
async function changeProjectNameInCMakeFile(projectPath, newProjectName) {
    let projectCmakePath = projectPath + "/CMakeLists.txt";
    if (fs.existsSync(projectCmakePath)) {
        const projectCMakeFile = fs.readFileSync(projectCmakePath, 'utf8');
        let newProjectCMakeFile = projectCMakeFile.replace(/project\([^)]*\)/i, "project(" + newProjectName + ")");
        fs.writeFileSync(projectCmakePath, newProjectCMakeFile);
        return true;
    }
    return false;
}
exports.changeProjectNameInCMakeFile = changeProjectNameInCMakeFile;
async function addProject(wsConfig, context, projectPath) {
    if (projectPath === undefined) {
        const dialogOptions = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: "Select project folder."
        };
        // Open file picker for destination directory
        let open = await vscode.window.showOpenDialog(dialogOptions);
        if (open === undefined) {
            vscode.window.showErrorMessage('Failed to provide a valid target folder.');
            return null;
        }
        projectPath = open[0].fsPath;
        let projectCmakePath = projectPath + "/CMakeLists.txt";
        if (fs.pathExistsSync(projectCmakePath)) {
            let contents = await vscode.workspace.openTextDocument(projectCmakePath).then(document => {
                return document.getText();
            });
            if (contents.includes("project(")) {
            }
            else {
                vscode.window.showInformationMessage(`Failed to Load Project ${projectPath}, Does your project folder have a correct CMake File?`);
                return;
            }
        }
        else {
            vscode.window.showInformationMessage(`Failed to Load Project ${projectPath}, Does your project folder have a CMakeLists.txt File?`);
            return;
        }
    }
    if (projectPath === undefined) {
        return;
    }
    let projectName = path.parse(projectPath).name;
    wsConfig.projects[projectName] = {
        rel_path: path.relative(wsConfig.rootPath, projectPath),
        name: projectName,
        buildConfigs: {},
        confFiles: {
            config: [],
            extraConfig: [],
            overlay: [],
            extraOverlay: [],
        },
    };
    wsConfig.projectStates[projectName] = { buildStates: {}, viewOpen: true };
    wsConfig.activeProject = projectName;
    await (0, setup_1.setWorkspaceState)(context, wsConfig);
    vscode.window.showInformationMessage(`Successfully loaded Project ${projectPath}`);
}
exports.addProject = addProject;
async function addBuildToProject(wsConfig, context, projectName) {
    if (wsConfig.activeSetupState) {
        let result = await (0, build_selector_1.buildSelector)(context, wsConfig.activeSetupState, wsConfig.rootPath);
        if (result && result.name !== undefined) {
            result.runnerConfigs = {};
            if (wsConfig.projects[projectName].buildConfigs[result.name]) {
                const selection = await vscode.window.showWarningMessage('Build Configuration with name: ' + result.name + ' already exists!', 'Overwrite', 'Cancel');
                if (selection !== 'Overwrite') {
                    vscode.window.showErrorMessage(`Failed to add build configuration`);
                    return;
                }
            }
            vscode.window.showInformationMessage(`Creating Build Configuration: ${result.name}`);
            wsConfig.projects[projectName].buildConfigs[result.name] = result;
            wsConfig.projectStates[projectName].buildStates[result.name] = { runnerStates: {}, viewOpen: true };
            wsConfig.projectStates[projectName].activeBuildConfig = result.name;
            await (0, setup_1.setWorkspaceState)(context, wsConfig);
        }
    }
}
exports.addBuildToProject = addBuildToProject;
async function removeBuild(context, wsConfig, projectName, buildName) {
    if (projectName === undefined) {
        projectName = await askUserForProject(wsConfig);
        if (projectName === undefined) {
            return;
        }
    }
    if (buildName === undefined) {
        buildName = await askUserForBuild(context, wsConfig, projectName);
        if (buildName === undefined) {
            return;
        }
    }
    if (buildName in wsConfig.projects[projectName].buildConfigs) {
        const selection = await vscode.window.showWarningMessage('Are you sure you want to remove ' + buildName + '?', 'Yes', 'Cancel');
        if (selection !== 'Yes') {
            return;
        }
        delete wsConfig.projects[projectName].buildConfigs[buildName];
        if (wsConfig.projectStates[projectName].activeBuildConfig === buildName) {
            wsConfig.projectStates[projectName].activeBuildConfig = undefined;
        }
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
        return true;
    }
}
exports.removeBuild = removeBuild;
async function removeRunner(context, wsConfig, projectName, buildName, runnerName) {
    if (projectName === undefined) {
        projectName = await askUserForProject(wsConfig);
        if (projectName === undefined) {
            return;
        }
    }
    if (buildName === undefined) {
        buildName = await askUserForBuild(context, wsConfig, projectName);
        if (buildName === undefined) {
            return;
        }
    }
    if (runnerName === undefined) {
        runnerName = await askUserForRunner(context, wsConfig, projectName, buildName);
        if (runnerName === undefined) {
            return;
        }
    }
    let build = wsConfig.projects[projectName].buildConfigs[buildName];
    if (runnerName in build.runnerConfigs) {
        const selection = await vscode.window.showWarningMessage('Are you sure you want to remove ' + runnerName + '?', 'Yes', 'Cancel');
        if (selection !== 'Yes') {
            return;
        }
        delete build.runnerConfigs[runnerName];
        if (wsConfig.projectStates[projectName].buildStates[buildName].activeRunner === runnerName) {
            wsConfig.projectStates[projectName].buildStates[buildName].activeRunner = undefined;
        }
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
        return true;
    }
}
exports.removeRunner = removeRunner;
async function addBuild(wsConfig, context) {
    if (wsConfig.activeProject === undefined) {
        vscode.window.showErrorMessage(`Failed to Add Build Configuration, please first select a project`);
        return;
    }
    await addBuildToProject(wsConfig, context, wsConfig.activeProject);
}
exports.addBuild = addBuild;
async function setActive(wsConfig, project, build, runner) {
    if (project) {
        wsConfig.activeProject = project;
        if (build) {
            wsConfig.projectStates[wsConfig.activeProject].activeBuildConfig = build;
            if (runner) {
                wsConfig.projectStates[wsConfig.activeProject].buildStates[build].activeRunner = runner;
            }
        }
        vscode.commands.executeCommand("atmosic-ide.update-web-view");
    }
}
exports.setActive = setActive;
async function askUserForRunner(context, wsConfig, projectName, buildName) {
    const pickOptions = {
        ignoreFocusOut: true,
        placeHolder: "Select Runner",
    };
    let buildConfig = wsConfig.projects[projectName].buildConfigs[buildName];
    let runnerList = [];
    for (let key in buildConfig.runnerConfigs) {
        runnerList.push(key);
    }
    let selectedRunner = await vscode.window.showQuickPick(runnerList, pickOptions);
    return selectedRunner;
}
exports.askUserForRunner = askUserForRunner;
async function setActiveRunner(context, wsConfig) {
    if (wsConfig.activeProject === undefined) {
        setActiveProject(context, wsConfig);
        if (wsConfig.activeProject === undefined) {
            vscode.window.showErrorMessage("Set Active Project before trying to Set Active Build");
            return;
        }
    }
    let activeBuildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, wsConfig.activeProject);
    if (activeBuildName === undefined) {
        setActiveBuild(context, wsConfig);
        activeBuildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, wsConfig.activeProject);
        if (activeBuildName === undefined) {
            vscode.window.showErrorMessage("Set Active Build before trying to Set Active Runner");
            return;
        }
        return;
    }
    let activeBuild = wsConfig.projects[wsConfig.activeProject].buildConfigs[activeBuildName];
    let runnerList = [];
    for (let key in activeBuild.runnerConfigs) {
        runnerList.push(key);
    }
    let selectedRunner = await askUserForRunner(context, wsConfig, wsConfig.activeProject, activeBuildName);
    if (selectedRunner === undefined) {
        return;
    }
    wsConfig.projectStates[wsConfig.activeProject].buildStates[activeBuildName].activeRunner = selectedRunner;
    await (0, setup_1.setWorkspaceState)(context, wsConfig);
    vscode.window.showInformationMessage(`Successfully Set ${selectedRunner} as Active Runner for ${activeBuild.name} of ${wsConfig.activeProject}`);
}
exports.setActiveRunner = setActiveRunner;
async function addRunnerToBuild(wsConfig, context, projectName, buildName) {
    let build = wsConfig.projects[projectName].buildConfigs[buildName];
    let result;
    if (path.isAbsolute(build.relBoardSubDir)) {
        result = await (0, runner_selector_1.runnerSelector)(build.relBoardSubDir); // Will remove eventually
    }
    else {
        if (build.relBoardDir) {
            //Custom Folder
            result = await (0, runner_selector_1.runnerSelector)(path.join(wsConfig.rootPath, build.relBoardDir, build.relBoardSubDir));
        }
        else if (wsConfig.activeSetupState) {
            //Default zephyr folder
            result = await (0, runner_selector_1.runnerSelector)(path.join(wsConfig.activeSetupState?.zephyrDir, 'boards', build.relBoardSubDir));
        }
    }
    if (result && result.name !== undefined) {
        if (build.runnerConfigs[result.name]) {
            const selection = await vscode.window.showWarningMessage('Runner Configuration with name: ' + result.name + ' already exists!', 'Overwrite', 'Cancel');
            if (selection !== 'Overwrite') {
                vscode.window.showErrorMessage(`Failed to add runner configuration`);
                return;
            }
        }
        vscode.window.showInformationMessage(`Creating Runner Configuration: ${result.name}`);
        build.runnerConfigs[result.name] = result;
        wsConfig.projectStates[projectName].buildStates[buildName].activeRunner = result.name;
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
        return;
    }
}
exports.addRunnerToBuild = addRunnerToBuild;
async function addRunner(wsConfig, context) {
    if (wsConfig.activeProject === undefined) {
        vscode.window.showInformationMessage(`Failed to add Runner, please first select a project`);
        return;
    }
    let activeBuild = (0, setup_1.getActiveBuildOfProject)(wsConfig, wsConfig.activeProject);
    if (activeBuild === undefined) {
        vscode.window.showInformationMessage(`Failed to add Runner, please first select a build`);
        return;
    }
    await addRunnerToBuild(wsConfig, context, wsConfig.activeProject, activeBuild);
}
exports.addRunner = addRunner;
async function getActiveBuild(context, wsConfig) {
    if (wsConfig.activeProject === undefined) {
        return;
    }
    let project = wsConfig.projects[wsConfig.activeProject];
    let buildName = (0, setup_1.getActiveBuildOfProject)(wsConfig, wsConfig.activeProject);
    if (buildName === undefined) {
        return;
    }
    return project.buildConfigs[buildName];
}
exports.getActiveBuild = getActiveBuild;
async function selectDebugLaunchConfiguration(context, wsConfig) {
    let activeBuild = await getActiveBuild(context, wsConfig);
    let newConfig = await (0, utils_1.selectLaunchConfiguration)();
    if (activeBuild && newConfig) {
        activeBuild.launchTarget = newConfig;
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
    }
}
exports.selectDebugLaunchConfiguration = selectDebugLaunchConfiguration;
async function selectBuildDebugLaunchConfiguration(context, wsConfig) {
    let activeBuild = await getActiveBuild(context, wsConfig);
    let newConfig = await (0, utils_1.selectLaunchConfiguration)();
    if (activeBuild && newConfig) {
        activeBuild.buildDebugTarget = newConfig;
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
    }
}
exports.selectBuildDebugLaunchConfiguration = selectBuildDebugLaunchConfiguration;
async function selectDebugAttachLaunchConfiguration(context, wsConfig) {
    let activeBuild = await getActiveBuild(context, wsConfig);
    let newConfig = await (0, utils_1.selectLaunchConfiguration)();
    if (activeBuild && newConfig) {
        activeBuild.attachTarget = newConfig;
        await (0, setup_1.setWorkspaceState)(context, wsConfig);
    }
}
exports.selectDebugAttachLaunchConfiguration = selectDebugAttachLaunchConfiguration;
//# sourceMappingURL=project.js.map
