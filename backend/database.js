
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// PostgreSQL connection config from environment variables
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

async function initializeDatabase() {
  // Tables should already exist in PostgreSQL. If not, you can run migrations separately.
  console.log('PostgreSQL database connection initialized.');
}

const userQueries = {
  // Create a new user
  async createUser(username, email, password_hash) {
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      [username, email, password_hash]
    );
    return result.rows[0];
  },
  // Find user by username or email
  async findUserByCredentials(username, email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1 OR email = $2`,
      [username, email]
    );
    return result.rows[0];
  },
  // Find user by ID
  async findUserById(id) {
    const result = await pool.query(
      `SELECT id, username, email, created_at FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },
  // Update user
  async updateUser(id, username, email) {
    await pool.query(
      `UPDATE users SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [username, email, id]
    );
  }
};

const ficListQueries = {
  // Create default fic list for new user
  async createDefaultList(userId) {
    await pool.query(
      `INSERT INTO fic_lists (user_id, name, description, is_public)
       VALUES ($1, 'My Fics', 'My personal fic recommendations', FALSE)`,
      [userId]
    );
  },
  // Create a new fic list
  async createList(userId, name, description, isPublic) {
    const result = await pool.query(
      `INSERT INTO fic_lists (user_id, name, description, is_public)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, name, description, isPublic]
    );
    return result.rows[0];
  },
  // Get user's fic lists
  async getUserLists(userId) {
    const result = await pool.query(
      `SELECT fl.*, COUNT(f.id) as fic_count
       FROM fic_lists fl
       LEFT JOIN fics f ON fl.id = f.list_id
       WHERE fl.user_id = $1
       GROUP BY fl.id
       ORDER BY fl.created_at DESC`,
      [userId]
    );
    return result.rows;
  },
  // Get a specific list by ID
  async getListById(listId) {
    const result = await pool.query(
      `SELECT * FROM fic_lists WHERE id = $1`,
      [listId]
    );
    return result.rows[0];
  },
  // Get public fic lists for search
  async getPublicLists(limit) {
    const result = await pool.query(
      `SELECT fl.*, u.username as owner_username,
              COUNT(f.id) as fic_count
       FROM fic_lists fl
       JOIN users u ON fl.user_id = u.id
       LEFT JOIN fics f ON fl.id = f.list_id
       WHERE fl.is_public = TRUE
       GROUP BY fl.id, u.username
       ORDER BY fl.updated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },
  // Search public lists with relevance scoring
  async searchPublicLists(
    exactTitle, partialTitle, exactDesc, partialDesc, usernameMatch,
    whereTitle, whereDesc, whereUsername, limit
  ) {
    const result = await pool.query(
      `SELECT fl.*, u.username as owner_username,
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
         AND (fl.name LIKE $6 OR fl.description LIKE $7 OR u.username LIKE $8)
       GROUP BY fl.id, u.username
       ORDER BY relevance_score DESC, fl.updated_at DESC
       LIMIT $9`,
      [exactTitle, partialTitle, exactDesc, partialDesc, usernameMatch, whereTitle, whereDesc, whereUsername, limit]
    );
    return result.rows;
  },
  // Update list
  async updateList(id, userId, name, description, isPublic) {
    await pool.query(
      `UPDATE fic_lists SET name = $1, description = $2, is_public = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5`,
      [name, description, isPublic, id, userId]
    );
  },
  // Delete list (only if user owns it)
  async deleteList(id, userId) {
    const result = await pool.query(
      `DELETE FROM fic_lists WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return result.rowCount;
  },
  // Check if list has fics
  async getListFicCount(listId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM fics WHERE list_id = $1`,
      [listId]
    );
    return result.rows[0];
  }
};

const ficQueries = {
  // Add fic to list
  async addFic(
    listId, ao3Url, title, author, summary, wordCount, chapterCount,
    relationshipTags, additionalTags, rating, warnings, status
  ) {
    const result = await pool.query(
      `INSERT INTO fics (
        list_id, ao3_url, title, author, summary, word_count,
        chapter_count, relationship_tags, additional_tags,
        rating, warnings, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [listId, ao3Url, title, author, summary, wordCount, chapterCount, relationshipTags, additionalTags, rating, warnings, status]
    );
    return result.rows[0];
  },
  // Get fics from a list
  async getListFics(listId) {
    const result = await pool.query(
      `SELECT * FROM fics WHERE list_id = $1 ORDER BY added_at DESC`,
      [listId]
    );
    return result.rows;
  },
  // Get fic with list ownership info
  async getFicWithOwnership(ficId) {
    const result = await pool.query(
      `SELECT f.id, f.list_id, l.user_id as list_owner_id
       FROM fics f
       JOIN fic_lists l ON f.list_id = l.id
       WHERE f.id = $1`,
      [ficId]
    );
    return result.rows[0];
  },
  // Delete fic by ID
  async deleteFic(ficId) {
    const result = await pool.query(
      `DELETE FROM fics WHERE id = $1 RETURNING *`,
      [ficId]
    );
    return result.rowCount;
  },
  // Get fics from public lists for search
  async searchPublicFics(title, author, additionalTags, relationshipTags, limit) {
    const result = await pool.query(
      `SELECT f.*, fl.name as list_name, u.username as owner_username
       FROM fics f
       JOIN fic_lists fl ON f.list_id = fl.id
       JOIN users u ON fl.user_id = u.id
       WHERE fl.is_public = TRUE
         AND (f.title LIKE $1 OR f.author LIKE $2 OR f.additional_tags LIKE $3 OR f.relationship_tags LIKE $4)
       ORDER BY f.added_at DESC
       LIMIT $5`,
      [title, author, additionalTags, relationshipTags, limit]
    );
    return result.rows;
  },
  // Remove fic
  async removeFic(ficId, userId) {
    const result = await pool.query(
      `DELETE FROM fics WHERE id = $1 AND list_id IN (SELECT id FROM fic_lists WHERE user_id = $2) RETURNING *`,
      [ficId, userId]
    );
    return result.rowCount;
  }
};

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

module.exports = {
  pool,
  initializeDatabase,
  userQueries,
  ficListQueries,
  ficQueries,
  hashPassword,
  comparePassword
};
