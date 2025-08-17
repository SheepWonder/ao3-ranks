// AO3 Fic Link Extractor and Display with Real Database Backend

// API Configuration
const API_BASE_URL = 'https://www.fanficfanatic.com';
let authToken = localStorage.getItem('authToken');

// Helper to check if a string is a valid JWT
function isValidJWT(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

// Log JWT validity on page load
console.log('authToken in localStorage:', authToken);
console.log('Is valid JWT:', isValidJWT(authToken));

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Add auth token if available
    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Wait for the page to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('AO3 Fic Organizer loaded!');
    
    // Initialize authentication
    initializeAuth();
    
    // Get the elements
    const searchBar = document.querySelector('.search-bar');
    const searchButton = document.querySelector('.search-button');
    const linkInput = document.querySelector('.link-input');
    const addButton = document.querySelector('.add-button');
    
    // Auth elements
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Character search functionality
    if (searchButton && searchBar) {
        searchButton.addEventListener('click', function() {
            performCharacterSearch();
            // Show filters after search
            const listFilters = document.getElementById('list-filters');
            if (listFilters) listFilters.style.display = 'block';
        });
        searchBar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performCharacterSearch();
                // Show filters after search
                const listFilters = document.getElementById('list-filters');
                if (listFilters) listFilters.style.display = 'block';
            }
        });
    }

    // Filter logic
    const filterRating = document.getElementById('filter-rating');
    const filterStatus = document.getElementById('filter-status');

    function applyListFilters(lists) {
        let filtered = lists;
        const rating = filterRating ? filterRating.value : 'no-filter';
        const status = filterStatus ? filterStatus.value : 'no-filter';
        if (rating !== 'no-filter') {
            filtered = filtered.filter(list => list.rating === rating);
        }
        if (status !== 'no-filter') {
            filtered = filtered.filter(list => list.status === status);
        }
        return filtered;
    }

    // Hook into wherever lists are rendered after search
    // Example: if you have a function renderLists(lists), wrap it:
    // window.renderLists = function(lists) {
    //     window.lastSearchLists = lists;
    //     const filtered = applyListFilters(lists);
    //     // ...render filtered...
    // };

    // Optionally, re-filter when dropdowns change
    [filterRating, filterStatus].forEach(sel => {
        if (sel) sel.addEventListener('change', function() {
            if (window.lastSearchLists && window.renderLists) {
                window.renderLists(applyListFilters(window.lastSearchLists));
            }
        });
    });
    
    // Link extraction functionality
    if (addButton && linkInput) {
        addButton.addEventListener('click', addFicFromLink);
        linkInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addFicFromLink();
            }
        });
    }
    
    // Auth button event listeners
    if (loginBtn) loginBtn.addEventListener('click', showLoginModal);
    if (signupBtn) signupBtn.addEventListener('click', showSignupModal);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Form submissions
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const createListForm = document.getElementById('create-list-form');
    
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (createListForm) createListForm.addEventListener('submit', handleCreateList);
    
    // List management event listeners
    const createListBtn = document.getElementById('create-list-btn');
    const dashboardCreateListBtn = document.getElementById('dashboard-create-list-btn');
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const confirmAddFicBtn = document.getElementById('confirm-add-fic');
    
    if (createListBtn) createListBtn.addEventListener('click', showCreateListModal);
    if (dashboardCreateListBtn) dashboardCreateListBtn.addEventListener('click', showCreateListModal);
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', showDashboardView);
    if (confirmAddFicBtn) confirmAddFicBtn.addEventListener('click', confirmAddFic);
    
    // Load user data if logged in
    if (isLoggedIn()) {
        // Don't automatically load a specific list, let showUserInterface handle it
        const currentUser = getCurrentUser();
        if (currentUser) {
            showUserInterface(currentUser);
        }
    }
});

