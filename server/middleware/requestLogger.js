/**
 * Request logging middleware
 */

function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const timestamp = new Date().toISOString();
        const method = req.method.padEnd(6);
        const status = res.statusCode;
        const url = req.originalUrl || req.url;
        
        // Color status codes
        let statusColor = '\x1b[32m'; // Green
        if (status >= 400) statusColor = '\x1b[33m'; // Yellow
        if (status >= 500) statusColor = '\x1b[31m'; // Red
        
        console.log(
            `[${timestamp}] ${method} ${url} ${statusColor}${status}\x1b[0m ${duration}ms`
        );
    });
    
    next();
}

module.exports = requestLogger;
