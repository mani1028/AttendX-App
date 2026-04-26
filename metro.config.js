const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Disable new architecture features and force legacy bridge mode
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  unstable_allowRequireContext: false,
  minifierConfig: {
    compress: {
      drop_console: false,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

defaultConfig.resolver = {
  ...defaultConfig.resolver,
  assetExts: [...defaultConfig.resolver.assetExts, 'db', 'ttf', 'png', 'jpg'],
};

const config = {
  resetCache: true,
};

module.exports = mergeConfig(defaultConfig, config);
