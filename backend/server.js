const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const jwt = require('jsonwebtoken');

const DOMAIN_URL = process.env.DOMAIN_URL || 'https://www.fanficfanatic.com';
// Use Railway's private domain for internal/private connections
const PRIVATE_DOMAIN = process.env.RAILWAY_PRIVATE_DOMAIN || process.env.RAILWAY_TCP_PROXY_DOMAIN;

// Load environment variables first
require('dotenv').config({ path: __dirname + '/.env' });

// Debug: Check if JWT_SECRET is loaded
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');

// Import database functions
const database = require('./database-universal');

// Import security middleware
const security = require('./security');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from 'frontend' folder
app.use(express.static('frontend'));

// Initialize database on startup
database.initializeDatabase();

// Security Middleware (must be applied early)
app.use(security.securityHeaders);
app.use(cors(security.corsOptions));
app.use(security.generalLimiter);
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
// Trust first proxy (needed for correct rate limiting/user IP in production)
app.set('trust proxy', 1);

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Auth Routes with Security
app.post('/api/auth/signup', 
    security.authLimiter,
    security.signupValidation,
    security.handleValidationErrors,
    async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Additional password strength check
        const passwordStrength = security.checkPasswordStrength(password);
        if (!passwordStrength.isValid) {
            return res.status(400).json({ 
                error: 'Password does not meet security requirements',
                requirements: 'Password must contain at least 8 characters with uppercase, lowercase, and numbers'
            });
        }
        
        // Check if user already exists
        const existingUser = await database.findUserByUsernameOrEmail(username, email);
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        // Hash password and create user
    const passwordHash = await database.hashPassword(password);
    const newUser = await database.queries.userQueries.createUser(username, email, passwordHash);
        // Create default fic list for new user
        await database.createDefaultList(newUser.id);
        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: newUser.id, username, email }
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login',
    security.authLimiter,
    security.loginValidation,
    security.handleValidationErrors,
    async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await database.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const isValidPassword = await database.comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT token with shorter expiration
        const token = jwt.sign(
            { userId: user.id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected route to get user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    const user = await database.findUserById(req.user.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
});

// Fic List Routes
app.get('/api/lists/public', security.searchLimiter, async (req, res) => {
    try {
        const { search, limit = 20 } = req.query;
        let lists;
        if (search) {
            const exactMatch = search;
            const partialMatch = `%${search}%`;
            lists = await database.ficListQueries.searchPublicLists(exactMatch, partialMatch, exactMatch, partialMatch, partialMatch, partialMatch, partialMatch, partialMatch, parseInt(limit));
        } else {
            lists = await database.getPublicLists(parseInt(limit));
        }
        res.json({ lists });
    } catch (error) {
        console.error('Error fetching public lists:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/lists/my', authenticateToken, async (req, res) => {
    try {
        const lists = await database.getUserLists(req.user.userId);
        res.json({ lists });
    } catch (error) {
        console.error('Error fetching user lists:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/lists/create', 
    authenticateToken,
    security.listValidation,
    security.handleValidationErrors,
    async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'List name is required' });
        }
        
        if (name.length > 50) {
            return res.status(400).json({ error: 'List name must be 50 characters or less' });
        }
        
        // Create the list
        const newList = await database.createList(req.user.userId, name.trim(), description?.trim() || '', isPublic ? 1 : 0);
        res.status(201).json({
            message: 'List created successfully',
            listId: newList.id,
            list: {
                id: newList.id,
                name: name.trim(),
                description: description?.trim() || '',
                is_public: isPublic ? 1 : 0
            }
        });
        
    } catch (error) {
        console.error('Error creating list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a list (only if user owns it)
app.delete('/api/lists/:listId', authenticateToken, (req, res) => {
    async (req, res) => {
        try {
            const listId = parseInt(req.params.listId);
            const userId = req.user.userId;
            if (!listId || isNaN(listId)) {
                return res.status(400).json({ error: 'Invalid list ID' });
            }
            // First check if the list exists and belongs to the user
            const list = await database.getListById(listId);
            if (!list) {
                return res.status(404).json({ error: 'List not found' });
            }
            if (list.user_id !== userId) {
                return res.status(403).json({ error: 'You can only delete your own lists' });
            }
            // Check if the list has fics (optional warning, but we'll allow deletion)
            const ficCount = await database.getListFicCount(listId);
            // Delete the list (CASCADE will handle fics deletion)
            const deleted = await database.deleteList(listId, userId);
            if (!deleted) {
                return res.status(404).json({ error: 'List not found or already deleted' });
            }
            res.json({
                message: 'List deleted successfully',
                deletedFics: ficCount.count
            });
        } catch (error) {
            console.error('Error deleting list:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Fic Routes
app.get('/api/fics/search', security.searchLimiter, (req, res) => {
    async (req, res) => {
        try {
            const { query, limit = 20 } = req.query;
            if (!query) {
                return res.status(400).json({ error: 'Search query is required' });
            }
            const searchTerm = `%${query}%`;
            const fics = await database.searchPublicFics(searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit));
            res.json({ fics });
        } catch (error) {
            console.error('Error searching fics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.get('/api/fics/list/:listId', (req, res) => {
    async (req, res) => {
        try {
            const { listId } = req.params;
            const fics = await database.getListFics(listId);
            // Get list ownership information
            const listInfo = await database.getListById(listId);
            res.json({ 
                fics,
                listOwner: listInfo ? listInfo.user_id : null,
                listName: listInfo ? listInfo.name : null
            });
        } catch (error) {
            console.error('Error fetching list fics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.post('/api/fics/add', 
    authenticateToken,
    security.ficValidation,
    security.handleValidationErrors,
    async (req, res) => {
    try {
        const { listId, ao3Url, ficData } = req.body;
        
        if (!ao3Url) {
            return res.status(400).json({ error: 'AO3 URL is required' });
        }
        
        // Verify user owns the list
        const lists = await database.getUserLists(req.user.userId);
        const targetList = lists.find(list => list.id === listId);
        if (!targetList) {
            return res.status(403).json({ error: 'You can only add fics to your own lists' });
        }
        // Use provided fic data or try to extract from AO3
        let metadata = ficData;
        if (!metadata) {
            try {
                metadata = await queueRequest(ao3Url);
            } catch (error) {
                console.error('Failed to extract AO3 data:', error);
                return res.status(400).json({ 
                    error: 'Could not extract fic data. Please provide manually.',
                    needsManualInput: true 
                });
            }
        }
        // Add fic to database
        const newFic = await database.addFic(
            listId,
            ao3Url,
            metadata.title || 'Unknown Title',
            metadata.author || 'Unknown Author',
            metadata.summary || '',
            metadata.words || 'Unknown',
            metadata.chapters || 'Unknown',
            JSON.stringify(metadata.relationships || []),
            JSON.stringify(metadata.tags || []),
            metadata.rating || 'Not Rated',
            metadata.warnings || '',
            metadata.status || 'Unknown'
        );
        res.status(201).json({
            message: 'Fic added successfully',
            ficId: newFic.id
        });
        
    } catch (error) {
        console.error('Error adding fic:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Preview fic data without saving
app.post('/api/fics/preview', 
    authenticateToken,
    security.ficValidation,
    security.handleValidationErrors,
    async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate AO3 URL
        if (!url.includes('archiveofourown.org/works/')) {
            return res.status(400).json({ error: 'Please provide a valid AO3 work URL' });
        }
        
        // Extract fic data
        const ficData = await new Promise((resolve, reject) => {
            requestQueue.push({ url, resolve, reject });
            processQueue();
        });
        
        res.json({ fic: ficData });
        
    } catch (error) {
        console.error('Error previewing fic:', error);
        if (error.message.includes('timeout')) {
            res.status(408).json({ error: 'Request timeout - AO3 may be slow or the work may not exist' });
        } else if (error.message.includes('404')) {
            res.status(404).json({ error: 'Work not found - please check the URL' });
        } else {
            res.status(500).json({ error: 'Failed to fetch work data from AO3' });
        }
    }
});

// Remove fic from list (only list owner can remove)
app.delete('/api/fics/:ficId', authenticateToken, async (req, res) => {
    try {
        const { ficId } = req.params;
        const userId = req.user.userId; // Changed from req.user.id to req.user.userId
        
        if (!ficId) {
            return res.status(400).json({ error: 'Fic ID is required' });
        }
        
        // First, check if the fic exists and get its list info
        const ficInfo = await database.getFicWithOwnership(ficId);
        if (!ficInfo) {
            return res.status(404).json({ error: 'Fic not found' });
        }
        // Check if the current user is the owner of the list
        if (ficInfo.list_owner_id !== userId) {
            return res.status(403).json({ error: 'Only the list owner can remove fics from this list' });
        }
        // Remove the fic
        const deleted = await database.deleteFic(ficId);
        if (!deleted) {
            return res.status(404).json({ error: 'Fic not found or already deleted' });
        }
        res.json({ 
            success: true, 
            message: 'Fic removed successfully',
            removedFicId: ficId 
        });
        
    } catch (error) {
        console.error('Error removing fic:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rate limiting to respect AO3's servers
const requestQueue = [];
let isProcessing = false;
const RATE_LIMIT_DELAY = 3000; // 3 seconds between requests

// Helper function to add delay between requests
const processQueue = async () => {
    if (isProcessing || requestQueue.length === 0) return;
    
    isProcessing = true;
    const { url, resolve, reject } = requestQueue.shift();
    
    try {
        const result = await extractAO3Data(url);
        resolve(result);
    } catch (error) {
        reject(error);
    }
    
    setTimeout(() => {
        isProcessing = false;
        processQueue(); // Process next item
    }, RATE_LIMIT_DELAY);
};

// Queue requests to respect rate limits
const queueRequest = (url) => {
    return new Promise((resolve, reject) => {
        requestQueue.push({ url, resolve, reject });
        processQueue();
    });
};

// Extract data from AO3 URL
const extractAO3Data = async (url) => {
    try {
        // Add user agent to appear as a regular browser
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 10000, // 10 second timeout
        });

        const $ = cheerio.load(response.data);
        
        // Extract work metadata
        const title = $('.title.heading').first().text().trim();
        const author = $('.byline a[rel="author"]').first().text().trim();
        const summary = $('.summary .userstuff p').text().trim();
        
        // Extract stats
        const words = $('.stats .words').text().trim();
        const chapters = $('.stats .chapters').text().trim();
        const rating = $('.rating .text').text().trim();
        
        console.log('Extracted stats:', { words, chapters, rating });
        
        // Extract tags
        const tags = [];
        $('.tags .tag').each((i, elem) => {
            tags.push($(elem).text().trim());
        });
        
        // Extract work ID from URL
        const workId = url.match(/\/works\/(\d+)/)?.[1];
        
        return {
            url,
            workId,
            title: title || 'Unknown Title',
            author: author || 'Unknown Author',
            summary: summary || 'No summary available',
            tags: tags.length > 0 ? tags : ['No tags'],
            rating: rating || 'Not Rated',
            words: words || 'Unknown',
            chapters: chapters || 'Unknown',
            dateAdded: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Error extracting AO3 data:', error.message);
        throw new Error('Failed to extract fic data');
    }
};

// API Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'AO3 Ranks Backend API',
        status: 'running',
        endpoints: {
            'POST /api/extract-fic': 'Extract fic metadata from AO3 URL'
        }
    });
});

app.post('/api/extract-fic', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate AO3 URL
        const ao3Pattern = /^https?:\/\/(www\.)?archiveofourown\.org\/works\/\d+/;
        if (!ao3Pattern.test(url)) {
            return res.status(400).json({ error: 'Invalid AO3 URL' });
        }
        
        console.log(`Extracting data from: ${url}`);
        
        // Queue the request to respect rate limits
        const ficData = await queueRequest(url);
        
        res.json(ficData);
        
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to extract fic data',
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queueLength: requestQueue.length
    });
});

// Global error handler (must be last middleware)
app.use((err, req, res, next) => {
  console.error('Uncaught error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AO3 Ranks Backend running on port ${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`⚠️  Remember to respect AO3's terms of service and rate limits!`);
});

module.exports = app;
