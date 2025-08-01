// Test script to verify database setup
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testDatabase() {
    console.log('🧪 Testing AO3 Ranks Backend Database...\n');
    
    try {
        // Test 1: Health check
        console.log('1. Testing health check...');
        const health = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', health.data.status);
        
        // Test 2: Create user account
        console.log('\n2. Testing user signup...');
        const timestamp = Date.now();
        const signupData = {
            username: `testuser${timestamp}`,
            email: `test${timestamp}@example.com`,
            password: 'password123'
        };
        
        const signup = await axios.post(`${BASE_URL}/api/auth/signup`, signupData);
        console.log('✅ User created successfully');
        console.log('   Token received:', signup.data.token ? '✓' : '✗');
        
        const token = signup.data.token;
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        
        // Test 3: Get user profile
        console.log('\n3. Testing user profile...');
        const profile = await axios.get(`${BASE_URL}/api/auth/profile`, authHeaders);
        console.log('✅ Profile retrieved:', profile.data.user.username);
        
        // Test 4: Get user's fic lists
        console.log('\n4. Testing fic lists...');
        const lists = await axios.get(`${BASE_URL}/api/lists/my`, authHeaders);
        console.log('✅ User lists retrieved:', lists.data.lists.length, 'lists found');
        
        // Test 5: Search public lists (should be empty)
        console.log('\n5. Testing public list search...');
        const publicLists = await axios.get(`${BASE_URL}/api/lists/public`);
        console.log('✅ Public lists search works:', publicLists.data.lists.length, 'public lists');
        
        // Test 6: Add a fic with manual data
        console.log('\n6. Testing manual fic addition...');
        const ficData = {
            listId: lists.data.lists[0].id,
            ao3Url: 'https://archiveofourown.org/works/12345',
            ficData: {
                title: 'Test Fic',
                author: 'Test Author',
                summary: 'A test fanfiction',
                wordCount: 5000,
                chapters: '1/1',
                relationships: ['Character A/Character B'],
                tags: ['Fluff', 'Romance'],
                rating: 'General Audiences',
                warnings: 'No Archive Warnings Apply',
                status: 'Complete'
            }
        };
        
        const addFic = await axios.post(`${BASE_URL}/api/fics/add`, ficData, authHeaders);
        console.log('✅ Fic added successfully');
        
        // Test 7: Get fics from the list
        console.log('\n7. Testing fic retrieval...');
        const fics = await axios.get(`${BASE_URL}/api/fics/list/${lists.data.lists[0].id}`);
        console.log('✅ Fics retrieved:', fics.data.fics.length, 'fics in list');
        
        console.log('\n🎉 All database tests passed! Your database is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run tests
testDatabase();