// Authentication Functions
function initializeAuth() {
    const currentUser = getCurrentUser();
    if (currentUser && authToken) {
        showUserInterface(currentUser);
        // Verify token is still valid
        verifyToken();
    } else {
        showGuestInterface();
    }
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function isLoggedIn() {
    return getCurrentUser() !== null && authToken !== null;
}

async function verifyToken() {
    try {
        const response = await apiCall('/api/auth/profile');
        // Token is valid, update user info
        localStorage.setItem('currentUser', JSON.stringify(response.user));
    } catch (error) {
        console.error('Token verification failed:', error);
        logout();
    }
}

function showUserInterface(user) {
    // Hide auth buttons, show user menu
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('signup-btn').style.display = 'none';
    document.getElementById('user-menu').style.display = 'flex';
    
    const usernameDisplay = document.getElementById('username-display');
    usernameDisplay.textContent = user.username;
    
    // Make username clickable to go to profile
    usernameDisplay.style.cursor = 'pointer';
    usernameDisplay.style.textDecoration = 'underline';
    usernameDisplay.onclick = showDashboardView;
    
    // Hide guest elements and show dashboard by default
    document.getElementById('info-box').style.display = 'none';
    document.getElementById('auth-required-message').style.display = 'none';
    
    // Show dashboard by default
    showDashboardView();
}

function showDashboardView() {
    // Hide individual list view and search results, show dashboard
    document.getElementById('fic-list-section').style.display = 'none';
    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('user-dashboard-section').style.display = 'block';
    document.getElementById('info-box').style.display = 'none';
    
    // Hide add fic section when in dashboard view
    const addFicSection = document.getElementById('add-fic-section');
    if (addFicSection) {
        addFicSection.style.display = 'none';
    }
    // Hide filters when leaving search results
    const listFilters = document.getElementById('list-filters');
    if (listFilters) listFilters.style.display = 'none';
    
    // Load and display all lists as cards
    loadDashboardLists();
}

function showSearchResultsView() {
    // Hide all other views, show search results
    document.getElementById('fic-list-section').style.display = 'none';
    document.getElementById('user-dashboard-section').style.display = 'none';
    document.getElementById('info-box').style.display = 'none';
    document.getElementById('auth-required-message').style.display = 'none';
    document.getElementById('search-results-section').style.display = 'block';
    
    // Hide add fic section when showing search results
    const addFicSection = document.getElementById('add-fic-section');
    if (addFicSection) {
        addFicSection.style.display = 'none';
    }
    // Show filters only in search results view
    const listFilters = document.getElementById('list-filters');
    if (listFilters) listFilters.style.display = 'flex';
}

function showListView(listId) {
    // Hide dashboard and search results, show individual list view
    document.getElementById('user-dashboard-section').style.display = 'none';
    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('fic-list-section').style.display = 'block';
    document.getElementById('info-box').style.display = 'none';
    // Hide filters when leaving search results
    const listFilters = document.getElementById('list-filters');
    if (listFilters) listFilters.style.display = 'none';
    
    // Set the current list and load its contents
    currentListId = listId;
    loadUserLists(); // This will update the current list display
    loadSavedFics(); // This will load the fics for the current list
}

function showGuestInterface() {
    // Show auth buttons, hide user menu
    document.getElementById('login-btn').style.display = 'inline-block';
    document.getElementById('signup-btn').style.display = 'inline-block';
    document.getElementById('user-menu').style.display = 'none';
    
    // Show guest elements, hide user sections
    document.getElementById('info-box').style.display = 'block';
    document.getElementById('fic-list-section').style.display = 'none';
    document.getElementById('user-dashboard-section').style.display = 'none';
    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('auth-required-message').style.display = 'block';
    
    // Hide add fic section for guests
    const addFicSection = document.getElementById('add-fic-section');
    if (addFicSection) {
        addFicSection.style.display = 'none';
    }
    // Hide filters for guests
    const listFilters = document.getElementById('list-filters');
    if (listFilters) listFilters.style.display = 'none';
}

// Modal Functions
function showSignupModal() {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('signup-modal').style.display = 'block';
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('create-list-modal').style.display = 'none';
}

function showLoginModal() {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('login-modal').style.display = 'block';
    document.getElementById('signup-modal').style.display = 'none';
    document.getElementById('create-list-modal').style.display = 'none';
}

function showCreateListModal() {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('create-list-modal').style.display = 'block';
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('signup-modal').style.display = 'none';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('signup-modal').style.display = 'none';
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('create-list-modal').style.display = 'none';
    
    // Clear forms
    document.getElementById('signup-form').reset();
    document.getElementById('login-form').reset();
    
    const createListForm = document.getElementById('create-list-form');
    if (createListForm) createListForm.reset();
}

// Signup Handler
async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Debug: Log password and confirmPassword values before sending (remove after testing!)
    console.log('Signup password value (debug):', password);
    console.log('Signup confirmPassword value (debug):', confirmPassword);
    
    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
        
        // Call API
        const response = await apiCall('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        // Store auth token and user data
        authToken = response.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        closeModal();
        showUserInterface(response.user);
        loadSavedFics();
        displaySuccessMessage(`Welcome ${username}! Your account has been created.`);
        
    } catch (error) {
        alert(`Signup failed: ${error.message}`);
    } finally {
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        // Call API
        const response = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        // Store auth token and user data
        authToken = response.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        closeModal();
        showUserInterface(response.user);
        loadSavedFics();
        displaySuccessMessage(`Welcome back, ${response.user.username}!`);
        
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    } finally {
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
    }
}

// Logout Handler
function logout() {
    // Clear stored data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    authToken = null;
    
    showGuestInterface();
    
    // Clear fic list
    const ficList = document.getElementById('fic-list');
    if (ficList) {
        ficList.innerHTML = '<p class="empty-state">No fics added yet. Use the form above to add your first AO3 fic!</p>';
    }
    
    displaySuccessMessage('You have been logged out.');
}

// List Management Functions
let currentListId = null;

async function loadUserLists() {
    const currentUser = getCurrentUser();
    if (!currentUser || !authToken) {
        return;
    }
    
    try {
        const response = await apiCall('/api/lists/my');
        const lists = response.lists;
        
        if (lists.length > 0) {
            // If no current list is set, use the first (most recent) list
            if (!currentListId) {
                currentListId = lists[0].id;
            }
            
            // Find the current list and display its info
            const currentList = lists.find(list => list.id === currentListId) || lists[0];
            currentListId = currentList.id;
            
            // Update the UI to show current list info
            updateCurrentListDisplay(currentList);
        }
        
    } catch (error) {
        console.error('Error loading user lists:', error);
    }
}

