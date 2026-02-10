/**
 * Error handling middleware
 */

function errorHandler(err, req, res, next) {
    console.error('API Error:', err);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.message
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
            success: false,
            error: 'Conflict: Resource already exists or constraint violation'
        });
    }
    
    // Default error response
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
}

module.exports = errorHandler;
