/**
 * Skip Alpha Vantage startup to focus on AI commentary demonstration
 */

const fs = require('fs');

// Temporarily disable Alpha Vantage daily increment to prevent startup delays
const serverIndexPath = './server/index.ts';

if (fs.existsSync(serverIndexPath)) {
  let content = fs.readFileSync(serverIndexPath, 'utf8');
  
  // Comment out the daily increment scheduler that's causing delays
  content = content.replace(
    /await setupDailyIncrementScheduler\(\);/g,
    '// await setupDailyIncrementScheduler(); // Temporarily disabled for AI commentary demo'
  );
  
  fs.writeFileSync(serverIndexPath, content);
  console.log('✅ Temporarily disabled Alpha Vantage startup for faster AI commentary demo');
} else {
  console.log('❌ Server index file not found');
}

console.log('🎭 Ready to showcase entertaining AI commentary system!');