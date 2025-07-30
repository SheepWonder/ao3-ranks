# AO3 Ranks - Fic Recommendation Site

A secure platform for discovering and organizing AO3 fanfiction recommendations.

## Features
- 🔍 Search public fic recommendation lists
- 📚 Create and manage your own fic lists
- 🔐 Secure user authentication
- 📱 Responsive design
- 🛡️ Enterprise-level security

## Tech Stack
- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Security**: Rate limiting, input validation, helmet.js
- **Deployment**: Railway

## Environment Variables
Set these in Railway:
- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key-here`
- `DATABASE_URL` (automatically provided by Railway)

## Deployment
This project is configured for one-click deployment to Railway.
