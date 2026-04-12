const express = require('express');
const beachController = require('../controller/beach.controller');
const beachValidation = require('../validation/beach.validation');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const requireAuth = require('../middleware/requireAuth');
const authorizeRoles = require('../middleware/authorizeRoles');
const { ROLES } = require('../constants/roles');

const router = express.Router();

/**
 * @swagger
 * /beaches:
 *   post:
 *     summary: Create a new beach
 *     tags: [Beaches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *             properties:
 *               name: { type: string }
 *               location: { type: object }
 *               description: { type: string }
 *     responses:
 *       201: { description: Beach created successfully }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requireAuth,
  authorizeRoles(ROLES.ADMIN),
  validate(beachValidation.createBeach),
  beachController.createBeach
);

/**
 * @swagger
 * /beaches:
 *   get:
 *     summary: Get all beaches with pagination
 *     tags: [Beaches]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *     responses:
 *       200: { description: Beaches retrieved successfully }
 */
router.get(
  '/',
  validate(beachValidation.getBeaches),
  beachController.getBeaches
);

/**
 * @swagger
 * /beaches/severity-ranking:
 *   get:
 *     summary: Get beach severity ranking
 *     tags: [Beaches]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Severity ranking retrieved successfully }
 */
router.get(
  '/severity-ranking',
  validate(beachValidation.severityRanking),
  beachController.getSeverityRanking
);

/**
 * @swagger
 * /beaches/{beachId}:
 *   get:
 *     summary: Get beach by ID
 *     tags: [Beaches]
 *     parameters:
 *       - in: path
 *         name: beachId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Beach retrieved successfully }
 *       404: { description: Beach not found }
 */
router.get(
  '/:beachId',
  validate(beachValidation.beachId),
  beachController.getBeachById
);

/**
 * @swagger
 * /beaches/{beachId}:
 *   put:
 *     summary: Update beach
 *     tags: [Beaches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: beachId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Beach updated successfully }
 *       401: { description: Unauthorized }
 *       404: { description: Beach not found }
 */
router.put(
  '/:beachId',
  requireAuth,
  authorizeRoles(ROLES.ADMIN),
  validate(beachValidation.beachId),
  validate(beachValidation.updateBeach),
  beachController.updateBeach
);

/**
 * @swagger
 * /beaches/{beachId}:
 *   delete:
 *     summary: Delete beach
 *     tags: [Beaches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: beachId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Beach deleted successfully }
 *       401: { description: Unauthorized }
 *       404: { description: Beach not found }
 */
router.delete(
  '/:beachId',
  requireAuth,
  authorizeRoles(ROLES.ADMIN),
  validate(beachValidation.beachId),
  beachController.deleteBeach
);

module.exports = router;
