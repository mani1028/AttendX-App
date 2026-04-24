const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Disable new architecture features
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  unstable_allowRequireContext: false,
  minifierConfig: {
    compress: {
      drop_console: false,
    },
  },
};

defaultConfig.resolver = {
  ...defaultConfig.resolver,
  assetExts: [...defaultConfig.resolver.assetExts, 'db', 'ttf', 'png', 'jpg'],
};

const config = {};

module.exports = mergeConfig(defaultConfig, config);
