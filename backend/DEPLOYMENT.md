# AO3 Ranks - Migration-Ready Setup 🚀

Your AO3 fic recommendation site is now configured for easy server switching and deployment!

## 🔄 **Easy Server Migration**

### **Current Setup:**
- ✅ **Development**: SQLite (local)
- ✅ **Production**: PostgreSQL (any host)
- ✅ **Automatic**: Detects environment and uses appropriate database
- ✅ **Backup System**: Export/import data between any servers

### **Migration Commands:**
```bash
# Check current database status
node migrate.js check

# Create backup (do this before switching servers!)
node migrate.js backup

# Import backup to new server
node migrate.js import ./backups/ao3ranks_backup_2025-07-29.json
```

## 🚀 **Deployment Options**

### **1. Railway (Recommended)**
```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/ao3ranks.git
git push -u origin main

# 2. Connect to Railway
# - Go to railway.app
# - Connect GitHub repo
# - Add PostgreSQL database
# - Set environment variable: JWT_SECRET=your-secret-here
# - Deploy automatically!
```

### **2. Other Platforms (Heroku, DigitalOcean, etc.)**
1. Export your data: `node migrate.js backup`
2. Deploy code to new platform
3. Add PostgreSQL database
4. Set environment variables
5. Import your data: `node migrate.js import backup-file.json`

## 🛡️ **Data Safety Features**

### **Automatic Backups:**
- ✅ Export all users, lists, and fics to JSON
- ✅ Works with any database type
- ✅ Import to any server
- ✅ Version controlled and timestamped

### **Environment Flexibility:**
```javascript
// Automatically chooses database based on environment
Development: SQLite (ao3ranks.db)
Production:  PostgreSQL (DATABASE_URL)
```

## 🔧 **Environment Variables (Production)**

Set these in your hosting platform:
```bash
NODE_ENV=production
JWT_SECRET=your-super-secret-key-here
DATABASE_URL=postgresql://... (automatically provided by most hosts)
```

## 📊 **Migration Success Story**

Your current data (4 users, 5 lists, 2 fics) is backed up and ready to migrate to any server!

**Example Migration Process:**
1. `node migrate.js backup` → Creates backup file
2. Deploy to new server (Railway/Heroku/etc.)
3. `node migrate.js import backup-file.json` → Restores all data
4. **Total time: ~10 minutes, Zero data loss!**

## 🎯 **Why This Setup is Amazing**

### **Freedom to Choose:**
- Start with Railway (easiest)
- Switch to Heroku if needed
- Move to VPS later
- Always keep your data!

### **No Vendor Lock-in:**
- Standard PostgreSQL (works everywhere)
- JSON backups (readable and portable)
- Standard Node.js/Express (deploy anywhere)

### **Development Friendly:**
- SQLite for local development (no setup needed)
- PostgreSQL for production (automatic)
- Same codebase, different environments

---

**Ready to deploy?** Railway is just a few clicks away, and you can always switch later with zero data loss! 🎉
