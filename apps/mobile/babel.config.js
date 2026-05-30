module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // In npm workspaces, expo-router lives in apps/mobile/node_modules but
    // babel-preset-expo is hoisted to the repo root — so the preset's auto
    // expo-router plugin never loads. Register it explicitly here.
    plugins: [require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin],
  };
};
