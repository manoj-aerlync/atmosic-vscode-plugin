"use strict";
/**
 * @author Jared Wolff <jared@circuitdojo.org>
 * @copyright Circuit Dojo LLC
 * @license Apache 2.0
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
exports.processDownload = exports.FileDownload = void 0;
/*
Modifications Copyright 2024 mylonics
Author Rijesh Augustine

Code based on https://github.com/circuitdojo/zephyr-tools/extension.ts and https://github.com/circuitdojo/zephyr-tools/Download.ts.
Modifications primarily include naming convetions of funtions

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
const vscode = __importStar(require("vscode"));
const unzip = __importStar(require("node-stream-zip"));
const sevenzip = __importStar(require("7zip-bin"));
const node7zip = __importStar(require("node-7z"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const crypto = __importStar(require("crypto"));
const cp = __importStar(require("child_process"));
const util = __importStar(require("util"));
const HttpClient_1 = require("typed-rest-client/HttpClient");
const setup_1 = require("./setup");
class FileDownload {
    static downloadsdir = "";
    // Set the download target directory
    static init(dir) {
        this.downloadsdir = dir;
    }
    // Exists
    static async exists(file) {
        const dest = path.join(this.downloadsdir, file);
        if (await fs.pathExists(dest)) {
            return dest;
        }
        else {
            return null;
        }
    }
    // Compares file with provided hash
    static async check(file, hash) {
        const dest = path.join(this.downloadsdir, file);
        // Check if exists first
        if (!await fs.pathExists(dest)) {
            console.log("doesn't exist! " + dest);
            return false;
        }
        // Get file contents 
        const fileBuffer = fs.readFileSync(dest);
        // Create hash
        const hashSum = crypto.createHash('md5');
        hashSum.update(fileBuffer);
        // Get hex representation 
        const hex = hashSum.digest('hex');
        // console.log(`hex ${hex}`);
        if (hex === hash) {
            return true;
        }
        else {
            return false;
        }
    }
    // Delets files in download
    static async clean() {
        await fs.remove(this.downloadsdir);
    }
    // Downloads file to filestore
    static async fetch(url) {
        const client = new HttpClient_1.HttpClient("download");
        const response = await client.get(url);
        // Get file name
        const filename = path.basename(url);
        // Determine dest
        const dest = path.join(this.downloadsdir, filename);
        // Make sure downloadsdir exists
        let exists = await fs.pathExists(this.downloadsdir);
        if (!exists) {
            console.log("downloadsdir not found");
            // Otherwise create home directory
            await fs.mkdirp(this.downloadsdir);
        }
        // Set up file stream
        const file = fs.createWriteStream(dest);
        if (response.message.statusCode !== 200) {
            const err = new Error(`Unexpected HTTP response: ${response.message.statusCode}`);
            // err["httpStatusCode"] = response.message.statusCode;
            throw err;
        }
        return new Promise((resolve, reject) => {
            file.on("error", (err) => reject(err));
            const stream = response.message.pipe(file);
            stream.on("close", () => {
                try {
                    resolve(dest);
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
}
exports.FileDownload = FileDownload;
async function processDownload(download, output) {
    // Promisified exec
    let exec = util.promisify(cp.exec);
    // Check if it already exists
    let filepath = await FileDownload.exists(download.filename);
    // Download if doesn't exist _or_ hash doesn't match
    if (filepath === null || (await FileDownload.check(download.filename, download.md5)) === false) {
        output.appendLine("[SETUP] downloading " + download.url);
        filepath = await FileDownload.fetch(download.url);
        // Check again
        if ((await FileDownload.check(download.filename, download.md5)) === false) {
            vscode.window.showErrorMessage("Error downloading " + download.filename + ". Checksum mismatch.");
            return false;
        }
    }
    // Get the path to copy the contents to..
    let copytopath = path.join((0, setup_1.getToolsDir)(), download.name);
    // Check if copytopath exists and create if not
    if (!(await fs.pathExists(copytopath))) {
        await fs.mkdirp(copytopath);
    }
    // Unpack and place into `$HOME/.zephyr_ide`
    if (download.url.includes(".zip")) {
        // Unzip and copy
        output.appendLine(`[SETUP] unzip ${filepath} to ${copytopath}`);
        const zip = new unzip.async({ file: filepath });
        zip.on("extract", (entry, file) => {
            // Make executable
            fs.chmodSync(file, 0o755);
        });
        await zip.extract(null, copytopath);
        await zip.close();
    }
    else if (download.url.includes("tar")) {
        // Then untar
        const cmd = `tar -xvf "${filepath}" -C "${copytopath}"`;
        output.appendLine(cmd);
        let res = await exec(cmd, {}).then(value => {
            output.append(value.stdout);
            return true;
        }, reason => {
            output.append(reason.stdout);
            output.append(reason.stderr);
            // Error message
            vscode.window.showErrorMessage("Error un-tar of download. Check output for more info.");
            return false;
        });
        // Return if untar was unsuccessful
        if (!res) {
            return false;
        }
    }
    else if (download.url.includes("7z")) {
        // Unzip and copy
        output.appendLine(`[SETUP] 7z extract ${filepath} to ${copytopath}`);
        const pathTo7zip = sevenzip.path7za;
        const seven = await node7zip.extractFull(filepath, copytopath, {
            $bin: pathTo7zip,
        });
    }
    // Run any commands that are needed..
    for (let entry of download.cmd ?? []) {
        output.appendLine(entry.cmd);
        // Prepend
        let cmd = entry.cmd;
        if (entry.usepath) {
            cmd = path.join(copytopath, entry.cmd ?? "");
        }
        // Run the command
        let res = await exec(cmd, {}).then(value => {
            output.append(value.stdout);
            return true;
        }, reason => {
            output.append(reason.stdout);
            output.append(reason.stderr);
            // Error message
            vscode.window.showErrorMessage("Error for sdk command.");
            return false;
        });
        if (!res) {
            return false;
        }
    }
    return true;
}
exports.processDownload = processDownload;
//# sourceMappingURL=download.js.map