function updateCurrentListDisplay(list) {
    const titleElement = document.getElementById('current-list-title');
    const descriptionElement = document.getElementById('current-list-description');
    
    if (titleElement) {
        titleElement.textContent = `${list.name} fic recs`;
    }
    
    if (descriptionElement) {
        if (list.description && list.description.trim()) {
            descriptionElement.textContent = list.description;
            descriptionElement.style.display = 'block';
        } else {
            descriptionElement.style.display = 'none';
        }
    }
}

async function loadDashboardLists() {
    const currentUser = getCurrentUser();
    if (!currentUser || !authToken) {
        return;
    }
    
    try {
        const response = await apiCall('/api/lists/my');
        const lists = response.lists;
        
        const listsGrid = document.getElementById('lists-grid');
        
        if (lists.length === 0) {
            listsGrid.innerHTML = '<p class="empty-state">No lists created yet. Create your first list to get started!</p>';
            return;
        }
        
        // Clear existing content
        listsGrid.innerHTML = '';
        
        // Create cards for each list
        lists.forEach(list => {
            const listCard = createListCard(list);
            listsGrid.appendChild(listCard);
        });
        
    } catch (error) {
        console.error('Error loading dashboard lists:', error);
        const listsGrid = document.getElementById('lists-grid');
        listsGrid.innerHTML = '<p class="empty-state">Error loading lists. Please try again.</p>';
    }
}

function createListCard(list) {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.addEventListener('click', (e) => {
        // Don't navigate to list if delete button was clicked
        if (e.target.classList.contains('delete-list-btn') || e.target.closest('.delete-list-btn')) {
            return;
        }
        showListView(list.id);
    });
    
    // Format the updated date
    const updatedDate = new Date(list.updated_at || list.created_at).toLocaleDateString();
    
    // Get fic count from the API response
    const ficCount = list.fic_count || 0;
    
    card.innerHTML = `
        <div class="list-card-header">
            <h4 class="list-card-title">${escapeHtml(list.name)}</h4>
            <div class="list-card-actions">
                <span class="list-card-privacy ${list.is_public ? 'public' : 'private'}">
                    ${list.is_public ? 'Public' : 'Private'}
                </span>
                <button class="delete-list-btn" onclick="event.stopPropagation(); deleteList(${list.id}, '${escapeHtml(list.name)}', ${ficCount})" title="Delete list">
                    🗑️
                </button>
            </div>
        </div>
        ${list.description ? `<p class="list-card-description">${escapeHtml(list.description)}</p>` : ''}
        <div class="list-card-stats">
            <span class="list-card-fic-count">${ficCount} ${ficCount === 1 ? 'fic' : 'fics'}</span>
            <span class="list-card-updated">Updated ${updatedDate}</span>
        </div>
    `;
    
    return card;
}

