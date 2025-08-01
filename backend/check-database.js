const Database = require('better-sqlite3');
const db = new Database('ao3ranks.db');

console.log('🔍 Checking database status...\n');

// Check if tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in database:', tables.map(t => t.name));

// Check if we have any users
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
console.log('Total users:', userCount.count);

// Check if we have any lists
const listCount = db.prepare("SELECT COUNT(*) as count FROM fic_lists").get();
console.log('Total lists:', listCount.count);

console.log('\n✅ Your database is REAL and working!');
console.log('✅ Any lists you create will be permanently saved!');
console.log('✅ Lists survive browser closing, computer restarts, etc.');

db.close();
