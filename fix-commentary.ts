/**
 * Quick fix for commentary system to ensure natural conversational tone
 */

import { promises as fs } from 'fs';

async function fixCommentarySystem() {
  const filePath = 'server/services/commentaryDemo.ts';
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Replace the overly complex fallback system with simple, natural commentary
    const updatedContent = content.replace(
      /\/\*\*\s*\n\s*\* Generate natural, conversational fallback commentary when AI is unavailable[\s\S]*?return fallbacks\[Math\.floor\(Math\.random\(\) \* fallbacks\.length\)\] \|\|\s*`\${data\.bestProvider} is offering competitive \${data\.currencyPair} rates today\.`;/,
      `/**
 * Generate natural, conversational fallback commentary when AI is unavailable
 */
function generateEntertainingFallback(data: MarketData): string {
  const isGbpNgn = data.currencyPair === 'GBP/NGN';
  
  if (isGbpNgn) {
    // Pidgin English for GBP/NGN
    const pidginOptions = [
      \`Pound wey dey strong today, \${data.bestProvider} no come play with rates!\`,
      \`See as \${data.bestProvider} dey compete - na good news for people wey dey send money.\`,
      \`This \${Math.abs(data.changePercent).toFixed(1)}% movement no be small thing for transfers.\`,
      \`\${data.bestProvider} show say them serious about giving better rates today.\`
    ];
    return pidginOptions[Math.floor(Math.random() * pidginOptions.length)];
  }
  
  // Natural conversation for other pairs
  const conversationalOptions = [
    \`\${data.bestProvider} is really stepping up their game today with competitive rates.\`,
    \`Good news for transfers - \${data.bestProvider} is offering solid value on \${data.currencyPair}.\`,
    \`This \${Math.abs(data.changePercent).toFixed(1)}% movement could mean better deals for money transfers.\`,
    \`Rate competition is heating up, and \${data.bestProvider} is leading the charge.\`
  ];
  return conversationalOptions[Math.floor(Math.random() * conversationalOptions.length)];`
    );
    
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log('✓ Fixed commentary system for natural conversational tone');
    
  } catch (error) {
    console.error('Error fixing commentary system:', error);
  }
}

fixCommentarySystem().catch(console.error);