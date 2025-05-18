/**
 * Direct implementation of rate verification endpoint
 * Add this to your server/routes.ts file
 */

// Rate verification endpoint
apiRouter.post("/api/verify-rate", async (req, res) => {
  try {
    const { rateId, verified } = req.body;
    
    if (!rateId) {
      return res.status(400).json({
        success: false,
        message: 'Rate ID is required'
      });
    }
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Verified status must be a boolean'
      });
    }
    
    log(`Verifying rate ${rateId} as ${verified ? 'verified' : 'unverified'}`);
    
    // Use direct SQL to update the rate for maximum reliability
    // This avoids any potential TypeScript/ORM issues
    const result = await db.execute(
      `UPDATE exchange_rates 
       SET verified = $1, timestamp = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [verified, rateId]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }
    
    return res.json({
      success: true,
      message: `Rate ${verified ? 'verified' : 'unverified'} successfully`,
      rate: result.rows[0]
    });
  } catch (error) {
    console.error(`Error verifying rate: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rate verification status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});