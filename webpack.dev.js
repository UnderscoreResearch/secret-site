const path = require('path');

module.exports = {
    entry: {
        app: "./js/app.js"
    },
    mode: 'development',
    node: {
        fs: "empty",
        Buffer: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: [
                    path.resolve(__dirname, "js")
                ],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        chunkFilename: '[name].js'
    },
    devtool: 'source-map '
};