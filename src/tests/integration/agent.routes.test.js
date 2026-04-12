const request = require('supertest');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const setupTestApp = require('../setup/testApp');
const mongoose = require('mongoose');
const { Beach, User } = require('../../models');

// Mock Auth Middleware
jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
  req.user = { id: '60d21b4667d0d8992e610c85', role: 'admin' };
  next();
});
jest.mock(
  '../../middleware/authorizeRoles',
  () => () => (req, res, next) => next()
);
jest.mock('../../middleware/auth', () => () => (req, res, next) => next());

const agentRouter = require('../../routes/agent.routes');
const app = setupTestApp(agentRouter, '/api/agents');

describe('Agent API Integration Tests', () => {
  let createdBeachId;
  let createdAgentId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('POST /api/agents (Register Agent)', () => {
    it('should register a new agent successfully', async () => {
      // Create a beach first
      const beach = await Beach.create({
        name: 'Test Beach for Agent Registration',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });
      createdBeachId = beach._id;

      const agentData = {
        email: 'newagent@test.com',
        password: 'Test@12345',
        name: 'New Test Agent',
        nic: 'NIC-001-001',
        assignedBeach: createdBeachId.toString(),
      };

      const response = await request(app).post('/api/agents').send(agentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Beach agent registered successfully');
      expect(response.body.data.agent).toBeDefined();
      expect(response.body.data.agent.email).toBe('newagent@test.com');
      expect(response.body.data.agent.role).toBe('agent');

      createdAgentId = response.body.data.agent.id;
    });

    it('should not register agent with duplicate email', async () => {
      const beach = await Beach.create({
        name: 'Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      // Create first agent
      await User.create({
        email: 'duplicate@test.com',
        password: 'hashedPassword',
        name: 'First Agent',
        nic: 'NIC-DUP-001',
        role: 'agent',
        assignedBeach: beach._id,
      });

      const agentData = {
        email: 'duplicate@test.com',
        password: 'Test@12345',
        name: 'Second Agent',
        nic: 'NIC-DUP-002',
        assignedBeach: beach._id.toString(),
      };

      const response = await request(app).post('/api/agents').send(agentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already in use');
    });

    it('should not register agent with duplicate NIC', async () => {
      const beach = await Beach.create({
        name: 'Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      // Create first agent
      await User.create({
        email: 'agent1@test.com',
        password: 'hashedPassword',
        name: 'First Agent',
        nic: 'NIC-DUP-NIC',
        role: 'agent',
        assignedBeach: beach._id,
      });

      const agentData = {
        email: 'agent2@test.com',
        password: 'Test@12345',
        name: 'Second Agent',
        nic: 'NIC-DUP-NIC',
        assignedBeach: beach._id.toString(),
      };

      const response = await request(app).post('/api/agents').send(agentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('NIC already registered');
    });

    it('should not register agent to non-existent beach', async () => {
      const nonExistentBeachId = new mongoose.Types.ObjectId();

      const agentData = {
        email: 'agent@test.com',
        password: 'Test@12345',
        name: 'Test Agent',
        nic: 'NIC-NEW-001',
        assignedBeach: nonExistentBeachId.toString(),
      };

      const response = await request(app).post('/api/agents').send(agentData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Beach not found or inactive');
    });

    it('should not register agent to inactive beach', async () => {
      const beach = await Beach.create({
        name: 'Inactive Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: false,
      });

      const agentData = {
        email: 'agent@test.com',
        password: 'Test@12345',
        name: 'Test Agent',
        nic: 'NIC-NEW-001',
        assignedBeach: beach._id.toString(),
      };

      const response = await request(app).post('/api/agents').send(agentData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Beach not found or inactive');
    });

    it('should not register more than 2 agents per beach', async () => {
      const beach = await Beach.create({
        name: 'Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
        assignedAgents: [],
      });

      // Create 2 agents
      const agent1 = await User.create({
        email: 'agent1@test.com',
        password: 'hashedPassword',
        name: 'Agent 1',
        nic: 'NIC-001',
        role: 'agent',
        assignedBeach: beach._id,
      });

      const agent2 = await User.create({
        email: 'agent2@test.com',
        password: 'hashedPassword',
        name: 'Agent 2',
        nic: 'NIC-002',
        role: 'agent',
        assignedBeach: beach._id,
      });

      beach.assignedAgents = [agent1._id, agent2._id];
      await beach.save();

      // Try to add 3rd agent
      const agentData = {
        email: 'agent3@test.com',
        password: 'Test@12345',
        name: 'Agent 3',
        nic: 'NIC-003',
        assignedBeach: beach._id.toString(),
      };

      const response = await request(app).post('/api/agents').send(agentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Beach already has maximum 2 agents assigned'
      );
    });
  });

  describe('GET /api/agents (Get All Agents)', () => {
    it('should retrieve all agents', async () => {
      const beach = await Beach.create({
        name: 'Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      await User.create({
        email: 'agent1@test.com',
        password: 'hashedPassword',
        name: 'Agent 1',
        nic: 'NIC-1',
        role: 'agent',
        assignedBeach: beach._id,
      });

      await User.create({
        email: 'agent2@test.com',
        password: 'hashedPassword',
        name: 'Agent 2',
        nic: 'NIC-2',
        role: 'agent',
        assignedBeach: beach._id,
      });

      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agents retrieved successfully');
      expect(Array.isArray(response.body.data.agents)).toBe(true);
      expect(response.body.data.agents.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no agents exist', async () => {
      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(200);
      expect(response.body.data.agents).toEqual([]);
    });
  });

  describe('GET /api/agents/:agentId (Get Single Agent)', () => {
    it('should retrieve single agent by ID', async () => {
      const beach = await Beach.create({
        name: 'Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agent = await User.create({
        email: 'agent@test.com',
        password: 'hashedPassword',
        name: 'Test Agent',
        nic: 'NIC-TEST',
        role: 'agent',
        assignedBeach: beach._id,
      });

      const response = await request(app).get(`/api/agents/${agent._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent retrieved successfully');
      expect(response.body.data.agent.id).toBe(agent._id.toString());
      expect(response.body.data.agent.name).toBe('Test Agent');
    });

    it('should return 404 for non-existent agent', async () => {
      const fakeAgentId = new mongoose.Types.ObjectId();

      const response = await request(app).get(`/api/agents/${fakeAgentId}`);

      expect(response.status).toBe(404);
    });

    it('should reject invalid agent ID format', async () => {
      const response = await request(app).get('/api/agents/invalid-id');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('DELETE /api/agents/:agentId (Delete Agent)', () => {
    it('should delete an agent successfully', async () => {
      const beach = await Beach.create({
        name: 'Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agent = await User.create({
        email: 'agentdelete@test.com',
        password: 'hashedPassword',
        name: 'Agent to Delete',
        nic: 'NIC-DELETE',
        role: 'agent',
        assignedBeach: beach._id,
      });

      beach.assignedAgents = [agent._id];
      await beach.save();

      const response = await request(app).delete(`/api/agents/${agent._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent deleted successfully');

      // Verify agent is deleted
      const deletedAgent = await User.findById(agent._id);
      expect(deletedAgent).toBeNull();

      // Verify agent removed from beach
      const updatedBeach = await Beach.findById(beach._id);
      expect(updatedBeach.assignedAgents).not.toContain(agent._id);
    });

    it('should return error when deleting non-existent agent', async () => {
      const fakeAgentId = new mongoose.Types.ObjectId();

      const response = await request(app).delete(`/api/agents/${fakeAgentId}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PATCH /api/agents/:agentId/reassign/:beachId (Reassign Agent)', () => {
    it('should reassign agent to a different beach', async () => {
      const beach1 = await Beach.create({
        name: 'Beach 1',
        location: {
          address: '123 Beach St',
          city: 'City 1',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const beach2 = await Beach.create({
        name: 'Beach 2',
        location: {
          address: '456 Beach Ave',
          city: 'City 2',
          coordinates: { type: 'Point', coordinates: [1, 1] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agent = await User.create({
        email: 'agent@test.com',
        password: 'hashedPassword',
        name: 'Reassignment Agent',
        nic: 'NIC-REASSIGN',
        role: 'agent',
        assignedBeach: beach1._id,
      });

      beach1.assignedAgents = [agent._id];
      await beach1.save();

      const response = await request(app).patch(
        `/api/agents/${agent._id}/reassign/${beach2._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent reassigned successfully');
      expect(response.body.data.agent.assignedBeach.id).toBe(
        beach2._id.toString()
      );

      // Verify database updated
      const updatedAgent = await User.findById(agent._id);
      expect(updatedAgent.assignedBeach.toString()).toBe(beach2._id.toString());

      const updatedBeach1 = await Beach.findById(beach1._id);
      expect(updatedBeach1.assignedAgents).not.toContain(agent._id);

      const updatedBeach2 = await Beach.findById(beach2._id);
      expect(updatedBeach2.assignedAgents.map((id) => id.toString())).toContain(
        agent._id.toString()
      );
    });

    it('should not reassign to non-existent beach', async () => {
      const beach = await Beach.create({
        name: 'Beach',
        location: {
          address: '123 Beach St',
          city: 'City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agent = await User.create({
        email: 'agent@test.com',
        password: 'hashedPassword',
        name: 'Test Agent',
        nic: 'NIC-TEST',
        role: 'agent',
        assignedBeach: beach._id,
      });

      const nonExistentBeachId = new mongoose.Types.ObjectId();

      const response = await request(app).patch(
        `/api/agents/${agent._id}/reassign/${nonExistentBeachId}`
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should not reassign to inactive beach', async () => {
      const activeBeach = await Beach.create({
        name: 'Active Beach',
        location: {
          address: '123 Beach St',
          city: 'City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const inactiveBeach = await Beach.create({
        name: 'Inactive Beach',
        location: {
          address: '456 Beach Ave',
          city: 'City',
          coordinates: { type: 'Point', coordinates: [1, 1] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: false,
      });

      const agent = await User.create({
        email: 'agent@test.com',
        password: 'hashedPassword',
        name: 'Test Agent',
        nic: 'NIC-TEST',
        role: 'agent',
        assignedBeach: activeBeach._id,
      });

      const response = await request(app).patch(
        `/api/agents/${agent._id}/reassign/${inactiveBeach._id}`
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should not reassign to beach with 2 agents already', async () => {
      const beach1 = await Beach.create({
        name: 'Beach 1',
        location: {
          address: '123 Beach St',
          city: 'City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const beach2 = await Beach.create({
        name: 'Beach 2 - Full',
        location: {
          address: '456 Beach Ave',
          city: 'City',
          coordinates: { type: 'Point', coordinates: [1, 1] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agentToMove = await User.create({
        email: 'agent1@test.com',
        password: 'hashedPassword',
        name: 'Agent 1',
        nic: 'NIC-1',
        role: 'agent',
        assignedBeach: beach1._id,
      });

      const agent2 = await User.create({
        email: 'agent2@test.com',
        password: 'hashedPassword',
        name: 'Agent 2',
        nic: 'NIC-2',
        role: 'agent',
        assignedBeach: beach2._id,
      });

      const agent3 = await User.create({
        email: 'agent3@test.com',
        password: 'hashedPassword',
        name: 'Agent 3',
        nic: 'NIC-3',
        role: 'agent',
        assignedBeach: beach2._id,
      });

      beach2.assignedAgents = [agent2._id, agent3._id];
      await beach2.save();

      const response = await request(app).patch(
        `/api/agents/${agentToMove._id}/reassign/${beach2._id}`
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
    });
  });
});
