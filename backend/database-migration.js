// Database Backup and Migration Utilities
const fs = require('fs').promises;
const path = require('path');
const dbConfig = require('./database-config');

class DatabaseMigration {
    constructor(db, queries) {
        this.db = db;
        this.queries = queries;
        this.currentConfig = dbConfig.currentConfig;
    }

    // Export all data to JSON format (migration-ready)
    async exportData() {
        console.log('📦 Starting data export...');
        
        try {
            const exportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                sourceDatabase: this.currentConfig.type,
                users: [],
                ficLists: [],
                fics: []
            };

            // Export users
            console.log('📤 Exporting users...');
            if (this.currentConfig.type === 'sqlite') {
                const users = this.db.prepare('SELECT * FROM users ORDER BY id').all();
                exportData.users = users;
            } else {
                const users = await this.queries.userQueries.getAllUsers();
                exportData.users = users;
            }

            // Export fic lists
            console.log('📤 Exporting fic lists...');
            if (this.currentConfig.type === 'sqlite') {
                const lists = this.db.prepare('SELECT * FROM fic_lists ORDER BY id').all();
                exportData.ficLists = lists;
            } else {
                const client = await this.db.connect();
                try {
                    const result = await client.query('SELECT * FROM fic_lists ORDER BY id');
                    exportData.ficLists = result.rows;
                } finally {
                    client.release();
                }
            }

            // Export fics
            console.log('📤 Exporting fics...');
            if (this.currentConfig.type === 'sqlite') {
                const fics = this.db.prepare('SELECT * FROM fics ORDER BY id').all();
                exportData.fics = fics;
            } else {
                const client = await this.db.connect();
                try {
                    const result = await client.query('SELECT * FROM fics ORDER BY id');
                    exportData.fics = result.rows;
                } finally {
                    client.release();
                }
            }

            // Save to file
            const filename = `ao3ranks_backup_${new Date().toISOString().split('T')[0]}.json`;
            const backupPath = path.join(__dirname, 'backups', filename);
            
            // Ensure backups directory exists
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            
            await fs.writeFile(backupPath, JSON.stringify(exportData, null, 2));
            
            console.log(`✅ Export completed successfully!`);
            console.log(`📁 Backup saved to: ${backupPath}`);
            console.log(`📊 Exported: ${exportData.users.length} users, ${exportData.ficLists.length} lists, ${exportData.fics.length} fics`);
            
            return {
                success: true,
                filename,
                path: backupPath,
                stats: {
                    users: exportData.users.length,
                    lists: exportData.ficLists.length,
                    fics: exportData.fics.length
                }
            };

        } catch (error) {
            console.error('❌ Export failed:', error);
            throw error;
        }
    }

    // Import data from JSON backup
    async importData(backupPath) {
        console.log('📥 Starting data import...');
        
        try {
            const data = JSON.parse(await fs.readFile(backupPath, 'utf8'));
            
            console.log(`📊 Importing: ${data.users.length} users, ${data.ficLists.length} lists, ${data.fics.length} fics`);
            console.log(`🔄 From ${data.sourceDatabase} to ${this.currentConfig.type}`);
            
            // Import users
            console.log('📥 Importing users...');
            for (const user of data.users) {
                if (this.currentConfig.type === 'sqlite') {
                    try {
                        this.queries.userQueries.createUser.run(user.username, user.email, user.password_hash);
                    } catch (err) {
                        if (!err.message.includes('UNIQUE constraint')) throw err;
                    }
                } else {
                    try {
                        await this.queries.userQueries.createUser(user.username, user.email, user.password_hash);
                    } catch (err) {
                        if (!err.message.includes('duplicate key')) throw err;
                    }
                }
            }

            // Import fic lists
            console.log('📥 Importing fic lists...');
            for (const list of data.ficLists) {
                if (this.currentConfig.type === 'sqlite') {
                    this.queries.ficListQueries.createList.run(
                        list.user_id, list.name, list.description, list.is_public
                    );
                } else {
                    await this.queries.ficListQueries.createList(
                        list.user_id, list.name, list.description, list.is_public
                    );
                }
            }

            // Import fics
            console.log('📥 Importing fics...');
            for (const fic of data.fics) {
                if (this.currentConfig.type === 'sqlite') {
                    this.queries.ficQueries.addFic.run(
                        fic.list_id, fic.ao3_url, fic.title, fic.author, fic.summary,
                        fic.word_count, fic.chapter_count, fic.relationship_tags,
                        fic.additional_tags, fic.rating, fic.warnings, fic.status
                    );
                } else {
                    await this.queries.ficQueries.addFic(
                        fic.list_id, fic.ao3_url, fic.title, fic.author, fic.summary,
                        fic.word_count, fic.chapter_count, fic.relationship_tags,
                        fic.additional_tags, fic.rating, fic.warnings, fic.status
                    );
                }
            }

            console.log('✅ Import completed successfully!');
            
            return {
                success: true,
                stats: {
                    users: data.users.length,
                    lists: data.ficLists.length,
                    fics: data.fics.length
                }
            };

        } catch (error) {
            console.error('❌ Import failed:', error);
            throw error;
        }
    }

    // Create a quick backup before any major changes
    async createQuickBackup(reason = 'manual') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `quickbackup_${reason}_${timestamp}.json`;
        
        return await this.exportData(filename);
    }
}

module.exports = DatabaseMigration;
