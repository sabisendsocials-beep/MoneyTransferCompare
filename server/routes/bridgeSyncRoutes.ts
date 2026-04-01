/**
 * Bridge Sync Routes
 * Manual trigger endpoints for the rate bridge bulk sync.
 */
import { Router, Request, Response } from 'express';
import { runFullBridgeSync } from '../services/bridgeSyncService';

const router = Router();

/**
 * POST /api/bridge/sync/all
 * Trigger a full sync of all corridors from the bridge.
 * Returns a detailed report of what was saved.
 */
router.post('/api/bridge/sync/all', async (req: Request, res: Response) => {
  try {
    console.log('[BridgeSync] Manual sync triggered via API');
    const report = await runFullBridgeSync();
    return res.json(report);
  } catch (err: any) {
    console.error('[BridgeSync] Manual sync error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bridge/sync/status
 * Quick check — fetches GBP->NGN from bridge to confirm it's reachable.
 */
router.get('/api/bridge/sync/status', async (req: Request, res: Response) => {
  try {
    const response = await fetch(
      'https://rates.sabisendrates.com/comparison/latest?from=GBP&to=NGN',
      { signal: AbortSignal.timeout(8000) }
    );
    const json = await response.json() as { success: boolean; count: number };
    return res.json({
      bridgeReachable: response.ok && json.success,
      providerCount: json.count,
      bridgeUrl: 'https://rates.sabisendrates.com',
    });
  } catch (err: any) {
    return res.json({ bridgeReachable: false, error: err.message });
  }
});

export default router;
