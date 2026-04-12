const express = require('express');
const agentController = require('../controller/agent.controller');
const agentValidation = require('../validation/agent.validation');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Agents
 *   description: Beach agent management and agent portal
 */

// ── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: Register a new beach agent (admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, nic, assignedBeach]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *               nic:
 *                 type: string
 *               assignedBeach:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agent registered successfully
 *       400:
 *         description: Email or NIC already in use
 *       404:
 *         description: Beach not found or inactive
 */
router.post(
  '/',
  auth('admin'),
  validate(agentValidation.registerAgent),
  agentController.registerAgent
);

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: Get all beach agents (admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all agents
 */
router.get('/', auth('admin'), agentController.getAllAgents);

/**
 * @swagger
 * /api/agents/{agentId}:
 *   get:
 *     summary: Get a single agent by ID (admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent details
 *       404:
 *         description: Agent not found
 */
router.get(
  '/:agentId',
  auth('admin'),
  validate(agentValidation.agentId),
  agentController.getAgentById
);

/**
 * @swagger
 * /api/agents/{agentId}:
 *   delete:
 *     summary: Delete an agent (admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 */
router.delete(
  '/:agentId',
  auth('admin'),
  validate(agentValidation.agentId),
  agentController.deleteAgent
);

/**
 * @swagger
 * /api/agents/{agentId}/reassign/{beachId}:
 *   patch:
 *     summary: Reassign agent to a different beach (admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: beachId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent reassigned successfully
 *       404:
 *         description: Agent or beach not found
 */
router.patch(
  '/:agentId/reassign/:beachId',
  auth('admin'),
  validate(agentValidation.reassignAgent),
  agentController.reassignAgent
);

module.exports = router;
