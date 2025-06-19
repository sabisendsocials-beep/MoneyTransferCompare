/**
 * Demo of entertaining AI commentary system
 * Shows how the entertaining tone works as a USP
 */

const { generateCommentary, generatePopularCommentaries } = require('./server/services/commentaryDemo.ts');

async function demonstrateEntertainingCommentary() {
  console.log('🎭 Demonstrating Entertaining AI Commentary System');
  console.log('================================================\n');
  
  console.log('📊 Sample entertaining commentary for major currency pairs:\n');
  
  // Demo individual commentaries
  const pairs = [
    { from: 'GBP', to: 'NGN' },
    { from: 'EUR', to: 'NGN' },
    { from: 'USD', to: 'NGN' },
    { from: 'GBP', to: 'GHS' },
    { from: 'GBP', to: 'KES' }
  ];
  
  for (const pair of pairs) {
    try {
      const result = await generateCommentary(pair.from, pair.to);
      console.log(`💬 ${result.currencyPair}: "${result.commentary}"`);
      console.log(`   Generated at: ${new Date(result.timestamp).toLocaleTimeString()}\n`);
      
      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Failed to generate ${pair.from}/${pair.to}: ${error.message}\n`);
    }
  }
  
  console.log('🎯 Key Features of Entertaining Commentary:');
  console.log('• Pop culture references and metaphors');
  console.log('• Humor and personality in financial news');
  console.log('• Shareable, memorable content');
  console.log('• Still informative and actionable');
  console.log('• Unique differentiator from boring competitors\n');
  
  console.log('🚀 This entertaining tone makes SabiSend memorable and shareable!');
}

demonstrateEntertainingCommentary().catch(console.error);