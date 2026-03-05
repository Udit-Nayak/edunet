const express = require('express');
const router = express.Router();
const mlService = require('../services/mlService');

/**
 * Suggest tags for text
 * POST /api/tags/suggest
 */
router.post('/suggest', async (req, res) => {
  try {
    const { text, threshold = 0.3, top_k = 5 } = req.body;
    
    // Validate input
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Text is required and must be a non-empty string'
      });
    }
    
    // Get tag suggestions from ML service
    const suggestions = await mlService.suggestTags(text, threshold, top_k);
    
    res.json({
      success: true,
      suggestions,
      count: suggestions.length
    });
    
  } catch (error) {
    console.error('Error suggesting tags:', error);
    
    if (error.message?.includes('not available')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Tag classifier not available. Model may need to be trained.',
        suggestions: []
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to suggest tags',
      suggestions: []
    });
  }
});

/**
 * Get all available tags
 * GET /api/tags/all
 */
router.get('/all', async (req, res) => {
  try {
    const result = await mlService.getAllTags();
    
    res.json({
      success: true,
      tags: result.tags,
      count: result.count
    });
    
  } catch (error) {
    console.error('Error getting all tags:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve tags',
      tags: []
    });
  }
});

/**
 * Get tag classifier status
 * GET /api/tags/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await mlService.getTagStatus();
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('Error getting tag status:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get tag classifier status'
    });
  }
});

/**
 * Reload tag classifier
 * POST /api/tags/reload
 */
router.post('/reload', async (req, res) => {
  try {
    const result = await mlService.reloadTagModel();
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Error reloading tag model:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reload tag classifier'
    });
  }
});

module.exports = router;
