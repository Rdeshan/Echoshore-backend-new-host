const express = require('express');
const heatmapController = require('../controller/heatmap.controller');
const heatmapValidation = require('../validation/heatmap.validation');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * All heatmap routes require authentication
 */
router.use(auth());

/**
 * @swagger
 * tags:
 *   name: Heatmap
 *   description: Predictive pollution heatmap endpoints
 */

/**
 * @swagger
 * /heatmap:
 *   get:
 *     summary: Get 7-day pollution predictions for all active beaches
 *     tags: [Heatmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Heatmap predictions for all beaches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     heatmap:
 *                       type: object
 *                       properties:
 *                         predictions: { type: array }
 *                         beachCount: { type: integer }
 *                         generatedAt: { type: string, format: date-time }
 *                         fromCache: { type: boolean }
 *       401:
 *         description: Unauthorized — missing or invalid token
 */
router.get(
  '/',
  validate(heatmapValidation.getHeatmap),
  heatmapController.getHeatmap
);

/**
 * @swagger
 * /heatmap/health:
 *   get:
 *     summary: Check ML service connectivity and cache statistics
 *     tags: [Heatmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health status of heatmap services
 */
router.get('/health', heatmapController.getHealth);

/**
 * @swagger
 * /heatmap/refresh:
 *   post:
 *     summary: Force-refresh heatmap predictions cache (admin only)
 *     tags: [Heatmap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               beachId:
 *                 type: string
 *                 description: Optional — if omitted, refreshes all beaches
 *                 example: "64abc1234def5678901234ab"
 *     responses:
 *       200:
 *         description: Cache refreshed successfully
 *       403:
 *         description: Forbidden — admin role required
 */
router.post(
  '/refresh',
  auth(['admin']),
  validate(heatmapValidation.refreshCache),
  heatmapController.refreshCache
);

/**
 * @swagger
 * /heatmap/{beachId}:
 *   get:
 *     summary: Get 7-day pollution predictions for a specific beach
 *     tags: [Heatmap]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: beachId
 *         required: true
 *         schema:
 *           type: string
 *           example: "64abc1234def5678901234ab"
 *         description: MongoDB ObjectId of the beach
 *     responses:
 *       200:
 *         description: Beach-specific pollution prediction
 *       404:
 *         description: Beach not found
 */
router.get(
  '/:beachId',
  validate(heatmapValidation.getBeachPrediction),
  heatmapController.getBeachPrediction
);

module.exports = router;
