/**
 * Export Rate History to CSV
 * Creates comprehensive CSV exports of all rate trend data for offline analysis
 */

import { db } from './server/db';
import { rateTrends } from './shared/schema';
import { sql } from 'drizzle-orm';
import { writeFileSync } from 'fs';

async function exportAllRateHistory(): Promise<void> {
  console.log('Exporting all rate history data to CSV...');
  
  // Get all rate trend data ordered by currency pair and date
  const allData = await db.select()
    .from(rateTrends)
    .orderBy(
      sql`from_currency, to_currency, date`
    );
  
  console.log(`Retrieved ${allData.length} total records for export`);
  
  // Create comprehensive CSV with all data
  const csvHeader = 'date,from_currency,to_currency,rate,source,currency_pair\n';
  const csvContent = allData.map(row => {
    const source = row.source || 'unknown';
    const pair = `${row.from_currency}/${row.to_currency}`;
    return `${row.date},${row.from_currency},${row.to_currency},${row.rate},${source},${pair}`;
  }).join('\n');
  
  const fullCsv = csvHeader + csvContent;
  
  // Write main export file
  writeFileSync('rate-history-complete.csv', fullCsv);
  console.log('✓ Created rate-history-complete.csv');
  
  // Create separate exports for each currency pair
  const pairGroups = new Map<string, any[]>();
  
  allData.forEach(row => {
    const pair = `${row.from_currency}-${row.to_currency}`;
    if (!pairGroups.has(pair)) {
      pairGroups.set(pair, []);
    }
    pairGroups.get(pair)!.push(row);
  });
  
  console.log(`\nCreating individual exports for ${pairGroups.size} currency pairs...`);
  
  for (const [pair, data] of pairGroups.entries()) {
    const pairCsvContent = data.map(row => {
      const source = row.source || 'unknown';
      return `${row.date},${row.from_currency},${row.to_currency},${row.rate},${source}`;
    }).join('\n');
    
    const pairCsv = csvHeader + pairCsvContent;
    const filename = `rate-history-${pair}.csv`;
    
    writeFileSync(filename, pairCsv);
    console.log(`✓ Created ${filename} (${data.length} records)`);
  }
  
  // Create Alpha Vantage only export
  const alphaVantageData = allData.filter(row => row.source === 'alpha_vantage');
  if (alphaVantageData.length > 0) {
    const alphaCsvContent = alphaVantageData.map(row => {
      const pair = `${row.from_currency}/${row.to_currency}`;
      return `${row.date},${row.from_currency},${row.to_currency},${row.rate},${row.source},${pair}`;
    }).join('\n');
    
    const alphaCsv = csvHeader + alphaCsvContent;
    writeFileSync('rate-history-alpha-vantage-only.csv', alphaCsv);
    console.log(`✓ Created rate-history-alpha-vantage-only.csv (${alphaVantageData.length} records)`);
  }
  
  // Create summary statistics
  const summary = await db.execute(sql`
    SELECT 
      from_currency || '/' || to_currency as currency_pair,
      COUNT(*) as total_records,
      COALESCE(source, 'unknown') as source_type,
      MIN(date) as earliest_date,
      MAX(date) as latest_date,
      MIN(rate) as min_rate,
      MAX(rate) as max_rate,
      AVG(rate) as avg_rate
    FROM rate_trends 
    GROUP BY from_currency, to_currency, COALESCE(source, 'unknown')
    ORDER BY from_currency, to_currency, source_type
  `);
  
  const summaryHeader = 'currency_pair,total_records,source_type,earliest_date,latest_date,min_rate,max_rate,avg_rate\n';
  const summaryContent = summary.rows.map(row => 
    `${row.currency_pair},${row.total_records},${row.source_type},${row.earliest_date},${row.latest_date},${row.min_rate},${row.max_rate},${row.avg_rate}`
  ).join('\n');
  
  const summaryCsv = summaryHeader + summaryContent;
  writeFileSync('rate-history-summary.csv', summaryCsv);
  console.log('✓ Created rate-history-summary.csv');
  
  // Create export index
  const indexContent = [
    '# Rate History Export Index',
    `# Export Date: ${new Date().toISOString()}`,
    `# Total Records: ${allData.length}`,
    `# Currency Pairs: ${pairGroups.size}`,
    `# Alpha Vantage Records: ${alphaVantageData.length}`,
    '',
    'File,Description,Records',
    `rate-history-complete.csv,All rate history data,${allData.length}`,
    `rate-history-alpha-vantage-only.csv,Alpha Vantage data only,${alphaVantageData.length}`,
    'rate-history-summary.csv,Statistical summary by pair and source,N/A',
    '',
    '# Individual Currency Pair Files:',
    ...Array.from(pairGroups.entries()).map(([pair, data]) => 
      `rate-history-${pair}.csv,${pair.replace('-', '/')} rate history,${data.length}`
    )
  ].join('\n');
  
  writeFileSync('export-index.txt', indexContent);
  console.log('✓ Created export-index.txt');
  
  console.log('\n=== EXPORT SUMMARY ===');
  console.log(`Total records exported: ${allData.length}`);
  console.log(`Currency pairs: ${pairGroups.size}`);
  console.log(`Alpha Vantage protected records: ${alphaVantageData.length}`);
  console.log(`Files created: ${pairGroups.size + 4}`);
  
  console.log('\n=== FILES CREATED ===');
  console.log('• rate-history-complete.csv - All data');
  console.log('• rate-history-alpha-vantage-only.csv - Protected datasets only');
  console.log('• rate-history-summary.csv - Statistical analysis');
  console.log('• export-index.txt - File descriptions');
  console.log('• Individual pair files: rate-history-[PAIR].csv');
  
  console.log('\nAll exports ready for offline analysis');
}

exportAllRateHistory().catch(console.error);