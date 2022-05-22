const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
 
module.exports = {
    entry: './src/client/client.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        alias: {
            path: require.resolve("path-browserify"),
            three: path.resolve('./node_modules/three')
        },
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, '../../dist/client'),
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/assets' }
            ]
        })
    ]
};