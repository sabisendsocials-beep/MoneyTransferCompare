/**
 * Fast Commentary Server - Minimal startup for AI commentary demo
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Import commentary service
let commentaryService;
(async () => {
  try {
    commentaryService = await import('./services/commentaryDemo.ts');
    console.log('Commentary service loaded successfully');
  } catch (error) {
    console.error('Failed to load commentary service:', error);
  }
})();

// AI Commentary endpoints
app.get('/api/commentary/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    
    if (!from || !to) {
      return res.status(400).json({ message: "Currency pair required" });
    }
    
    if (!commentaryService) {
      return res.status(503).json({ 
        success: false, 
        message: "Commentary service not ready" 
      });
    }
    
    const result = await commentaryService.generateCommentary(from.toUpperCase(), to.toUpperCase());
    
    res.json({ 
      success: true, 
      data: result
    });
  } catch (error) {
    console.error('Error generating commentary:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate commentary" 
    });
  }
});

// Popular pairs commentary endpoint
app.get('/api/commentary/popular', async (req, res) => {
  try {
    if (!commentaryService) {
      return res.status(503).json({ 
        success: false, 
        message: "Commentary service not ready" 
      });
    }
    
    const commentaries = await commentaryService.generatePopularCommentaries();
    
    res.json({ 
      success: true, 
      data: commentaries,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating popular commentaries:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate commentaries" 
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: "Fast commentary server is running!",
    endpoints: [
      '/api/commentary/:from/:to',
      '/api/commentary/popular'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎭 Fast Commentary Server running on port ${PORT}`);
  console.log('🚀 Ready to generate entertaining market commentary!');
  console.log('📊 Test endpoints:');
  console.log(`   GET /api/commentary/GBP/NGN`);
  console.log(`   GET /api/commentary/popular`);
});

module.exports = app;