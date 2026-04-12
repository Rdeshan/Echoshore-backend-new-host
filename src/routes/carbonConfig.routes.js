const express = require('express');
const carbonConfigController = require('../controller/carbonConfig.controller');
const carbonConfigValidation = require('../validation/carbonConfig.validation');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * All carbon config routes require authentication
 */
router.use(auth());

/**
 * @swagger
 * /carbon-config/active:
 *   get:
 *     summary: Get active carbon configuration
 *     tags: [Carbon Config]
 *     responses:
 *       200: { description: Active configuration retrieved successfully }
 */
router.get('/active', carbonConfigController.getActiveConfig);

/**
 * @swagger
 * /carbon-config:
 *   post:
 *     summary: Create new carbon configuration
 *     tags: [Carbon Config]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emissionFactor
 *               - name
 *     responses:
 *       201: { description: Configuration created successfully }
 */
router.post(
  '/',
  validate(carbonConfigValidation.createConfig),
  carbonConfigController.createConfig
);

/**
 * @swagger
 * /carbon-config:
 *   get:
 *     summary: Get all configurations with pagination
 *     tags: [Carbon Config]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Configurations retrieved successfully }
 */
router.get(
  '/',
  validate(carbonConfigValidation.getConfigs),
  carbonConfigController.getConfigs
);

/**
 * @swagger
 * /carbon-config/{configId}:
 *   get:
 *     summary: Get configuration by ID
 *     tags: [Carbon Config]
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Configuration retrieved successfully }
 */
router.get(
  '/:configId',
  validate(carbonConfigValidation.configId),
  carbonConfigController.getConfigById
);

/**
 * @swagger
 * /carbon-config/{configId}:
 *   put:
 *     summary: Update configuration
 *     tags: [Carbon Config]
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Configuration updated successfully }
 */
router.put(
  '/:configId',
  validate(carbonConfigValidation.configId),
  validate(carbonConfigValidation.updateConfig),
  carbonConfigController.updateConfig
);

/**
 * @swagger
 * /carbon-config/{configId}/activate:
 *   patch:
 *     summary: Activate configuration
 *     tags: [Carbon Config]
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Configuration activated successfully }
 */
router.patch(
  '/:configId/activate',
  validate(carbonConfigValidation.activateConfig),
  carbonConfigController.activateConfig
);

/**
 * @swagger
 * /carbon-config/reset/default:
 *   post:
 *     summary: Reset to default configuration
 *     tags: [Carbon Config]
 *     responses:
 *       200: { description: Reset to default successful }
 */
router.post('/reset/default', carbonConfigController.resetToDefault);

/**
 * @swagger
 * /carbon-config/{configId}:
 *   delete:
 *     summary: Delete configuration
 *     tags: [Carbon Config]
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Configuration deleted successfully }
 */
router.delete(
  '/:configId',
  validate(carbonConfigValidation.configId),
  carbonConfigController.deleteConfig
);

module.exports = router;
