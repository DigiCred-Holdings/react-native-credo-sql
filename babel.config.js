module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-typescript',
    'react-native-builder-bob/babel-preset',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
  ],
};
