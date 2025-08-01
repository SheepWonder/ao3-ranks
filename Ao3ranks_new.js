<<<<<<< HEAD
// AO3 Fic Link Extractor and Display

// Wait for the page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('AO3 Fic Organizer loaded!');
    
    // Get the elements
    const searchBar = document.querySelector('.search-bar');
    const searchButton = document.querySelector('.search-button');
    const linkInput = document.querySelector('.link-input');
    const addButton = document.querySelector('.add-button');
    
    // Character search functionality
    if (searchButton && searchBar) {
        searchButton.addEventListener('click', performCharacterSearch);
        searchBar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performCharacterSearch();
            }
        });
    }
    
    // Link extraction functionality
    if (addButton && linkInput) {
        addButton.addEventListener('click', addFicFromLink);
        linkInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addFicFromLink();
            }
        });
    }
    
    // Load saved fics from localStorage
    loadSavedFics();
});

// Function to add fic from AO3 link
async function addFicFromLink() {
    const linkInput = document.querySelector('.link-input');
    const url = linkInput.value.trim();
    
    if (!url) {
        alert('Please paste an AO3 link');
        return;
    }
    
    if (!isValidAO3Url(url)) {
        alert('Please enter a valid AO3 fic URL');
        return;
    }
    
    // Show loading state
    const addButton = document.querySelector('.add-button');
    const originalText = addButton.textContent;
    addButton.textContent = 'Loading...';
    addButton.disabled = true;
    
    try {
        const ficData = await extractFicData(url);
        saveFicToList(ficData);
        linkInput.value = '';
        displaySuccessMessage('Fic added successfully!');
    } catch (error) {
        console.error('Error extracting fic data:', error);
        
        // For demo, create a basic entry with the URL
        const basicFicData = createBasicFicData(url);
        saveFicToList(basicFicData);
        linkInput.value = '';
        displaySuccessMessage('Fic added with basic info');
    } finally {
        addButton.textContent = originalText;
        addButton.disabled = false;
    }
}

// Validate AO3 URL
function isValidAO3Url(url) {
    const ao3Pattern = /^https?:\/\/(www\.)?archiveofourown\.org\/works\/\d+/;
    return ao3Pattern.test(url);
}

// Extract fic data (placeholder - would need backend for full functionality)
async function extractFicData(url) {
    // This is a simulation of what the extraction would look like
    // In reality, you'd need a backend service to fetch and parse the AO3 page
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
    
    // Extract work ID from URL
    const workId = url.match(/\/works\/(\d+)/)[1];
    
    // Simulated extracted data (in reality, this would come from parsing the HTML)
    const simulatedData = {
        url: url,
        workId: workId,
        title: `Sample Fic Title (Work ${workId})`,
        author: 'AuthorName',
        summary: 'This is a simulated summary. In a real implementation, this would be extracted from the AO3 page using a backend service that respects AO3\'s terms of service.',
        tags: ['Relationship Tag', 'Character Tag', 'Additional Tag', 'Fluff', 'Angst'],
        rating: 'Teen And Up Audiences',
        warnings: ['No Archive Warnings Apply'],
        language: 'English',
        words: Math.floor(Math.random() * 50000) + 1000,
        chapters: '1/1',
        dateAdded: new Date().toISOString()
    };
    
    return simulatedData;
}

// Create basic fic data when extraction fails
function createBasicFicData(url) {
    const workId = url.match(/\/works\/(\d+)/)?.[1] || 'unknown';
    return {
        url: url,
        workId: workId,
        title: `AO3 Work ${workId}`,
        author: 'Unknown Author',
        summary: 'Click the link to view this fic on AO3. Full metadata extraction requires backend integration.',
        tags: ['Backend integration needed for full data'],
        rating: 'Not Extracted',
        warnings: ['Unknown'],
        language: 'Unknown',
        words: 'Unknown',
        chapters: 'Unknown',
        dateAdded: new Date().toISOString()
    };
}

// Save fic to local storage and display
function saveFicToList(ficData) {
    let savedFics = JSON.parse(localStorage.getItem('ao3Fics')) || [];
    
    // Check if fic already exists
    const existingIndex = savedFics.findIndex(fic => fic.url === ficData.url);
    if (existingIndex !== -1) {
        savedFics[existingIndex] = ficData; // Update existing
    } else {
        savedFics.unshift(ficData); // Add to beginning
    }
    
    localStorage.setItem('ao3Fics', JSON.stringify(savedFics));
    displayFicList(savedFics);
}

