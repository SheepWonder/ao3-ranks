// Migration Script - Easy Server Switching
const path = require('path');
const DatabaseMigration = require('./database-migration');

async function runMigration() {
    console.log('🚀 AO3 Ranks Database Migration Tool');
    console.log('=====================================');
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (!command) {
        console.log(`
Usage:
  node migrate.js backup                    - Create a backup of current data
  node migrate.js import <backup-file>      - Import data from backup file
  node migrate.js check                     - Check database status

Examples:
  node migrate.js backup
  node migrate.js import ./backups/ao3ranks_backup_2025-07-29.json
  node migrate.js check
        `);
        return;
    }

    try {
        // Initialize database (will use appropriate type based on environment)
        const dbModule = require('./database-universal');
        await dbModule.initializeDatabase();
        
        const migration = new DatabaseMigration(dbModule.db, dbModule.queries);
        
        switch (command) {
            case 'backup':
                console.log('🔄 Creating backup...');
                const result = await migration.exportData();
                console.log(`✅ Backup created: ${result.filename}`);
                console.log(`📊 Stats: ${result.stats.users} users, ${result.stats.lists} lists, ${result.stats.fics} fics`);
                break;
                
            case 'import':
                const backupFile = args[1];
                if (!backupFile) {
                    console.error('❌ Please specify a backup file to import');
                    return;
                }
                
                console.log(`🔄 Importing from: ${backupFile}`);
                const importResult = await migration.importData(backupFile);
                console.log(`✅ Import completed: ${importResult.stats.users} users, ${importResult.stats.lists} lists, ${importResult.stats.fics} fics`);
                break;
                
            case 'check':
                const dbConfig = require('./database-config');
                const info = dbConfig.getConnectionInfo();
                console.log(`📊 Database Status:`);
                console.log(`   Environment: ${info.environment}`);
                console.log(`   Type: ${info.type}`);
                console.log(`   Ready: ${info.ready ? '✅' : '❌'}`);
                
                if (info.type === 'postgresql' && !process.env.DATABASE_URL) {
                    console.log(`⚠️  Missing DATABASE_URL environment variable for PostgreSQL`);
                }
                break;
                
            default:
                console.error(`❌ Unknown command: ${command}`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
