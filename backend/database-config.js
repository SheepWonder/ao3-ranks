// Database Configuration - Migration Ready Setup
const path = require('path');

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Database configuration
const config = {
    development: {
        type: 'sqlite',
        database: path.join(__dirname, 'ao3ranks.db'),
        options: {
            // SQLite specific options
            verbose: console.log
        }
    },
    production: {
        type: 'postgresql',
        connectionString: process.env.DATABASE_URL,
        options: {
            // PostgreSQL specific options
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        }
    }
};

// Get current environment config
const currentConfig = isProduction ? config.production : config.development;

// Export configuration
module.exports = {
    config,
    currentConfig,
    isProduction,
    isDevelopment,
    
    // Helper function to get connection info
    getConnectionInfo() {
        return {
            environment: isProduction ? 'production' : 'development',
            type: currentConfig.type,
            ready: currentConfig.type === 'sqlite' || !!process.env.DATABASE_URL
        };
    },
    
    // Backup configuration
    backup: {
        enabled: true,
        frequency: 'daily', // For production
        retention: '30d'    // Keep backups for 30 days
    }
};
