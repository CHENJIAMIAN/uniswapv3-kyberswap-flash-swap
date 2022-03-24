const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
    devtool: 'eval-cheap-source-map',
    mode: 'development',
    devServer: {
        static: './dist',
        hot: true,
    },
    entry: './index.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader',
            },
        ],
    },
    plugins: [
        // 请确保引入这个插件！
        new VueLoaderPlugin(),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};