// Load and display saved fics
function loadSavedFics() {
    const savedFics = JSON.parse(localStorage.getItem('ao3Fics')) || [];
    displayFicList(savedFics);
}

// Display fic list
function displayFicList(fics) {
    const ficList = document.getElementById('fic-list');
    
    if (fics.length === 0) {
        ficList.innerHTML = '<p class="empty-state">No fics added yet. Paste an AO3 link above to get started!</p>';
        return;
    }
    
    ficList.innerHTML = fics.map(fic => `
        <div class="fic-item" data-work-id="${fic.workId}">
            <div class="fic-header">
                <h4 class="fic-title">
                    <a href="${fic.url}" target="_blank">${fic.title}</a>
                </h4>
                <button class="remove-btn" onclick="removeFic('${fic.url}')">×</button>
            </div>
            <p class="fic-author">by ${fic.author}</p>
            <p class="fic-summary">${fic.summary}</p>
            <div class="fic-meta">
                <span class="meta-item">📖 ${fic.words} words</span>
                <span class="meta-item">📑 ${fic.chapters} chapters</span>
                <span class="meta-item">⭐ ${fic.rating}</span>
            </div>
            <div class="fic-tags">
                ${fic.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <p class="date-added">Added: ${new Date(fic.dateAdded).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Remove fic from list
function removeFic(url) {
    let savedFics = JSON.parse(localStorage.getItem('ao3Fics')) || [];
    savedFics = savedFics.filter(fic => fic.url !== url);
    localStorage.setItem('ao3Fics', JSON.stringify(savedFics));
    displayFicList(savedFics);
    displaySuccessMessage('Fic removed');
}

// Display success message
function displaySuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Character search functionality (keeping existing)
function performCharacterSearch() {
    const searchTerm = document.querySelector('.search-bar').value.trim();
    if (!searchTerm) {
        alert('Please enter a character name to search');
        return;
    }
    console.log('Character search for:', searchTerm);
    // You can expand this functionality as needed
}
=======
// AO3 Fic Link Extractor and Display

// Wait for the page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('AO3 Fic Organizer loaded!');
    
    // Get the elements
    const searchBar = document.querySelector('.search-bar');
    const searchButton = document.querySelector('.search-button');
    const linkInput = document.querySelector('.link-input');
    const addButton = document.querySelector('.add-button');
    
    // Character search functionality
    if (searchButton && searchBar) {
        searchButton.addEventListener('click', performCharacterSearch);
        searchBar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performCharacterSearch();
            }
        });
    }
    
    // Link extraction functionality
    if (addButton && linkInput) {
        addButton.addEventListener('click', addFicFromLink);
        linkInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addFicFromLink();
            }
        });
    }
    
    // Load saved fics from localStorage
    loadSavedFics();
});

// Function to add fic from AO3 link
async function addFicFromLink() {
    const linkInput = document.querySelector('.link-input');
    const url = linkInput.value.trim();
    
    if (!url) {
        alert('Please paste an AO3 link');
        return;
    }
    
    if (!isValidAO3Url(url)) {
        alert('Please enter a valid AO3 fic URL');
        return;
    }
    
    // Show loading state
    const addButton = document.querySelector('.add-button');
    const originalText = addButton.textContent;
    addButton.textContent = 'Loading...';
    addButton.disabled = true;
    
    try {
        const ficData = await extractFicData(url);
        saveFicToList(ficData);
        linkInput.value = '';
        displaySuccessMessage('Fic added successfully!');
    } catch (error) {
        console.error('Error extracting fic data:', error);
        
        // For demo, create a basic entry with the URL
        const basicFicData = createBasicFicData(url);
        saveFicToList(basicFicData);
        linkInput.value = '';
        displaySuccessMessage('Fic added with basic info');
    } finally {
        addButton.textContent = originalText;
        addButton.disabled = false;
    }
}

// Validate AO3 URL
function isValidAO3Url(url) {
    const ao3Pattern = /^https?:\/\/(www\.)?archiveofourown\.org\/works\/\d+/;
    return ao3Pattern.test(url);
}

// Extract fic data (placeholder - would need backend for full functionality)
async function extractFicData(url) {
    // This is a simulation of what the extraction would look like
    // In reality, you'd need a backend service to fetch and parse the AO3 page
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
    
    // Extract work ID from URL
    const workId = url.match(/\/works\/(\d+)/)[1];
    
    // Simulated extracted data (in reality, this would come from parsing the HTML)
    const simulatedData = {
        url: url,
        workId: workId,
        title: `Sample Fic Title (Work ${workId})`,
        author: 'AuthorName',
        summary: 'This is a simulated summary. In a real implementation, this would be extracted from the AO3 page using a backend service that respects AO3\'s terms of service.',
        tags: ['Relationship Tag', 'Character Tag', 'Additional Tag', 'Fluff', 'Angst'],
        rating: 'Teen And Up Audiences',
        warnings: ['No Archive Warnings Apply'],
        language: 'English',
        words: Math.floor(Math.random() * 50000) + 1000,
        chapters: '1/1',
        dateAdded: new Date().toISOString()
    };
    
    return simulatedData;
}

// Create basic fic data when extraction fails
function createBasicFicData(url) {
    const workId = url.match(/\/works\/(\d+)/)?.[1] || 'unknown';
    return {
        url: url,
        workId: workId,
        title: `AO3 Work ${workId}`,
        author: 'Unknown Author',
        summary: 'Click the link to view this fic on AO3. Full metadata extraction requires backend integration.',
        tags: ['Backend integration needed for full data'],
        rating: 'Not Extracted',
        warnings: ['Unknown'],
        language: 'Unknown',
        words: 'Unknown',
        chapters: 'Unknown',
        dateAdded: new Date().toISOString()
    };
}

// Save fic to local storage and display
function saveFicToList(ficData) {
    let savedFics = JSON.parse(localStorage.getItem('ao3Fics')) || [];
    
    // Check if fic already exists
    const existingIndex = savedFics.findIndex(fic => fic.url === ficData.url);
    if (existingIndex !== -1) {
        savedFics[existingIndex] = ficData; // Update existing
    } else {
        savedFics.unshift(ficData); // Add to beginning
    }
    
    localStorage.setItem('ao3Fics', JSON.stringify(savedFics));
    displayFicList(savedFics);
}

// Load and display saved fics
function loadSavedFics() {
    const savedFics = JSON.parse(localStorage.getItem('ao3Fics')) || [];
    displayFicList(savedFics);
}

// Display fic list
function displayFicList(fics) {
    const ficList = document.getElementById('fic-list');
    
    if (fics.length === 0) {
        ficList.innerHTML = '<p class="empty-state">No fics added yet. Paste an AO3 link above to get started!</p>';
        return;
    }
    
    ficList.innerHTML = fics.map(fic => `
        <div class="fic-item" data-work-id="${fic.workId}">
            <div class="fic-header">
                <h4 class="fic-title">
                    <a href="${fic.url}" target="_blank">${fic.title}</a>
                </h4>
                <button class="remove-btn" onclick="removeFic('${fic.url}')">×</button>
            </div>
            <p class="fic-author">by ${fic.author}</p>
            <p class="fic-summary">${fic.summary}</p>
            <div class="fic-meta">
                <span class="meta-item">📖 ${fic.words} words</span>
                <span class="meta-item">📑 ${fic.chapters} chapters</span>
                <span class="meta-item">⭐ ${fic.rating}</span>
            </div>
            <div class="fic-tags">
                ${fic.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <p class="date-added">Added: ${new Date(fic.dateAdded).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Remove fic from list
function removeFic(url) {
    let savedFics = JSON.parse(localStorage.getItem('ao3Fics')) || [];
    savedFics = savedFics.filter(fic => fic.url !== url);
    localStorage.setItem('ao3Fics', JSON.stringify(savedFics));
    displayFicList(savedFics);
    displaySuccessMessage('Fic removed');
}

// Display success message
function displaySuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Character search functionality (keeping existing)
function performCharacterSearch() {
    const searchTerm = document.querySelector('.search-bar').value.trim();
    if (!searchTerm) {
        alert('Please enter a character name to search');
        return;
    }
    console.log('Character search for:', searchTerm);
    // You can expand this functionality as needed
}
>>>>>>> 5f21733064996febd3c4e9baf43726ebe50835ed
