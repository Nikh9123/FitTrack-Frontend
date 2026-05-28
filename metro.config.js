const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Only watch the project directory itself — do NOT watch parent/drive root
// as that causes Metro to scan system folders it can't access (EACCES/EPERM)
config.watchFolders = [projectRoot];

config.resolver.blockList = [
  // Block Windows system directories to prevent EPERM/EACCES errors
  /E:[/\\]\$RECYCLE\.BIN.*/,
  /E:[/\\]System Volume Information.*/,
];

function escape(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = config;
