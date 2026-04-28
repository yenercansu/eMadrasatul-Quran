const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

// Watch workspace folders so Metro picks up changes in monorepo packages
config.watchFolders = [workspaceRoot];

// Resolve packages from both the app node_modules and the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
