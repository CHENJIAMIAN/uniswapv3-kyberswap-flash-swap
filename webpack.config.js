const path = require('path');

module.exports = {
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
};
