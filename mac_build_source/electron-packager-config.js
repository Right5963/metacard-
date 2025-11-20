/**
 * electron-packager設定ファイル
 * --asar.unpackDirオプションの代わりに使用
 */

module.exports = {
    asar: {
        unpackDir: [
            'node_modules/@google',
            'node_modules/level',
            'node_modules/classic-level',
            'data/sets/sample_sets'
        ]
    }
};

