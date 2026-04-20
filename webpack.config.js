const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      // Platform content scripts — one per domain family
      'content-x': './src/content/platforms/x/index.ts',
      // Future platforms (uncomment as implemented):
      // 'content-substack': './src/content/platforms/substack/index.ts',
      // 'content-medium':   './src/content/platforms/medium/index.ts',
      // 'content-reddit':   './src/content/platforms/reddit/index.ts',
      // 'content-youtube':  './src/content/platforms/youtube/index.ts',
      background: './src/background/index.ts',
      popup: './src/popup/index.ts',
      options: './src/options/index.ts',
      welcome: './src/welcome/index.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'public', to: '.' },
          { from: 'src/popup/popup.html', to: 'popup.html' },
          { from: 'src/options/options.html', to: 'options.html' },
          { from: 'src/welcome/welcome.html', to: 'welcome.html' },
        ],
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],
    devtool: isProduction ? false : 'cheap-module-source-map',
  };
};
