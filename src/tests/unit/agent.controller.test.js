const agentController = require('../../controller/agent.controller');
const agentService = require('../../service/agent.service');
const mongoose = require('mongoose');

// Mock the Service layer
jest.mock('../../service/agent.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Agent Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatAgentResponse', () => {
    it('should format agent data correctly', () => {
      const agentId = new mongoose.Types.ObjectId();
      const beachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        email: 'agent@test.com',
        name: 'John Agent',
        nic: 'NIC12345',
        role: 'agent',
        assignedBeach: {
          _id: beachId,
          name: 'Test Beach',
          location: { city: 'Test City' },
          isActive: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const formatted = agentController.formatAgentResponse(mockAgent);

      expect(formatted.id).toEqual(agentId);
      expect(formatted.email).toBe('agent@test.com');
      expect(formatted.name).toBe('John Agent');
      expect(formatted.nic).toBe('NIC12345');
      expect(formatted.role).toBe('agent');
      expect(formatted.assignedBeach.id).toEqual(beachId);
      expect(formatted.assignedBeach.name).toBe('Test Beach');
      expect(formatted.assignedBeach.city).toBe('Test City');
    });

    it('should handle null assignedBeach gracefully', () => {
      const agentId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        email: 'agent@test.com',
        name: 'John Agent',
        nic: 'NIC12345',
        role: 'agent',
        assignedBeach: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const formatted = agentController.formatAgentResponse(mockAgent);

      expect(formatted.assignedBeach).toBeNull();
    });
  });

  describe('registerAgent', () => {
    it('should register a new agent successfully', async () => {
      const beachId = new mongoose.Types.ObjectId();
      const agentId = new mongoose.Types.ObjectId();

      const requestBody = {
        email: 'newagent@test.com',
        password: 'Test@123',
        name: 'New Agent',
        nic: 'NIC12345',
        assignedBeach: beachId,
      };

      const mockAgent = {
        _id: agentId,
        ...requestBody,
        role: 'agent',
      };

      const req = { body: requestBody };
      const res = mockResponse();

      agentService.createAgent.mockResolvedValue({
        agent: mockAgent,
        token: 'token123',
      });

      await agentController.registerAgent(req, res, mockNext);

      expect(agentService.createAgent).toHaveBeenCalledWith(requestBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Beach agent registered successfully',
          data: expect.objectContaining({
            agent: mockAgent,
          }),
        })
      );
    });

    it('should return 400 if email already exists', async () => {
      const beachId = new mongoose.Types.ObjectId();

      const requestBody = {
        email: 'existing@test.com',
        password: 'Test@123',
        name: 'New Agent',
        nic: 'NIC12345',
        assignedBeach: beachId,
      };

      const req = { body: requestBody };
      const res = mockResponse();

      agentService.createAgent.mockRejectedValue(new Error('USER_EXISTS'));

      await agentController.registerAgent(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email already in use',
      });
    });

    it('should return 400 if NIC already exists', async () => {
      const beachId = new mongoose.Types.ObjectId();

      const requestBody = {
        email: 'agent@test.com',
        password: 'Test@123',
        name: 'New Agent',
        nic: 'EXISTING_NIC',
        assignedBeach: beachId,
      };

      const req = { body: requestBody };
      const res = mockResponse();

      agentService.createAgent.mockRejectedValue(new Error('NIC_EXISTS'));

      await agentController.registerAgent(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'NIC already registered',
      });
    });

    it('should return 404 if beach not found', async () => {
      const beachId = new mongoose.Types.ObjectId();

      const requestBody = {
        email: 'agent@test.com',
        password: 'Test@123',
        name: 'New Agent',
        nic: 'NIC12345',
        assignedBeach: beachId,
      };

      const req = { body: requestBody };
      const res = mockResponse();

      agentService.createAgent.mockRejectedValue(new Error('BEACH_NOT_FOUND'));

      await agentController.registerAgent(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Beach not found or inactive',
      });
    });

    it('should return 400 if beach already has max agents', async () => {
      const beachId = new mongoose.Types.ObjectId();

      const requestBody = {
        email: 'agent@test.com',
        password: 'Test@123',
        name: 'New Agent',
        nic: 'NIC12345',
        assignedBeach: beachId,
      };

      const req = { body: requestBody };
      const res = mockResponse();

      agentService.createAgent.mockRejectedValue(new Error('BEACH_MAX_AGENTS'));

      await agentController.registerAgent(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Beach already has maximum 2 agents assigned',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const beachId = new mongoose.Types.ObjectId();

      const requestBody = {
        email: 'agent@test.com',
        password: 'Test@123',
        name: 'New Agent',
        nic: 'NIC12345',
        assignedBeach: beachId,
      };

      const req = { body: requestBody };
      const res = mockResponse();

      agentService.createAgent.mockRejectedValue(new Error('Unexpected error'));

      await agentController.registerAgent(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server Error',
      });
    });
  });

  describe('getAllAgents', () => {
    it('should retrieve all agents with formatted response', async () => {
      const mockAgents = [
        {
          _id: new mongoose.Types.ObjectId(),
          email: 'agent1@test.com',
          name: 'Agent 1',
          nic: 'NIC1',
          role: 'agent',
          assignedBeach: {
            _id: new mongoose.Types.ObjectId(),
            name: 'Beach 1',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          email: 'agent2@test.com',
          name: 'Agent 2',
          nic: 'NIC2',
          role: 'agent',
          assignedBeach: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const req = {};
      const res = mockResponse();

      agentService.getAllAgents.mockResolvedValue(mockAgents);

      await agentController.getAllAgents(req, res, mockNext);

      expect(agentService.getAllAgents).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Agents retrieved successfully',
          data: expect.objectContaining({
            agents: expect.arrayContaining([
              expect.objectContaining({
                id: mockAgents[0]._id,
                name: 'Agent 1',
              }),
              expect.objectContaining({
                id: mockAgents[1]._id,
                name: 'Agent 2',
              }),
            ]),
          }),
        })
      );
    });

    it('should return empty array when no agents exist', async () => {
      const req = {};
      const res = mockResponse();

      agentService.getAllAgents.mockResolvedValue([]);

      await agentController.getAllAgents(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            agents: [],
          }),
        })
      );
    });
  });

  describe('getAgentById', () => {
    it('should retrieve single agent by ID', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const beachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        email: 'agent@test.com',
        name: 'Test Agent',
        nic: 'NIC123',
        role: 'agent',
        assignedBeach: {
          _id: beachId,
          name: 'Test Beach',
          location: { city: 'Test City' },
          isActive: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const req = { params: { agentId: agentId.toString() } };
      const res = mockResponse();

      agentService.getAgentById.mockResolvedValue(mockAgent);

      await agentController.getAgentById(req, res, mockNext);

      expect(agentService.getAgentById).toHaveBeenCalledWith(
        agentId.toString()
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Agent retrieved successfully',
          data: expect.objectContaining({
            agent: expect.objectContaining({
              id: agentId,
              name: 'Test Agent',
            }),
          }),
        })
      );
    });

    it('should handle agent not found error', async () => {
      const agentId = new mongoose.Types.ObjectId();

      const req = { params: { agentId: agentId.toString() } };
      const res = mockResponse();

      const error = new Error('Agent not found');
      agentService.getAgentById.mockRejectedValue(error);

      await agentController.getAgentById(req, res, mockNext);

      // catchAsync passes error to next middleware
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteAgent', () => {
    it('should delete an agent successfully', async () => {
      const agentId = new mongoose.Types.ObjectId();

      const req = { params: { agentId: agentId.toString() } };
      const res = mockResponse();

      agentService.deleteAgent.mockResolvedValue({
        _id: agentId,
        name: 'Deleted Agent',
      });

      await agentController.deleteAgent(req, res, mockNext);

      expect(agentService.deleteAgent).toHaveBeenCalledWith(agentId.toString());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Agent deleted successfully',
        })
      );
    });

    it('should handle agent not found when deleting', async () => {
      const agentId = new mongoose.Types.ObjectId();

      const req = { params: { agentId: agentId.toString() } };
      const res = mockResponse();

      agentService.deleteAgent.mockRejectedValue(new Error('Agent not found'));

      await agentController.deleteAgent(req, res, mockNext);

      expect(res.status).not.toHaveBeenCalledWith(200);
    });
  });

  describe('reassignAgent', () => {
    it('should reassign agent to a different beach', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const beachId = new mongoose.Types.ObjectId();

      const mockUpdatedAgent = {
        _id: agentId,
        email: 'agent@test.com',
        name: 'Reassigned Agent',
        nic: 'NIC123',
        role: 'agent',
        assignedBeach: {
          _id: beachId,
          name: 'New Beach',
          location: { city: 'New City' },
          isActive: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const req = {
        params: {
          agentId: agentId.toString(),
          beachId: beachId.toString(),
        },
      };
      const res = mockResponse();

      agentService.reassignAgent.mockResolvedValue(mockUpdatedAgent);

      await agentController.reassignAgent(req, res, mockNext);

      expect(agentService.reassignAgent).toHaveBeenCalledWith(
        agentId.toString(),
        beachId.toString()
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Agent reassigned successfully',
          data: expect.objectContaining({
            agent: expect.objectContaining({
              id: agentId,
              name: 'Reassigned Agent',
            }),
          }),
        })
      );
    });

    it('should handle error when reassigning to non-existent beach', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const beachId = new mongoose.Types.ObjectId();

      const req = {
        params: {
          agentId: agentId.toString(),
          beachId: beachId.toString(),
        },
      };
      const res = mockResponse();

      agentService.reassignAgent.mockRejectedValue(
        new Error('Beach not found')
      );

      await agentController.reassignAgent(req, res, mockNext);

      expect(res.status).not.toHaveBeenCalledWith(200);
    });
  });
});
