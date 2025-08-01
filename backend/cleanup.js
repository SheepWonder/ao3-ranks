// Database Cleanup Script - Remove Test Data
const Database = require('better-sqlite3');
const path = require('path');

async function cleanupTestData() {
    console.log('🧹 Starting database cleanup...');
    
    const dbPath = path.join(__dirname, 'ao3ranks.db');
    const db = new Database(dbPath);
    
    try {
        // First, let's see what we have
        console.log('📊 Current database contents:');
        const users = db.prepare('SELECT id, username, email FROM users').all();
        console.log('Users:', users);
        
        const lists = db.prepare('SELECT id, user_id, name, is_public FROM fic_lists').all();
        console.log('Lists:', lists);
        
        const fics = db.prepare('SELECT id, list_id, title FROM fics').all();
        console.log('Fics:', fics);
        
        // Find the real user (MissterTame)
        const realUser = users.find(u => u.username === 'MissterTame');
        if (!realUser) {
            console.log('❌ Could not find MissterTame user!');
            return;
        }
        
        console.log(`✅ Found real user: ${realUser.username} (ID: ${realUser.id})`);
        
        // Find test users (all users except MissterTame)
        const testUsers = users.filter(u => u.username !== 'MissterTame');
        console.log(`🗑️ Found ${testUsers.length} test users to remove:`, testUsers.map(u => u.username));
        
        // Delete test users (this will cascade delete their lists and fics due to foreign keys)
        let deletedUsers = 0;
        let deletedLists = 0;
        let deletedFics = 0;
        
        for (const testUser of testUsers) {
            // Count what will be deleted
            const userLists = db.prepare('SELECT COUNT(*) as count FROM fic_lists WHERE user_id = ?').get(testUser.id);
            const userFics = db.prepare('SELECT COUNT(*) as count FROM fics WHERE list_id IN (SELECT id FROM fic_lists WHERE user_id = ?)').get(testUser.id);
            
            deletedLists += userLists.count;
            deletedFics += userFics.count;
            
            console.log(`🗑️ Deleting user ${testUser.username} (${userLists.count} lists, ${userFics.count} fics)`);
            
            // Delete the user (foreign keys will cascade)
            db.prepare('DELETE FROM users WHERE id = ?').run(testUser.id);
            deletedUsers++;
        }
        
        console.log('✅ Cleanup completed!');
        console.log(`📊 Deleted: ${deletedUsers} users, ${deletedLists} lists, ${deletedFics} fics`);
        
        // Show final state
        console.log('📊 Final database state:');
        console.log('Users:', db.prepare('SELECT id, username, email FROM users').all());
        console.log('Lists:', db.prepare('SELECT id, user_id, name, is_public FROM fic_lists').all());
        console.log('Fics:', db.prepare('SELECT id, list_id, title FROM fics').all());
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        db.close();
    }
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupTestData();
}

module.exports = { cleanupTestData };
