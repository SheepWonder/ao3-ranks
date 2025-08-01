// Universal Database Module - Works with SQLite and PostgreSQL
const bcrypt = require('bcrypt');
const dbConfig = require('./database-config');

let db;
let queries;

// Initialize database based on environment
async function initializeDatabase() {
    const { currentConfig, isProduction } = dbConfig;
    
    console.log(`🔧 Initializing ${currentConfig.type} database (${isProduction ? 'production' : 'development'})...`);
    
    if (currentConfig.type === 'sqlite') {
        // SQLite setup (development)
        const Database = require('better-sqlite3');
        db = new Database(currentConfig.database);
        db.pragma('foreign_keys = ON');
        
        await createTables();
        initializeSQLiteQueries();
        
    } else if (currentConfig.type === 'postgresql') {
        // PostgreSQL setup (production)
        const { Pool } = require('pg');
        
        db = new Pool({
            connectionString: currentConfig.connectionString,
            ssl: currentConfig.options.ssl
        });
        
        // Test connection
        try {
            const client = await db.connect();
            console.log('✅ PostgreSQL connection established');
            client.release();
        } catch (err) {
            console.error('❌ PostgreSQL connection failed:', err);
            throw err;
        }
        
        await createTables();
        initializePostgreSQLQueries();
    }
    
    console.log('✅ Database initialized successfully!');
    return db;
}

// Create tables (works for both databases)
async function createTables() {
    const { currentConfig } = dbConfig;
    
    // SQL that works for both SQLite and PostgreSQL
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id ${currentConfig.type === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    const createFicListsTable = `
        CREATE TABLE IF NOT EXISTS fic_lists (
            id ${currentConfig.type === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL DEFAULT 'My Fics',
            description TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    
    const createFicsTable = `
        CREATE TABLE IF NOT EXISTS fics (
            id ${currentConfig.type === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
            list_id INTEGER NOT NULL,
            ao3_url TEXT NOT NULL,
            title TEXT,
            author TEXT,
            summary TEXT,
            word_count INTEGER,
            chapter_count TEXT,
            relationship_tags TEXT,
            additional_tags TEXT,
            rating TEXT,
            warnings TEXT,
            status TEXT,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (list_id) REFERENCES fic_lists(id) ON DELETE CASCADE
        )
    `;
    
    if (currentConfig.type === 'sqlite') {
        db.exec(createUsersTable);
        db.exec(createFicListsTable);
        db.exec(createFicsTable);
    } else {
        const client = await db.connect();
        try {
            await client.query(createUsersTable);
            await client.query(createFicListsTable);
            await client.query(createFicsTable);
        } finally {
            client.release();
        }
    }
}

// SQLite queries (existing format)
function initializeSQLiteQueries() {
    queries = {
        userQueries: {
            createUser: db.prepare(`
                INSERT INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            `),
            findUserByCredentials: db.prepare(`
                SELECT * FROM users 
                WHERE username = ? OR email = ?
            `),
            findUserById: db.prepare(`
                SELECT id, username, email, created_at 
                FROM users WHERE id = ?
            `),
            updateUser: db.prepare(`
                UPDATE users 
                SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `)
        },
        
        ficListQueries: {
            createDefaultList: db.prepare(`
                INSERT INTO fic_lists (user_id, name, description, is_public)
                VALUES (?, 'My Fics', 'My personal fic recommendations', FALSE)
            `),
            createList: db.prepare(`
                INSERT INTO fic_lists (user_id, name, description, is_public)
                VALUES (?, ?, ?, ?)
            `),
            getUserLists: db.prepare(`
                SELECT fl.*, COUNT(f.id) as fic_count
                FROM fic_lists fl
                LEFT JOIN fics f ON fl.id = f.list_id
                WHERE fl.user_id = ? 
                GROUP BY fl.id
                ORDER BY fl.created_at DESC
            `),
            getListById: db.prepare(`
                SELECT * FROM fic_lists WHERE id = ?
            `),
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
            updateList: db.prepare(`
                UPDATE fic_lists 
                SET name = ?, description = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `),
            deleteList: db.prepare(`
                DELETE FROM fic_lists 
                WHERE id = ? AND user_id = ?
            `),
            getListFicCount: db.prepare(`
                SELECT COUNT(*) as count FROM fics WHERE list_id = ?
            `)
        },
        
        ficQueries: {
            addFic: db.prepare(`
                INSERT INTO fics (
                    list_id, ao3_url, title, author, summary, word_count, 
                    chapter_count, relationship_tags, additional_tags, 
                    rating, warnings, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),
            getListFics: db.prepare(`
                SELECT * FROM fics 
                WHERE list_id = ? 
                ORDER BY added_at DESC
            `),
            getFicWithOwnership: db.prepare(`
                SELECT f.id, f.list_id, l.user_id as list_owner_id 
                FROM fics f 
                JOIN fic_lists l ON f.list_id = l.id 
                WHERE f.id = ?
            `),
            deleteFic: db.prepare(`
                DELETE FROM fics WHERE id = ?
            `),
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
            removeFic: db.prepare(`
                DELETE FROM fics 
                WHERE id = ? AND list_id IN (
                    SELECT id FROM fic_lists WHERE user_id = ?
                )
            `)
        }
    };
}

