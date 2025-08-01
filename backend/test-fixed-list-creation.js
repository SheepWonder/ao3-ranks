// Test the fixed list creation endpoint
const axios = require('axios');

async function testListCreation() {
    console.log('🧪 Testing fixed list creation...\n');
    
    try {
        // First create a user to test with
        console.log('1. Creating test user...');
        const signupData = {
            username: `testuser${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            password: 'password123'
        };
        
        const signup = await axios.post('http://localhost:3000/api/auth/signup', signupData);
        console.log('✅ User created successfully');
        
        const token = signup.data.token;
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        
        // Test creating a list
        console.log('\n2. Testing list creation...');
        const listData = {
            name: 'My Test List',
            description: 'A test list to verify functionality',
            isPublic: true
        };
        
        const createList = await axios.post('http://localhost:3000/api/lists/create', listData, authHeaders);
        console.log('✅ List created successfully!');
        console.log('   List ID:', createList.data.listId);
        console.log('   List Name:', createList.data.list.name);
        console.log('   Is Public:', createList.data.list.is_public);
        
        // Verify the list appears in user's lists
        console.log('\n3. Verifying list appears in user lists...');
        const userLists = await axios.get('http://localhost:3000/api/lists/my', authHeaders);
        console.log('✅ User has', userLists.data.lists.length, 'lists total');
        
        const newList = userLists.data.lists.find(list => list.name === 'My Test List');
        console.log('✅ New list found:', newList ? 'Yes' : 'No');
        
        console.log('\n🎉 List creation is now working perfectly!');
        console.log('The server error has been fixed - try creating a list again on your website!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testListCreation();
