import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function deleteRateAlert(alertId: number): Promise<boolean> {
  try {
    const result = await pool.query('DELETE FROM rate_alerts WHERE id = $1', [alertId]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deleting rate alert:', error);
    return false;
  }
}