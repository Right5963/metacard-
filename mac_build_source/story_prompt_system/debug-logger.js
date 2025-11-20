// デバッグログをファイルに出力
(function() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const logs = [];
    
    console.log = function(...args) {
        logs.push({ type: 'log', time: new Date().toISOString(), args: args });
        originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
        logs.push({ type: 'error', time: new Date().toISOString(), args: args });
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        logs.push({ type: 'warn', time: new Date().toISOString(), args: args });
        originalWarn.apply(console, args);
    };
    
    // 5秒後にログをダンプ
    setTimeout(() => {
        console.log('========== DEBUG LOG DUMP ==========');
        console.log(JSON.stringify(logs, null, 2));
        console.log('====================================');
    }, 5000);
})();

