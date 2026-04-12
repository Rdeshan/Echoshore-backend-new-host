const agentService = require('../../service/agent.service');
const agentRepository = require('../../repository/agent.repository');
const authService = require('../../service/auth.service');
const { Beach } = require('../../models');
const { NotFoundError } = require('../../utils/AppError');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../../repository/agent.repository');
jest.mock('../../service/auth.service');
jest.mock('../../models');

describe('Agent Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    it('should create an agent with valid data', async () => {
      const agentData = {
        email: 'agent@test.com',
        password: 'Test@123',
        name: 'John Agent',
        nic: 'NIC12345',
        assignedBeach: new mongoose.Types.ObjectId(),
      };

      const mockAgent = {
        _id: new mongoose.Types.ObjectId(),
        ...agentData,
        role: 'agent',
      };

      authService.registerAgent.mockResolvedValue({
        agent: mockAgent,
        token: 'token123',
      });

      const result = await agentService.createAgent(agentData);

      expect(authService.registerAgent).toHaveBeenCalledWith(agentData);
      expect(result.agent).toBeDefined();
      expect(result.agent.role).toBe('agent');
    });

    it('should throw error if email already exists', async () => {
      const agentData = {
        email: 'existing@test.com',
        password: 'Test@123',
        name: 'John Agent',
        nic: 'NIC12345',
        assignedBeach: new mongoose.Types.ObjectId(),
      };

      authService.registerAgent.mockRejectedValue(new Error('USER_EXISTS'));

      await expect(agentService.createAgent(agentData)).rejects.toThrow(
        'USER_EXISTS'
      );
    });

    it('should throw error if NIC already exists', async () => {
      const agentData = {
        email: 'agent@test.com',
        password: 'Test@123',
        name: 'John Agent',
        nic: 'EXISTING_NIC',
        assignedBeach: new mongoose.Types.ObjectId(),
      };

      authService.registerAgent.mockRejectedValue(new Error('NIC_EXISTS'));

      await expect(agentService.createAgent(agentData)).rejects.toThrow(
        'NIC_EXISTS'
      );
    });
  });

  describe('getAllAgents', () => {
    it('should retrieve all agents with populated beach info', async () => {
      const mockAgents = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Agent 1',
          email: 'agent1@test.com',
          role: 'agent',
          assignedBeach: {
            _id: new mongoose.Types.ObjectId(),
            name: 'Beach 1',
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Agent 2',
          email: 'agent2@test.com',
          role: 'agent',
          assignedBeach: {
            _id: new mongoose.Types.ObjectId(),
            name: 'Beach 2',
          },
        },
      ];

      agentRepository.findAllAgents.mockResolvedValue(mockAgents);

      const result = await agentService.getAllAgents();

      expect(agentRepository.findAllAgents).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Agent 1');
      expect(result[1].name).toBe('Agent 2');
    });

    it('should return empty array if no agents exist', async () => {
      agentRepository.findAllAgents.mockResolvedValue([]);

      const result = await agentService.getAllAgents();

      expect(result).toEqual([]);
      expect(agentRepository.findAllAgents).toHaveBeenCalled();
    });
  });

  describe('getAgentById', () => {
    it('should retrieve an agent by ID with all details', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const mockAgent = {
        _id: agentId,
        name: 'Test Agent',
        email: 'agent@test.com',
        nic: 'NIC12345',
        role: 'agent',
        assignedBeach: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Beach',
          location: { city: 'Test City' },
          isActive: true,
        },
      };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);

      const result = await agentService.getAgentById(agentId.toString());

      expect(agentRepository.findAgentById).toHaveBeenCalledWith(
        agentId.toString()
      );
      expect(result._id).toEqual(agentId);
      expect(result.name).toBe('Test Agent');
    });

    it('should throw NotFoundError if agent does not exist', async () => {
      const agentId = new mongoose.Types.ObjectId();

      agentRepository.findAgentById.mockResolvedValue(null);

      await expect(
        agentService.getAgentById(agentId.toString())
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteAgent', () => {
    it('should delete an agent and remove from beach assignedAgents', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const beachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        name: 'Agent To Delete',
        email: 'delete@test.com',
        assignedBeach: beachId,
      };

      const mockBeach = {
        _id: beachId,
        name: 'Beach',
        assignedAgents: [agentId, new mongoose.Types.ObjectId()],
        save: jest.fn().mockResolvedValue(true),
      };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);
      Beach.findById.mockResolvedValue(mockBeach);
      agentRepository.delete.mockResolvedValue(mockAgent);

      const result = await agentService.deleteAgent(agentId.toString());

      expect(agentRepository.findAgentById).toHaveBeenCalledWith(
        agentId.toString()
      );
      expect(Beach.findById).toHaveBeenCalledWith(beachId);
      expect(mockBeach.save).toHaveBeenCalled();
      expect(agentRepository.delete).toHaveBeenCalledWith(agentId.toString());
      expect(result._id).toEqual(agentId);
    });

    it('should throw NotFoundError if agent does not exist', async () => {
      const agentId = new mongoose.Types.ObjectId();

      agentRepository.findAgentById.mockResolvedValue(null);

      await expect(
        agentService.deleteAgent(agentId.toString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle deletion when agent has no assigned beach', async () => {
      const agentId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        name: 'Unassigned Agent',
        email: 'unassigned@test.com',
        assignedBeach: null,
      };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);
      agentRepository.delete.mockResolvedValue(mockAgent);

      const result = await agentService.deleteAgent(agentId.toString());

      expect(Beach.findById).not.toHaveBeenCalled();
      expect(agentRepository.delete).toHaveBeenCalled();
      expect(result._id).toEqual(agentId);
    });
  });

  describe('reassignAgent', () => {
    it('should reassign agent from one beach to another', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const oldBeachId = new mongoose.Types.ObjectId();
      const newBeachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        name: 'Agent To Reassign',
        email: 'reassign@test.com',
        assignedBeach: oldBeachId,
      };

      const mockOldBeach = {
        _id: oldBeachId,
        name: 'Old Beach',
        assignedAgents: [agentId, new mongoose.Types.ObjectId()],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockNewBeach = {
        _id: newBeachId,
        name: 'New Beach',
        isActive: true,
        assignedAgents: [new mongoose.Types.ObjectId()],
        save: jest.fn().mockResolvedValue(true),
      };

      const updatedAgent = { ...mockAgent, assignedBeach: newBeachId };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);
      Beach.findById
        .mockResolvedValueOnce(mockNewBeach)
        .mockResolvedValueOnce(mockOldBeach);
      agentRepository.update.mockResolvedValue(updatedAgent);

      const result = await agentService.reassignAgent(
        agentId.toString(),
        newBeachId.toString()
      );

      expect(agentRepository.findAgentById).toHaveBeenCalledWith(
        agentId.toString()
      );
      expect(Beach.findById).toHaveBeenNthCalledWith(1, newBeachId.toString());
      expect(Beach.findById).toHaveBeenNthCalledWith(2, oldBeachId);
      expect(mockOldBeach.save).toHaveBeenCalled();
      // Check if agentId was added to new beach's assignedAgents
      expect(mockNewBeach.assignedAgents.map((id) => id.toString())).toContain(
        agentId.toString()
      );
      expect(mockNewBeach.save).toHaveBeenCalled();
      expect(agentRepository.update).toHaveBeenCalledWith(agentId.toString(), {
        assignedBeach: newBeachId.toString(),
      });
    });

    it('should throw NotFoundError if agent does not exist', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const newBeachId = new mongoose.Types.ObjectId();

      agentRepository.findAgentById.mockResolvedValue(null);

      await expect(
        agentService.reassignAgent(agentId.toString(), newBeachId.toString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if new beach does not exist', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const newBeachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        name: 'Agent',
        email: 'agent@test.com',
        assignedBeach: new mongoose.Types.ObjectId(),
      };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);
      Beach.findById.mockResolvedValue(null);

      await expect(
        agentService.reassignAgent(agentId.toString(), newBeachId.toString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if new beach is inactive', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const newBeachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        name: 'Agent',
        email: 'agent@test.com',
        assignedBeach: new mongoose.Types.ObjectId(),
      };

      const mockInactiveBeach = {
        _id: newBeachId,
        name: 'Inactive Beach',
        isActive: false,
      };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);
      Beach.findById.mockResolvedValue(mockInactiveBeach);

      await expect(
        agentService.reassignAgent(agentId.toString(), newBeachId.toString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if max agents already assigned to new beach', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const newBeachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        name: 'Agent',
        email: 'agent@test.com',
        assignedBeach: new mongoose.Types.ObjectId(),
      };

      const mockFullBeach = {
        _id: newBeachId,
        name: 'Full Beach',
        isActive: true,
        assignedAgents: [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ], // Already 2 agents
      };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);
      Beach.findById.mockResolvedValue(mockFullBeach);

      await expect(
        agentService.reassignAgent(agentId.toString(), newBeachId.toString())
      ).rejects.toThrow('Beach already has maximum 2 agents assigned');
    });

    it('should handle reassignment when agent has no previous beach assignment', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const newBeachId = new mongoose.Types.ObjectId();

      const mockAgent = {
        _id: agentId,
        name: 'Unassigned Agent',
        email: 'unassigned@test.com',
        assignedBeach: null,
      };

      const mockNewBeach = {
        _id: newBeachId,
        name: 'New Beach',
        isActive: true,
        assignedAgents: [],
        save: jest.fn().mockResolvedValue(true),
      };

      const updatedAgent = { ...mockAgent, assignedBeach: newBeachId };

      agentRepository.findAgentById.mockResolvedValue(mockAgent);
      Beach.findById.mockResolvedValue(mockNewBeach);
      agentRepository.update.mockResolvedValue(updatedAgent);

      const result = await agentService.reassignAgent(
        agentId.toString(),
        newBeachId.toString()
      );

      expect(Beach.findById).toHaveBeenCalledTimes(1);
      expect(mockNewBeach.assignedAgents.map((id) => id.toString())).toContain(
        agentId.toString()
      );
      expect(mockNewBeach.save).toHaveBeenCalled();
    });
  });
});