// Delete a list
async function deleteList(listId, listName, ficCount) {
    // Show confirmation dialog
    const ficWarning = ficCount > 0 ? `\n\nThis will also delete ${ficCount} ${ficCount === 1 ? 'fic' : 'fics'} in this list.` : '';
    const confirmed = confirm(`Are you sure you want to delete the list "${listName}"?${ficWarning}\n\nThis action cannot be undone.`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        // Call API to delete the list
        await apiCall(`/api/lists/${listId}`, {
            method: 'DELETE'
        });
        
        displaySuccessMessage(`List "${listName}" deleted successfully!`);
        
        // If we're currently viewing the deleted list, go back to dashboard
        if (currentListId === listId) {
            currentListId = null;
            showDashboardView();
        } else {
            // Just reload the dashboard lists
            loadDashboardLists();
        }
        
    } catch (error) {
        console.error('Error deleting list:', error);
        if (error.message.includes('You can only delete your own lists')) {
            alert('You can only delete lists you created.');
        } else {
            alert(`Failed to delete list: ${error.message}`);
        }
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function handleCreateList(e) {
    e.preventDefault();
    
    const name = document.getElementById('list-name').value.trim();
    const description = document.getElementById('list-description').value.trim();
    const rating = document.getElementById('list-rating').value;
    const status = document.getElementById('list-status').value;
    // By default, lists are public. If the private checkbox is checked, set isPublic to false.
    const isPublic = !document.getElementById('list-private').checked;

    if (!rating) {
        alert('Please select a rating for your list.');
        return;
    }
    if (!status) {
        alert('Please select a status for your list.');
        return;
    }
    
    if (!name) {
        alert('Please enter a list name');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating List...';
        submitBtn.disabled = true;
        
        // Call API to create list
        const response = await apiCall('/api/lists/create', {
            method: 'POST',
            body: JSON.stringify({ name, description, isPublic, rating, status })
        });
        
        closeModal();
        displaySuccessMessage(`List "${name}" created successfully!`);
        
        // Switch to the new list view (like opening a new page)
        currentListId = response.listId;
        showListView(currentListId);
        
        // Show a helpful message about adding fics
        const ficList = document.getElementById('fic-list');
        if (ficList) {
            ficList.innerHTML = `
                <div class="new-list-welcome">
                    <h4>🎉 Welcome to your new list: "${name}"!</h4>
                    <p>Start building your collection by adding AO3 fic links using the form above.</p>
                    <p class="empty-state">No fics added yet. Use the form above to add your first AO3 fic!</p>
                </div>
            `;
        }
        
    } catch (error) {
        alert(`Failed to create list: ${error.message}`);
    } finally {
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Create List';
        submitBtn.disabled = false;
    }
}

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
    
    // Show preview modal and fetch fic data
    await showFicPreview(url);
}

// Show fic preview modal and fetch data
async function showFicPreview(url) {
    // Show modal and loading state
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('fic-preview-modal').style.display = 'block';
    document.getElementById('signup-modal').style.display = 'none';
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('create-list-modal').style.display = 'none';
    
    // Show loading, hide other states
    document.getElementById('preview-loading').style.display = 'block';
    document.getElementById('fic-preview-data').style.display = 'none';
    document.getElementById('preview-error').style.display = 'none';
    document.getElementById('confirm-add-fic').style.display = 'none';
    
    try {
        // Fetch fic preview data
        const response = await apiCall('/api/fics/preview', {
            method: 'POST',
            body: JSON.stringify({ url })
        });
        
        // Show the fic data
        displayFicPreview(response.fic);
        
    } catch (error) {
        console.error('Error fetching fic preview:', error);
        showPreviewError(error.message);
    }
}

// Display fic preview data
function displayFicPreview(ficData) {
    // Hide loading, show data
    document.getElementById('preview-loading').style.display = 'none';
    document.getElementById('fic-preview-data').style.display = 'block';
    document.getElementById('preview-error').style.display = 'none';
    document.getElementById('confirm-add-fic').style.display = 'inline-block';
    
    // Populate data
    document.getElementById('preview-title').textContent = ficData.title;
    document.getElementById('preview-author').textContent = ficData.author;
    document.getElementById('preview-url').href = ficData.url;
    document.getElementById('preview-summary').textContent = ficData.summary || 'No summary available';
    
    // Show stats
    document.getElementById('preview-words').textContent = ficData.words ? `${ficData.words} words` : '';
    document.getElementById('preview-chapters').textContent = ficData.chapters ? `${ficData.chapters} chapters` : '';
    document.getElementById('preview-rating').textContent = ficData.rating || '';
    
    // Show tags
    const tagsContainer = document.getElementById('preview-tags-container');
    tagsContainer.innerHTML = '';
    
    if (ficData.tags && ficData.tags.length > 0) {
        ficData.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'preview-tag';
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });
    } else {
        tagsContainer.innerHTML = '<span class="preview-tag">No tags available</span>';
    }
    
    // Store fic data for confirmation
    window.previewFicData = ficData;
}

// Show preview error
function showPreviewError(errorMessage) {
    document.getElementById('preview-loading').style.display = 'none';
    document.getElementById('fic-preview-data').style.display = 'none';
    document.getElementById('preview-error').style.display = 'block';
    document.getElementById('confirm-add-fic').style.display = 'none';
    
    document.getElementById('preview-error-text').textContent = errorMessage;
}

// Close fic preview modal
function closeFicPreview() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('fic-preview-modal').style.display = 'none';
    window.previewFicData = null;
}

// Confirm and add fic to list
async function confirmAddFic() {
    if (!window.previewFicData) {
        alert('No fic data available');
        return;
    }
    
    try {
        const ficData = window.previewFicData;
        const currentUser = getCurrentUser();
        const targetListId = currentListId || userLists[0].id;
        
        // Add fic to database
        await apiCall('/api/fics/add', {
            method: 'POST',
            body: JSON.stringify({
                listId: targetListId,
                ao3Url: ficData.url,
                ficData: {
                    title: ficData.title,
                    author: ficData.author,
                    summary: ficData.summary,
                    words: ficData.words,
                    chapters: ficData.chapters,
                    rating: ficData.rating,
                    tags: ficData.tags,
                    url: ficData.url,
                    workId: ficData.workId
                }
            })
        });
        
        // Close modal
        closeFicPreview();
        
        // Clear input
        const linkInput = document.querySelector('.link-input');
        if (linkInput) linkInput.value = '';
        
        // Reload fic list
        await loadSavedFics();
        
        displaySuccessMessage('Fic added successfully!');
        
    } catch (error) {
        console.error('Error adding fic:', error);
        alert(`Failed to add fic: ${error.message}`);
    }
}

