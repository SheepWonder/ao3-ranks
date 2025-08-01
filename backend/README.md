# AO3 Ranks Backend

A Node.js backend server for extracting metadata from AO3 fics while respecting their terms of service.

## ⚠️ Important Notes

**Please respect AO3's terms of service:**
- This server includes rate limiting (3 seconds between requests)
- Only extract metadata for personal use
- Do not overload AO3's servers
- Consider using manual input for heavy usage

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000`

### 3. Update Frontend
Make sure your frontend is pointing to the correct API URL. In `Ao3ranks.js`, update:
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

## API Endpoints

### POST /api/extract-fic
Extract metadata from an AO3 URL.

**Request:**
```json
{
  "url": "https://archiveofourown.org/works/12345"
}
```

**Response:**
```json
{
  "url": "https://archiveofourown.org/works/12345",
  "workId": "12345",
  "title": "Fic Title",
  "author": "Author Name",
  "summary": "Fic summary...",
  "tags": ["Tag1", "Tag2"],
  "rating": "Teen And Up Audiences",
  "words": "15000",
  "chapters": "12/12",
  "dateAdded": "2025-07-28T..."
}
```

### GET /health
Check server status and queue length.

## Features

- ✅ Rate limiting to respect AO3
- ✅ Request queuing system
- ✅ Error handling
- ✅ CORS enabled for frontend
- ✅ Health monitoring
- ✅ Proper user agent headers

## Alternative: Manual Input

If you prefer not to use automated extraction, the frontend also supports manual input where users can enter fic details themselves.

## Future Enhancements

- Database storage for caching
- User authentication
- Batch processing
- More metadata extraction
- Error retry logic
