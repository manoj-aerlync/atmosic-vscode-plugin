# openair-vscode-plugin

Steps for the installation of Atmosic IDE plugin in VS code

1)Clone the repository using the "git clone" command

2)Open the cloned repository in the Termiinal and install the required dependencies below.
	
	2.1) Run "npm install" to install the node dependenices
	
	2.2) Run "npm install esbuild --save-dev" to install the esbuild dependencies
	
	2.3) Run "npm install -g vsce" helps install the vsce tool globally, which is essential for packaging and publishing our plugin to the Visual Studio Code Marketplace


3)Once the installation is done run "vsce package" inside the folder which generates a vsix file in the same folder.

4)Open VS code and go to the extensions section and click on "..." and find the install from VSIX... option and import the vsix file generated previously.

5)This will add the atmosic plugin to the side container of the VS Code.

#Steps to initialise workspace

1) Create an empty folder and open it in VS code

2) Open Atmosic IDE extension click on "workspace" button 

3)Click on "Initialize Workspace" button and select the toolchain, west repo,branch to clone and wait for the initialisation to complete from setting the west environment to west update.

#Steps to Build and Flash the sample

1) Click on "+" in PROJECTS section and select the sample.Click on "Add Build" and select "Atmosic DIrectory Only"option to select the board atm33/34.

2)Add or skip build optimization options, skip the Additional Build Arguments,
Add CMake Arguments if additional Configs needs to be added just like "-DEXTRA_CONF_FILE=overlay-bt.conf" while building dfu over ble.

3)Building the sample can be done in different ways like with sysbuild, without sysbuild(builds mcuboot, spe, app), build SPE-NSPE, build without MCUBOOT.

4)To flash the sample, add a runner and select the appropriate runner that matches the case you used to build the sample.For example, if you build with sysbuild select "sysbuild" runner.