// Show manual input modal for fic details
function showManualInputModal(url) {
    const workId = url.match(/\/works\/(\d+)/)[1];
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="manual-input-overlay" style="display: flex;">
            <div class="modal" style="max-width: 500px; display: block;">
                <h2>Add Fic Details</h2>
                <p class="modal-subtitle">URL: <a href="${url}" target="_blank">AO3 Work ${workId}</a></p>
                <form id="manual-fic-form">
                    <div class="form-group">
                        <label for="manual-title">Title:</label>
                        <input type="text" id="manual-title" required placeholder="Enter fic title">
                    </div>
                    <div class="form-group">
                        <label for="manual-author">Author:</label>
                        <input type="text" id="manual-author" required placeholder="Enter author name">
                    </div>
                    <div class="form-group">
                        <label for="manual-summary">Summary:</label>
                        <textarea id="manual-summary" rows="3" placeholder="Enter fic summary"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="manual-tags">Tags (comma separated):</label>
                        <input type="text" id="manual-tags" placeholder="Romance, Angst, Complete">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="manual-words">Word Count:</label>
                            <input type="number" id="manual-words" placeholder="15000">
                        </div>
                        <div class="form-group">
                            <label for="manual-chapters">Chapters:</label>
                            <input type="text" id="manual-chapters" placeholder="12/12">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="manual-rating">Rating:</label>
                        <select id="manual-rating">
                            <option value="">Select Rating</option>
                            <option value="General Audiences">General Audiences</option>
                            <option value="Teen And Up Audiences">Teen And Up Audiences</option>
                            <option value="Mature">Mature</option>
                            <option value="Explicit">Explicit</option>
                            <option value="Not Rated">Not Rated</option>
                        </select>
                    </div>
                    <div class="modal-buttons">
                        <button type="submit" class="auth-action-btn">Add Fic</button>
                        <button type="button" class="auth-action-btn secondary" onclick="closeManualInputModal()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submission handler
    document.getElementById('manual-fic-form').addEventListener('submit', function(e) {
        e.preventDefault();
        submitManualFicData(url);
    });
}

