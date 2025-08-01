<<<<<<< HEAD
# Database Setup Complete! 🎉

Your AO3 Ranks project now has a fully functional SQLite database with user authentication and fic management.

## What You Have Now

### Database Structure
- **Users Table**: Stores user accounts with encrypted passwords
- **Fic Lists Table**: Stores user-created fic lists (public/private)
- **Fics Table**: Stores individual fic metadata and links

### Authentication System
- JWT-based authentication
- Secure password hashing with bcrypt
- Protected routes for user-specific actions

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login existing user
- `GET /api/auth/profile` - Get user profile (requires login)

#### Fic Lists
- `GET /api/lists/public` - Search public fic lists
- `GET /api/lists/my` - Get your fic lists (requires login)

#### Fics
- `GET /api/fics/search` - Search fics in public lists
- `GET /api/fics/list/:listId` - Get fics from specific list
- `POST /api/fics/add` - Add fic to your list (requires login)

## How to Use

### Starting the Server
```bash
cd backend
node server.js
```

The server will start on http://localhost:3000

### Database File
Your database is stored in `backend/ao3ranks.db` - this file contains all your data.

### Environment Variables
Edit `backend/.env` to configure:
- `JWT_SECRET` - Change this for production!
- `PORT` - Server port (default: 3000)
- `JWT_EXPIRES_IN` - How long tokens last (default: 7 days)

## Next Steps

### Option 1: Connect Your Frontend
Update your `Ao3ranks.js` file to use the real API instead of localStorage:

```javascript
const API_BASE = 'http://localhost:3000/api';

async function signup(username, email, password) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    return response.json();
}
```

### Option 2: Deploy to Production
For a real website, you'll want to:
1. Use PostgreSQL instead of SQLite
2. Deploy to Heroku, Railway, or similar
3. Change JWT_SECRET to a secure random value
4. Set up HTTPS

### Option 3: Add More Features
- Email verification
- Password reset
- Fic list sharing
- User profiles
- Fic ratings/reviews

## Database Schema

### Users
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Fic Lists
```sql
CREATE TABLE fic_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Fics',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Fics
```sql
CREATE TABLE fics (
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
);
```

## Files Created
- `backend/database.js` - Database setup and queries
- `backend/server.js` - Updated with authentication routes
- `backend/.env` - Environment configuration
- `backend/package.json` - Updated dependencies
- `backend/test-database.js` - Test script

Your database is ready to use! 🚀
=======
# Database Setup Complete! 🎉

Your AO3 Ranks project now has a fully functional SQLite database with user authentication and fic management.

## What You Have Now

### Database Structure
- **Users Table**: Stores user accounts with encrypted passwords
- **Fic Lists Table**: Stores user-created fic lists (public/private)
- **Fics Table**: Stores individual fic metadata and links

### Authentication System
- JWT-based authentication
- Secure password hashing with bcrypt
- Protected routes for user-specific actions

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login existing user
- `GET /api/auth/profile` - Get user profile (requires login)

#### Fic Lists
- `GET /api/lists/public` - Search public fic lists
- `GET /api/lists/my` - Get your fic lists (requires login)

#### Fics
- `GET /api/fics/search` - Search fics in public lists
- `GET /api/fics/list/:listId` - Get fics from specific list
- `POST /api/fics/add` - Add fic to your list (requires login)

## How to Use

### Starting the Server
```bash
cd backend
node server.js
```

The server will start on http://localhost:3000

### Database File
Your database is stored in `backend/ao3ranks.db` - this file contains all your data.

### Environment Variables
Edit `backend/.env` to configure:
- `JWT_SECRET` - Change this for production!
- `PORT` - Server port (default: 3000)
- `JWT_EXPIRES_IN` - How long tokens last (default: 7 days)

## Next Steps

### Option 1: Connect Your Frontend
Update your `Ao3ranks.js` file to use the real API instead of localStorage:

```javascript
const API_BASE = 'http://localhost:3000/api';

async function signup(username, email, password) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    return response.json();
}
```

### Option 2: Deploy to Production
For a real website, you'll want to:
1. Use PostgreSQL instead of SQLite
2. Deploy to Heroku, Railway, or similar
3. Change JWT_SECRET to a secure random value
4. Set up HTTPS

### Option 3: Add More Features
- Email verification
- Password reset
- Fic list sharing
- User profiles
- Fic ratings/reviews

## Database Schema

### Users
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Fic Lists
```sql
CREATE TABLE fic_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Fics',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Fics
```sql
CREATE TABLE fics (
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
);
```

## Files Created
- `backend/database.js` - Database setup and queries
- `backend/server.js` - Updated with authentication routes
- `backend/.env` - Environment configuration
- `backend/package.json` - Updated dependencies
- `backend/test-database.js` - Test script

Your database is ready to use! 🚀
>>>>>>> 5f21733064996febd3c4e9baf43726ebe50835ed
