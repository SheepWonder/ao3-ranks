const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'ao3ranks.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
function initializeDatabase() {
    console.log('Initializing database...');
    
    // Users table
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    // Fic lists table
    const createFicListsTable = `
        CREATE TABLE IF NOT EXISTS fic_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL DEFAULT 'My Fics',
            description TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    
    // Fics table
    const createFicsTable = `
        CREATE TABLE IF NOT EXISTS fics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL,
            ao3_url TEXT NOT NULL,
            title TEXT,
            author TEXT,
            summary TEXT,
            word_count INTEGER,
            chapter_count TEXT,
            relationship_tags TEXT, -- JSON string
            additional_tags TEXT,   -- JSON string
            rating TEXT,
            warnings TEXT,
            status TEXT,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (list_id) REFERENCES fic_lists(id) ON DELETE CASCADE
        )
    `;
    
    // Execute table creation
    db.exec(createUsersTable);
    db.exec(createFicListsTable);
    db.exec(createFicsTable);
    
    // Initialize prepared statements after tables are created
    initializeQueries();
    
    console.log('Database tables created successfully!');
}

// User management functions
let userQueries;
let ficListQueries;
let ficQueries;

// Initialize queries after tables are created
function initializeQueries() {
    userQueries = {
        // Create a new user
        createUser: db.prepare(`
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        `),
        
        // Find user by username or email
        findUserByCredentials: db.prepare(`
            SELECT * FROM users 
            WHERE username = ? OR email = ?
        `),
        
        // Find user by ID
        findUserById: db.prepare(`
            SELECT id, username, email, created_at 
            FROM users WHERE id = ?
        `),
        
        // Update user
        updateUser: db.prepare(`
            UPDATE users 
            SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `)
    };

    // Fic list management functions
    ficListQueries = {
        // Create default fic list for new user
        createDefaultList: db.prepare(`
            INSERT INTO fic_lists (user_id, name, description, is_public)
            VALUES (?, 'My Fics', 'My personal fic recommendations', FALSE)
        `),
        
        // Create a new fic list
        createList: db.prepare(`
            INSERT INTO fic_lists (user_id, name, description, is_public)
            VALUES (?, ?, ?, ?)
        `),
        
        // Get user's fic lists
        getUserLists: db.prepare(`
            SELECT fl.*, COUNT(f.id) as fic_count
            FROM fic_lists fl
            LEFT JOIN fics f ON fl.id = f.list_id
            WHERE fl.user_id = ? 
            GROUP BY fl.id
            ORDER BY fl.created_at DESC
        `),
        
        // Get a specific list by ID
        getListById: db.prepare(`
            SELECT * FROM fic_lists WHERE id = ?
        `),
        
        // Get public fic lists for search
        getPublicLists: db.prepare(`
            SELECT fl.*, u.username as owner_username,
                   COUNT(f.id) as fic_count
            FROM fic_lists fl
            JOIN users u ON fl.user_id = u.id
            LEFT JOIN fics f ON fl.id = f.list_id
            WHERE fl.is_public = TRUE
            GROUP BY fl.id
            ORDER BY fl.updated_at DESC
            LIMIT ?
        `),
        
        // Search public lists with relevance scoring
        searchPublicLists: db.prepare(`
            SELECT fl.*, u.username as owner_username,
                   COUNT(f.id) as fic_count,
                   CASE 
                       WHEN fl.name LIKE ? THEN 10
                       WHEN fl.name LIKE ? THEN 8
                       WHEN fl.description LIKE ? THEN 6
                       WHEN fl.description LIKE ? THEN 4
                       WHEN u.username LIKE ? THEN 2
                       ELSE 1
                   END as relevance_score
            FROM fic_lists fl
            JOIN users u ON fl.user_id = u.id
            LEFT JOIN fics f ON fl.id = f.list_id
            WHERE fl.is_public = TRUE 
            AND (fl.name LIKE ? OR fl.description LIKE ? OR u.username LIKE ?)
            GROUP BY fl.id
            ORDER BY relevance_score DESC, fl.updated_at DESC
            LIMIT ?
        `),
        
        // Update list
        updateList: db.prepare(`
            UPDATE fic_lists 
            SET name = ?, description = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `),
        
        // Delete list (only if user owns it)
        deleteList: db.prepare(`
            DELETE FROM fic_lists 
            WHERE id = ? AND user_id = ?
        `),
        
        // Check if list has fics
        getListFicCount: db.prepare(`
            SELECT COUNT(*) as count FROM fics WHERE list_id = ?
        `)
    };

    // Fic management functions
    ficQueries = {
        // Add fic to list
        addFic: db.prepare(`
            INSERT INTO fics (
                list_id, ao3_url, title, author, summary, word_count, 
                chapter_count, relationship_tags, additional_tags, 
                rating, warnings, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),
        
        // Get fics from a list
        getListFics: db.prepare(`
            SELECT * FROM fics 
            WHERE list_id = ? 
            ORDER BY added_at DESC
        `),
        
        // Get fic with list ownership info
        getFicWithOwnership: db.prepare(`
            SELECT f.id, f.list_id, l.user_id as list_owner_id 
            FROM fics f 
            JOIN fic_lists l ON f.list_id = l.id 
            WHERE f.id = ?
        `),
        
        // Delete fic by ID
        deleteFic: db.prepare(`
            DELETE FROM fics WHERE id = ?
        `),
        
        // Get fics from public lists for search
        searchPublicFics: db.prepare(`
            SELECT f.*, fl.name as list_name, u.username as owner_username
            FROM fics f
            JOIN fic_lists fl ON f.list_id = fl.id
            JOIN users u ON fl.user_id = u.id
            WHERE fl.is_public = TRUE
            AND (f.title LIKE ? OR f.author LIKE ? OR f.additional_tags LIKE ? OR f.relationship_tags LIKE ?)
            ORDER BY f.added_at DESC
            LIMIT ?
        `),
        
        // Remove fic
        removeFic: db.prepare(`
            DELETE FROM fics 
            WHERE id = ? AND list_id IN (
                SELECT id FROM fic_lists WHERE user_id = ?
            )
        `)
    };
}

// Helper functions
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Export everything
module.exports = {
    db,
    initializeDatabase,
    get userQueries() { return userQueries; },
    get ficListQueries() { return ficListQueries; },
    get ficQueries() { return ficQueries; },
    hashPassword,
    comparePassword
};
