/**
 * Create Protected Data Backup
 * Creates comprehensive backups of all authentic Alpha Vantage datasets
 * to ensure complete recovery capability
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql, eq, and } from 'drizzle-orm';
import { writeFileSync } from 'fs';

// All currency pairs that should have Alpha Vantage protection
const PROTECTED_PAIRS = [
  ['USD', 'KES'], ['GBP', 'KES'], ['GBP', 'PKR'], ['EUR', 'KES'], ['EUR', 'PKR'],
  ['USD', 'GHS'], ['EUR', 'GHS'], ['GBP', 'GHS'], ['GBP', 'NGN'], ['EUR', 'NGN'], ['USD', 'NGN']
];

async function createBackups(): Promise<void> {
  console.log('Creating comprehensive backups of protected Alpha Vantage datasets...');
  
  const backupSummary = [];
  
  for (const [from, to] of PROTECTED_PAIRS) {
    console.log(`\nBacking up ${from}/${to}...`);
    
    // Get all Alpha Vantage data for this pair
    const data = await db.select()
      .from(rateTrends)
      .where(
        and(
          eq(rateTrends.from_currency, from),
          eq(rateTrends.to_currency, to),
          eq(rateTrends.source, 'alpha_vantage')
        )
      )
      .orderBy(rateTrends.date);
    
    if (data.length > 0) {
      // Create CSV content
      const csvHeader = 'date,from_currency,to_currency,rate,source\n';
      const csvContent = data.map(row => 
        `${row.date},${row.from_currency},${row.to_currency},${row.rate},${row.source}`
      ).join('\n');
      
      const fullCsv = csvHeader + csvContent;
      
      // Write to file
      const filename = `backup-${from}-${to}-alpha-vantage.csv`;
      writeFileSync(filename, fullCsv);
      
      console.log(`✓ Created ${filename} with ${data.length} records`);
      console.log(`  Date range: ${data[0].date} to ${data[data.length - 1].date}`);
      
      backupSummary.push({
        pair: `${from}/${to}`,
        records: data.length,
        filename,
        earliest: data[0].date,
        latest: data[data.length - 1].date
      });
    } else {
      console.log(`⚠️  No Alpha Vantage data found for ${from}/${to}`);
    }
  }
  
  // Create master backup index
  const indexContent = [
    '# Protected Alpha Vantage Data Backup Index',
    `# Created: ${new Date().toISOString()}`,
    '# Purpose: Comprehensive backup of authentic historical exchange rate data',
    '',
    'Currency Pair,Records,Filename,Earliest Date,Latest Date',
    ...backupSummary.map(item => 
      `${item.pair},${item.records},${item.filename},${item.earliest},${item.latest}`
    )
  ].join('\n');
  
  writeFileSync('backup-index.csv', indexContent);
  
  console.log('\n=== BACKUP SUMMARY ===');
  console.log(`Protected datasets backed up: ${backupSummary.length}`);
  console.log(`Total records preserved: ${backupSummary.reduce((sum, item) => sum + item.records, 0)}`);
  console.log('Master index: backup-index.csv');
  
  // Verify current protection status
  console.log('\n=== CURRENT PROTECTION STATUS ===');
  const allData = await db.execute(sql`
    SELECT from_currency, to_currency, source, COUNT(*) as count
    FROM rate_trends 
    WHERE source = 'alpha_vantage'
    GROUP BY from_currency, to_currency, source
    ORDER BY count DESC
  `);
  
  for (const row of allData.rows) {
    const count = row.count as number;
    const status = count > 2000 ? 'FULLY PROTECTED' : count > 1000 ? 'PROTECTED' : 'partial';
    console.log(`${row.from_currency}/${row.to_currency}: ${count} records (${status})`);
  }
  
  console.log('\nData protection system active - all backups created successfully');
}

createBackups().catch(console.error);