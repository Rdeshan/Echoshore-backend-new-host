const express = require('express');
const wasteRecordController = require('../controller/wasteRecord.controller');
const wasteRecordValidation = require('../validation/wasteRecord.validation');
const agentValidation = require('../validation/agent.validation');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

// ── Agent Portal Routes (auth handled per-route) ──────────────────────────────

/**
 * @swagger
 * /waste-records/portal/submissions:
 *   post:
 *     summary: Submit a waste record (agent only)
 *     tags: [Waste Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plasticType, weight]
 *             properties:
 *               plasticType:
 *                 type: string
 *               weight:
 *                 type: number
 *               source:
 *                 type: string
 *               weather:
 *                 type: object
 *               collectionDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Waste record submitted successfully
 *       403:
 *         description: Not assigned to any beach
 */
router.post(
  '/portal/submissions',
  auth('agent'),
  validate(agentValidation.agentCreateWasteRecord),
  wasteRecordController.submitWasteRecord
);

/**
 * @swagger
 * /waste-records/portal/submissions:
 *   get:
 *     summary: Get own submission history (agent only)
 *     tags: [Waste Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of own submissions
 */
router.get(
  '/portal/submissions',
  auth('agent'),
  validate(agentValidation.getMySubmissions),
  wasteRecordController.getMySubmissions
);

/**
 * All remaining waste record routes require authentication
 */
router.use(auth());

/**
 * @swagger
 * /waste-records:
 *   post:
 *     summary: Create a new waste record
 *     tags: [Waste Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - beachId
 *               - plasticType
 *               - weight
 *     responses:
 *       201: { description: Waste record created successfully }
 */
router.post(
  '/',
  validate(wasteRecordValidation.createWasteRecord),
  wasteRecordController.createWasteRecord
);

/**
 * @swagger
 * /waste-records:
 *   get:
 *     summary: Get all waste records with filtering
 *     tags: [Waste Records]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: beachId
 *         schema: { type: string }
 *       - in: query
 *         name: plasticType
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Waste records retrieved successfully }
 */
router.get(
  '/',
  validate(wasteRecordValidation.getWasteRecords),
  wasteRecordController.getWasteRecords
);

/**
 * @swagger
 * /waste-records/analytics/plastic-type:
 *   get:
 *     summary: Get waste statistics by plastic type
 *     tags: [Waste Records]
 *     parameters:
 *       - in: query
 *         name: beachId
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Plastic type analytics retrieved successfully }
 */
router.get(
  '/analytics/plastic-type',
  wasteRecordController.getWasteByPlasticType
);

/**
 * @swagger
 * /waste-records/analytics/monthly-trends:
 *   get:
 *     summary: Get monthly trends
 *     tags: [Waste Records]
 *     parameters:
 *       - in: query
 *         name: beachId
 *         schema: { type: string }
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200: { description: Monthly trends retrieved successfully }
 */
router.get('/analytics/monthly-trends', wasteRecordController.getMonthlyTrends);

/**
 * @swagger
 * /waste-records/{recordId}:
 *   get:
 *     summary: Get waste record by ID
 *     tags: [Waste Records]
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Waste record retrieved successfully }
 */
router.get(
  '/:recordId',
  validate(wasteRecordValidation.recordId),
  wasteRecordController.getWasteRecordById
);

/**
 * @swagger
 * /waste-records/{recordId}:
 *   put:
 *     summary: Update waste record
 *     tags: [Waste Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Waste record updated successfully }
 */
router.put(
  '/:recordId',
  validate(wasteRecordValidation.recordId),
  validate(wasteRecordValidation.updateWasteRecord),
  wasteRecordController.updateWasteRecord
);

/**
 * @swagger
 * /waste-records/{recordId}:
 *   delete:
 *     summary: Delete waste record
 *     tags: [Waste Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Waste record deleted successfully }
 */
router.delete(
  '/:recordId',
  authorizeRoles('admin', 'agent'),
  validate(wasteRecordValidation.recordId),
  wasteRecordController.deleteWasteRecord
);

/**
 * @swagger
 * /waste-records/{recordId}/verify:
 *   patch:
 *     summary: Verify waste record
 *     tags: [Waste Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Waste record verified successfully }
 */
router.patch(
  '/:recordId/verify',
  validate(wasteRecordValidation.verifyRecord),
  wasteRecordController.verifyWasteRecord
);

module.exports = router;
