const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resetCache: false,
  transformer: {
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
  },
  resolver: {
    ...defaultConfig.resolver,
    assetExts: [...defaultConfig.resolver.assetExts, 'db', 'ttf', 'png', 'jpg'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs'],
    blockList: [
      /node_modules\/@giphy\/react-native-sdk\/.*/,
    ],
    extraNodeModules: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