// PostgreSQL queries (async format)
function initializePostgreSQLQueries() {
    queries = {
        userQueries: {
            async createUser(username, email, passwordHash) {
                const client = await db.connect();
                try {
                    const result = await client.query(
                        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                        [username, email, passwordHash]
                    );
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async findUserByCredentials(identifier) {
                const client = await db.connect();
                try {
                    const result = await client.query(
                        'SELECT * FROM users WHERE username = $1 OR email = $1',
                        [identifier]
                    );
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async findUserById(id) {
                const client = await db.connect();
                try {
                    const result = await client.query(
                        'SELECT id, username, email, created_at FROM users WHERE id = $1',
                        [id]
                    );
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async updateUser(username, email, id) {
                const client = await db.connect();
                try {
                    const result = await client.query(
                        'UPDATE users SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                        [username, email, id]
                    );
                    return result.rowCount > 0;
                } finally {
                    client.release();
                }
            }
        },
        
        ficListQueries: {
            async createDefaultList(userId) {
                const client = await db.connect();
                try {
                    const result = await client.query(
                        'INSERT INTO fic_lists (user_id, name, description, is_public) VALUES ($1, $2, $3, $4) RETURNING id',
                        [userId, 'My Fics', 'My personal fic recommendations', false]
                    );
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async createList(userId, name, description, isPublic) {
                const client = await db.connect();
                try {
                    const result = await client.query(
                        'INSERT INTO fic_lists (user_id, name, description, is_public) VALUES ($1, $2, $3, $4) RETURNING id',
                        [userId, name, description, isPublic]
                    );
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async getUserLists(userId) {
                const client = await db.connect();
                try {
                    const result = await client.query(`
                        SELECT fl.*, COUNT(f.id) as fic_count
                        FROM fic_lists fl
                        LEFT JOIN fics f ON fl.id = f.list_id
                        WHERE fl.user_id = $1 
                        GROUP BY fl.id
                        ORDER BY fl.created_at DESC
                    `, [userId]);
                    return result.rows;
                } finally {
                    client.release();
                }
            },
            
            async getListById(id) {
                const client = await db.connect();
                try {
                    const result = await client.query('SELECT * FROM fic_lists WHERE id = $1', [id]);
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async getPublicLists(limit) {
                const client = await db.connect();
                try {
                    const result = await client.query(`
                        SELECT fl.*, u.username as owner_username,
                               COUNT(f.id) as fic_count
                        FROM fic_lists fl
                        JOIN users u ON fl.user_id = u.id
                        LEFT JOIN fics f ON fl.id = f.list_id
                        WHERE fl.is_public = TRUE
                        GROUP BY fl.id, u.username
                        ORDER BY fl.updated_at DESC
                        LIMIT $1
                    `, [limit]);
                    return result.rows;
                } finally {
                    client.release();
                }
            },
            
            async searchPublicLists(exactMatch, startsMatch, descExact, descStarts, userMatch, searchTerm, limit) {
                const client = await db.connect();
                try {
                    const result = await client.query(`
                        SELECT fl.*, u.username as owner_username,
                               COUNT(f.id) as fic_count,
                               CASE 
                                   WHEN fl.name LIKE $1 THEN 10
                                   WHEN fl.name LIKE $2 THEN 8
                                   WHEN fl.description LIKE $3 THEN 6
                                   WHEN fl.description LIKE $4 THEN 4
                                   WHEN u.username LIKE $5 THEN 2
                                   ELSE 1
                               END as relevance_score
                        FROM fic_lists fl
                        JOIN users u ON fl.user_id = u.id
                        LEFT JOIN fics f ON fl.id = f.list_id
                        WHERE fl.is_public = TRUE 
                        AND (fl.name LIKE $6 OR fl.description LIKE $6 OR u.username LIKE $6)
                        GROUP BY fl.id, u.username
                        ORDER BY relevance_score DESC, fl.updated_at DESC
                        LIMIT $7
                    `, [exactMatch, startsMatch, descExact, descStarts, userMatch, searchTerm, limit]);
                    return result.rows;
                } finally {
                    client.release();
                }
            },
            
            async updateList(name, description, isPublic, id, userId) {
                const client = await db.connect();
                try {
                    const result = await client.query(
                        'UPDATE fic_lists SET name = $1, description = $2, is_public = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5',
                        [name, description, isPublic, id, userId]
                    );
                    return result.rowCount > 0;
                } finally {
                    client.release();
                }
            },
            
            async deleteList(id, userId) {
                const client = await db.connect();
                try {
                    const result = await client.query('DELETE FROM fic_lists WHERE id = $1 AND user_id = $2', [id, userId]);
                    return result.rowCount > 0;
                } finally {
                    client.release();
                }
            },
            
            async getListFicCount(listId) {
                const client = await db.connect();
                try {
                    const result = await client.query('SELECT COUNT(*) as count FROM fics WHERE list_id = $1', [listId]);
                    return result.rows[0];
                } finally {
                    client.release();
                }
            }
        },
        
        ficQueries: {
            async addFic(listId, ao3Url, title, author, summary, wordCount, chapterCount, relationshipTags, additionalTags, rating, warnings, status) {
                const client = await db.connect();
                try {
                    const result = await client.query(`
                        INSERT INTO fics (
                            list_id, ao3_url, title, author, summary, word_count, 
                            chapter_count, relationship_tags, additional_tags, 
                            rating, warnings, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
                    `, [listId, ao3Url, title, author, summary, wordCount, chapterCount, relationshipTags, additionalTags, rating, warnings, status]);
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async getListFics(listId) {
                const client = await db.connect();
                try {
                    const result = await client.query('SELECT * FROM fics WHERE list_id = $1 ORDER BY added_at DESC', [listId]);
                    return result.rows;
                } finally {
                    client.release();
                }
            },
            
            async getFicWithOwnership(ficId) {
                const client = await db.connect();
                try {
                    const result = await client.query(`
                        SELECT f.id, f.list_id, l.user_id as list_owner_id 
                        FROM fics f 
                        JOIN fic_lists l ON f.list_id = l.id 
                        WHERE f.id = $1
                    `, [ficId]);
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            
            async deleteFic(ficId) {
                const client = await db.connect();
                try {
                    const result = await client.query('DELETE FROM fics WHERE id = $1', [ficId]);
                    return result.rowCount > 0;
                } finally {
                    client.release();
                }
            },
            
            async searchPublicFics(searchTerm, limit) {
                const client = await db.connect();
                try {
                    const result = await client.query(`
                        SELECT f.*, fl.name as list_name, u.username as owner_username
                        FROM fics f
                        JOIN fic_lists fl ON f.list_id = fl.id
                        JOIN users u ON fl.user_id = u.id
                        WHERE fl.is_public = TRUE
                        AND (f.title LIKE $1 OR f.author LIKE $1 OR f.additional_tags LIKE $1 OR f.relationship_tags LIKE $1)
                        ORDER BY f.added_at DESC
                        LIMIT $2
                    `, [searchTerm, limit]);
                    return result.rows;
                } finally {
                    client.release();
                }
            },
            
            async removeFic(ficId, userId) {
                const client = await db.connect();
                try {
                    const result = await client.query(`
                        DELETE FROM fics 
                        WHERE id = $1 AND list_id IN (
                            SELECT id FROM fic_lists WHERE user_id = $2
                        )
                    `, [ficId, userId]);
                    return result.rowCount > 0;
                } finally {
                    client.release();
                }
            }
        }
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
    initializeDatabase,
    get db() { return db; },
    get queries() { return queries; },
    hashPassword,
    comparePassword,
    
    // Migration helpers
    async exportData() {
        // Will implement backup/export functionality
        console.log('📦 Exporting data for migration...');
    },
    
    async importData(data) {
        // Will implement data import functionality
        console.log('📥 Importing data from backup...');
    }
};
