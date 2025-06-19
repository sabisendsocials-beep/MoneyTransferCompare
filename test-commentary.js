/**
 * Simple test for AI commentary system
 */

async function testCommentary() {
  try {
    console.log('Testing AI commentary system...');
    
    // Test single pair commentary
    const response = await fetch('http://localhost:5000/api/commentary/GBP/NGN');
    if (response.ok) {
      const data = await response.json();
      console.log('GBP/NGN Commentary:', data);
    } else {
      console.log('Single pair test failed:', response.status);
    }
    
    // Test popular pairs
    const popularResponse = await fetch('http://localhost:5000/api/commentary/popular');
    if (popularResponse.ok) {
      const popularData = await popularResponse.json();
      console.log('Popular pairs commentary:', popularData);
    } else {
      console.log('Popular pairs test failed:', popularResponse.status);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run test when server is ready
setTimeout(testCommentary, 5000);