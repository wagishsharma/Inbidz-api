const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: watch shared packages, but resolve deps from the mobile app first
// so Metro never picks up a stale hoisted react-native at the repo root.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Pin react-native to the mobile workspace so Metro never resolves a stale
// hoisted copy from the monorepo root.
const mobileModules = path.resolve(projectRoot, 'node_modules');
config.resolver.extraNodeModules = {
  'react-native': path.join(mobileModules, 'react-native'),
};

module.exports = config;