// Submit manual fic data
function submitManualFicData(url) {
    const workId = url.match(/\/works\/(\d+)/)[1];
    
    const ficData = {
        url: url,
        workId: workId,
        title: document.getElementById('manual-title').value.trim(),
        author: document.getElementById('manual-author').value.trim(),
        summary: document.getElementById('manual-summary').value.trim() || 'No summary provided',
        tags: document.getElementById('manual-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
        rating: document.getElementById('manual-rating').value || 'Not Rated',
        words: document.getElementById('manual-words').value || 'Unknown',
        chapters: document.getElementById('manual-chapters').value || 'Unknown',
        dateAdded: new Date().toISOString()
    };
    
    // Validation
    if (!ficData.title || !ficData.author) {
        alert('Please provide at least the title and author');
        return;
    }
    
    // Save the fic
    saveFicToList(ficData);
    closeManualInputModal();
    
    // Clear the link input
    document.querySelector('.link-input').value = '';
    displaySuccessMessage('Fic added successfully!');
}

// Close manual input modal
function closeManualInputModal() {
    const modalOverlay = document.getElementById('manual-input-overlay');
    if (modalOverlay) {
        modalOverlay.remove();
    }
}

// Enhanced extract fic data with API option
async function extractFicData(url) {
    // First try API approach (if backend is available)
    try {
        const apiResponse = await tryAPIExtraction(url);
        if (apiResponse) {
            return apiResponse;
        }
    } catch (error) {
        console.log('API extraction not available, falling back to manual input');
    }
    
    // Fallback to existing simulation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const workId = url.match(/\/works\/(\d+)/)[1];
    
    const simulatedData = {
        url: url,
        workId: workId,
        title: `Sample Fic Title (Work ${workId})`,
        author: 'AuthorName',
        summary: 'This is a simulated summary. For real data, either use the manual input or set up a backend API.',
        tags: ['Demo Tag', 'Backend Needed', 'Manual Input Available'],
        rating: 'Teen And Up Audiences',
        words: Math.floor(Math.random() * 50000) + 1000,
        chapters: '1/1',
        dateAdded: new Date().toISOString()
    };
    
    return simulatedData;
}

// Try API extraction (placeholder for backend integration)
async function tryAPIExtraction(url) {
    // This is where you would call your backend API
    // Example API endpoint structure:
    
    const API_BASE_URL = 'http://localhost:3000'; // Replace with your backend URL
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/extract-fic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const ficData = await response.json();
        return ficData;
        
    } catch (error) {
        console.log('Backend API not available:', error.message);
        return null;
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

// Save fic to database via API
async function saveFicToList(ficData) {
    const currentUser = getCurrentUser();
    if (!currentUser || !authToken) {
        alert('You must be logged in to save fics');
        return;
    }
    
    try {
        // Get user's fic lists first
        const listsResponse = await apiCall('/api/lists/my');
        const userLists = listsResponse.lists;
        
        if (userLists.length === 0) {
            throw new Error('No fic lists found. Please contact support.');
        }
        
        // Use the currently selected list, or default to first list
        const targetListId = currentListId || userLists[0].id;
        const targetList = userLists.find(list => list.id === targetListId) || userLists[0];
        
        // Prepare fic data for API
        const ficForAPI = {
            listId: targetList.id,
            ao3Url: ficData.url,
            ficData: {
                title: ficData.title,
                author: ficData.author,
                summary: ficData.summary,
                wordCount: parseInt(ficData.words) || 0,
                chapters: ficData.chapters || 'Unknown',
                relationships: ficData.relationships || [],
                tags: ficData.tags || [],
                rating: ficData.rating || 'Not Rated',
                warnings: ficData.warnings?.join(', ') || 'No Archive Warnings Apply',
                status: ficData.status || 'Unknown'
            }
        };
        
        // Save via API
        await apiCall('/api/fics/add', {
            method: 'POST',
            body: JSON.stringify(ficForAPI)
        });
        
        // Reload fic list
        loadSavedFics();
        displaySuccessMessage(`Added "${ficData.title}" to your list!`);
        
    } catch (error) {
        console.error('Error saving fic:', error);
        alert(`Failed to save fic: ${error.message}`);
    }
}

// Load and display saved fics from API
async function loadSavedFics() {
    const currentUser = getCurrentUser();
    if (!currentUser || !authToken) {
        return;
    }
    
    try {
        // Get user's fic lists
        const listsResponse = await apiCall('/api/lists/my');
        const userLists = listsResponse.lists;
        
        if (userLists.length === 0) {
            // Hide add fic section when no lists exist
            const addFicSection = document.getElementById('add-fic-section');
            if (addFicSection) {
                addFicSection.style.display = 'none';
            }
            displayFicList([]);
            return;
        }
        
        // Get fics from the currently selected list, or default to first list
        const targetListId = currentListId || userLists[0].id;
        const targetList = userLists.find(list => list.id === targetListId) || userLists[0];
        
        // Update currentListId if it wasn't set
        if (!currentListId) {
            currentListId = targetList.id;
        }
        
        const ficsResponse = await apiCall(`/api/fics/list/${targetList.id}`);
        
        // Check if current user is the list owner (handle type conversion)
        const isListOwner = ficsResponse.listOwner == currentUser.id || 
                           ficsResponse.listOwner === currentUser.id ||
                           String(ficsResponse.listOwner) === String(currentUser.id);
        
        // Show/hide add fic section based on ownership
        const addFicSection = document.getElementById('add-fic-section');
        if (addFicSection) {
            addFicSection.style.display = isListOwner ? 'block' : 'none';
        }
        
        // Convert API format to display format
        const displayFics = ficsResponse.fics.map(fic => ({
            id: fic.id, // Add database ID for removal
            workId: fic.ao3_url.match(/\/works\/(\d+)/)?.[1] || 'unknown',
            url: fic.ao3_url,
            title: fic.title,
            author: fic.author,
            summary: fic.summary,
            tags: JSON.parse(fic.additional_tags || '[]'),
            relationships: JSON.parse(fic.relationship_tags || '[]'),
            rating: fic.rating,
            warnings: fic.warnings ? fic.warnings.split(', ') : [],
            words: fic.word_count || 'Unknown',
            chapters: fic.chapter_count || 'Unknown',
            status: fic.status || 'Unknown',
            dateAdded: fic.added_at,
            canRemove: isListOwner // Add ownership flag
        }));
        
        displayFicList(displayFics);
        
    } catch (error) {
        console.error('Error loading fics:', error);
        // Hide add fic section on error
        const addFicSection = document.getElementById('add-fic-section');
        if (addFicSection) {
            addFicSection.style.display = 'none';
        }
        displayFicList([]);
    }
}

// Display fic list
function displayFicList(fics) {
    const ficList = document.getElementById('fic-list');
    
    if (fics.length === 0) {
        ficList.innerHTML = '<p class="empty-state">No fics added yet. Use the form above to add your first AO3 fic!</p>';
        return;
    }
    
    ficList.innerHTML = fics.map(fic => `
        <div class="fic-item" data-work-id="${fic.workId}" data-fic-id="${fic.id || ''}" onclick="toggleFicDetails(this)">
            <div class="fic-header">
                <h4 class="fic-title">
                    <a href="${fic.url}" target="_blank" onclick="event.stopPropagation()">${fic.title}</a>
                </h4>
            </div>
            <p class="fic-author">by ${fic.author}</p>
            <p class="fic-summary">${fic.summary}</p>
            
            <!-- Collapsible detailed info -->
            <div class="fic-details" style="display: none;">
                <div class="fic-meta">
                    <span class="meta-item">📖 ${fic.words || 'Unknown'} words</span>
                    <span class="meta-item">📑 ${fic.chapters || 'Unknown'} chapters</span>
                    <span class="meta-item">⭐ ${fic.rating || 'Not Rated'}</span>
                </div>
                <div class="fic-tags">
                    ${fic.tags && fic.tags.length > 0 ? fic.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '<span class="no-tags">No tags available</span>'}
                </div>
                ${fic.canRemove ? `
                <div class="fic-actions">
                    <button class="remove-btn" onclick="event.stopPropagation(); removeFic(${fic.id})">Remove from List</button>
                </div>
                ` : ''}
            </div>
            
            <div class="fic-footer">
                <p class="date-added">Added: ${new Date(fic.dateAdded).toLocaleDateString()}</p>
                <span class="expand-indicator">Click to show details ▼</span>
            </div>
        </div>
    `).join('');
}

// Toggle fic details visibility
function toggleFicDetails(ficElement) {
    const detailsSection = ficElement.querySelector('.fic-details');
    const expandIndicator = ficElement.querySelector('.expand-indicator');
    
    if (detailsSection.style.display === 'none') {
        // Show details
        detailsSection.style.display = 'block';
        expandIndicator.textContent = 'Click to hide details ▲';
        ficElement.classList.add('expanded');
    } else {
        // Hide details
        detailsSection.style.display = 'none';
        expandIndicator.textContent = 'Click to show details ▼';
        ficElement.classList.remove('expanded');
    }
}

// Remove fic from list via API (only list owner can remove)
async function removeFic(ficId) {
    const currentUser = getCurrentUser();
    if (!currentUser || !authToken) {
        alert('You must be logged in to remove fics');
        return;
    }
    
    // Confirm removal
    if (!confirm('Are you sure you want to remove this fic from your list?')) {
        return;
    }
    
    try {
        // Call API to remove fic
        await apiCall(`/api/fics/${ficId}`, {
            method: 'DELETE'
        });
        
        displaySuccessMessage('Fic removed successfully!');
        
        // Reload fic list to reflect changes
        await loadSavedFics();
        
    } catch (error) {
        console.error('Error removing fic:', error);
        if (error.message.includes('Only the list owner')) {
            alert('You can only remove fics from lists you created.');
        } else {
            alert(`Failed to remove fic: ${error.message}`);
        }
    }
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

// Search functionality for public rec lists
async function performCharacterSearch() {
    const searchTerm = document.querySelector('.search-bar').value.trim();
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }
    console.log('Searching public rec lists for:', searchTerm);
    searchPublicRecLists(searchTerm);
}

// Search through all public fic lists using API
async function searchPublicRecLists(searchTerm) {
    // Show loading
    displaySearchLoading(searchTerm);
    
    try {
        // Search public fic lists via API (prioritized results)
        const listsResponse = await apiCall(`/api/lists/public?search=${encodeURIComponent(searchTerm)}&limit=15`);
        
        // Search public fics via API (secondary results)
        const ficsResponse = await apiCall(`/api/fics/search?query=${encodeURIComponent(searchTerm)}&limit=10`);
        
        // Format results for display - prioritize list matches
        const searchResults = [];
        
        // First, add lists that match the search term directly
        listsResponse.lists.forEach(list => {
            searchResults.push({
                type: 'list',
                username: list.owner_username,
                listName: list.name,
                listDescription: list.description,
                ficCount: list.fic_count,
                fics: [],
                totalFics: list.fic_count,
                relevanceScore: list.relevance_score || 0,
                isListMatch: true
            });
        });
        // If no results, show appropriate message
        if (searchResults.length === 0) {
            displaySearchResults(searchTerm, []);
            return;
        }
        displaySearchResults(searchTerm, searchResults);
    } catch (error) {
        console.error('Search error:', error);
        displaySearchError('Unable to search rec lists. Please try again.');
    }
}

// Create demo search results for demonstration
function createDemoSearchResults(searchTerm) {
    return [
        {
            username: "FicLover123",
            userId: "demo1",
            fics: [
                {
                    title: `${searchTerm} Adventures`,
                    author: "DemoAuthor1",
                    summary: `A fantastic story featuring ${searchTerm} in an exciting adventure filled with drama and romance.`,
                    tags: [searchTerm, "Adventure", "Romance", "Complete"],
                    url: "https://archiveofourown.org/works/demo1",
                    words: 45000,
                    chapters: "12/12",
                    rating: "Teen And Up Audiences"
                },
                {
                    title: `The ${searchTerm} Chronicles`,
                    author: "DemoAuthor2", 
                    summary: `An epic tale that explores the depths of ${searchTerm}'s character development.`,
                    tags: [searchTerm, "Character Study", "Angst", "Hurt/Comfort"],
                    url: "https://archiveofourown.org/works/demo2",
                    words: 28500,
                    chapters: "8/8",
                    rating: "Mature"
                }
            ],
            totalFics: 15
        },
        {
            username: "RecMaster",
            userId: "demo2",
            fics: [
                {
                    title: `${searchTerm}: A New Beginning`,
                    author: "DemoAuthor3",
                    summary: `A fresh take on ${searchTerm} that will leave you wanting more. Beautifully written with excellent character development.`,
                    tags: [searchTerm, "Alternative Universe", "Fluff", "Happy Ending"],
                    url: "https://archiveofourown.org/works/demo3",
                    words: 67200,
                    chapters: "20/20",
                    rating: "General Audiences"
                }
            ],
            totalFics: 8
        }
    ];
}

// Display search loading
function displaySearchLoading(searchTerm) {
    const searchSection = document.getElementById('search-results-section');
    searchSection.innerHTML = `
        <div class="search-loading">
            <div class="spinner"></div>
            <h3>Searching for "${searchTerm}"</h3>
            <p>Looking through public fic recommendation lists...</p>
        </div>
    `;
}

// Display search results
function displaySearchResults(searchTerm, results) {
    // Switch to search results view
    showSearchResultsView();
    
    const searchSection = document.getElementById('search-results-section');
    
    // Render filters inline with back button below header (direct HTML, not cloned)
    let filtersHTML = `
        <div class="list-filters-inline" style="display: flex; align-items: center; gap: 1em;">
            <label for="filter-rating">Rating:</label>
            <select id="filter-rating">
                <option value="no-filter">All Ratings</option>
                <option value="General Audiences">General Audiences</option>
                <option value="Teen And Up Audiences">Teen And Up Audiences</option>
                <option value="Mature">Mature</option>
                <option value="Explicit">Explicit</option>
                <option value="Not Rated">Not Rated</option>
            </select>
            <label for="filter-status">Status:</label>
            <select id="filter-status">
                <option value="no-filter">All Statuses</option>
                <option value="Complete">Complete</option>
                <option value="In Progress">In Progress</option>
                <option value="Unknown">Unknown</option>
            </select>
        </div>
    `;

    if (results.length === 0) {
        searchSection.innerHTML = `
            <div class="search-results-header" style="display: flex; align-items: center; gap: 1em;">
                ${authToken ? '<button class="back-to-profile-btn" onclick="showDashboardView()">← Back to My Profile</button>' : ''}
                ${filtersHTML}
            </div>
            <div class="no-results">
                <h3>No Results Found</h3>
                <p>No public fic lists match "${searchTerm}". Try a different search term!</p>
            </div>
        `;
        return;
    }

    // Separate list matches from fic matches
    const listMatches = results.filter(r => r.isListMatch);
    const ficMatches = results.filter(r => !r.isListMatch);
    const totalFics = results.reduce((total, user) => total + (user.fics ? user.fics.length : 0), 0);

    let resultsHTML = `
        <div class="search-results-header" style="display: flex; align-items: center; gap: 1em;">
            ${authToken ? '<button class="back-to-profile-btn" onclick="showDashboardView()">← Back to My Profile</button>' : ''}
            ${filtersHTML}
        </div>
        <div class="search-results-container">
    `;
    
    // Show list matches first (highest relevance)
    if (listMatches.length > 0) {
        resultsHTML += `<div class="results-section">
            <h4 class="section-title">📋 Lists matching "${searchTerm}"</h4>`;
        
        listMatches.forEach(listResult => {
            const relevanceIndicator = getRelevanceIndicator(listResult.relevanceScore);
            
            resultsHTML += `
                <div class="list-match-result">
                    <div class="list-match-header">
                        <h5 class="list-match-title">${relevanceIndicator} ${escapeHtml(listResult.listName)}</h5>
                        <span class="list-match-stats">by ${listResult.username} • ${listResult.totalFics} fics</span>
                    </div>
                    ${listResult.listDescription ? `<p class="list-match-description">${escapeHtml(listResult.listDescription)}</p>` : ''}
                </div>
            `;
        });
        
        resultsHTML += `</div>`;
    }
    
    // Show fic matches second (lower relevance)
    if (ficMatches.length > 0) {
        resultsHTML += `<div class="results-section">
            <h4 class="section-title">📚 Fics matching "${searchTerm}"</h4>`;
    
        ficMatches.forEach(userResult => {
            resultsHTML += `
                <div class="user-rec-list">
                    <div class="user-header">
                        <h5>📚 ${userResult.username}'s "${userResult.listName}"</h5>
                        <span class="user-stats">${userResult.fics.length} matching fics</span>
                    </div>
                    <div class="user-fics">
            `;
            
            userResult.fics.forEach(fic => {
                resultsHTML += `
                    <div class="public-fic-item">
                        <h6 class="fic-title">
                            <a href="${fic.url}" target="_blank">${escapeHtml(fic.title)}</a>
                        </h6>
                        <p class="fic-author">by ${escapeHtml(fic.author)}</p>
                        <p class="fic-summary">${escapeHtml(fic.summary)}</p>
                        <div class="fic-meta">
                            <span class="meta-item">📖 ${fic.words} words</span>
                            <span class="meta-item">📑 ${fic.chapters} chapters</span>
                            <span class="meta-item">⭐ ${fic.rating}</span>
                        </div>
                        <div class="fic-tags">
                            ${fic.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                `;
            });
            
            resultsHTML += `
                    </div>
                </div>
            `;
        });
        
        resultsHTML += `</div>`;
    }
    
    resultsHTML += `</div>`;
    searchSection.innerHTML = resultsHTML;
}

// Get relevance indicator based on score
function getRelevanceIndicator(score) {
    if (score >= 10) return '🎯'; // Exact title match
    if (score >= 8) return '🔍';  // Partial title match
    if (score >= 6) return '📝';  // Description match
    if (score >= 2) return '👤';  // Username match
    return '📋';                   // General match
}

// Get relevance indicator based on score
function getRelevanceIndicator(score) {
    if (score >= 10) return '🎯'; // Exact title match
    if (score >= 8) return '🔍';  // Partial title match
    if (score >= 6) return '📝';  // Description match
    if (score >= 2) return '👤';  // Username match
    return '📋';                   // General match
}

// Display search error
function displaySearchError(message) {
    const searchSection = document.getElementById('search-results-section');
    searchSection.innerHTML = `
        <div class="search-error">
            <h3>Search Error</h3>
            <p>${message}</p>
        </div>
    `;
}
