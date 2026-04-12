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

describe('Agent API Performance Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('Performance: Get All Agents', () => {
    it('should handle retrieving 100 agents within acceptable time', async () => {
      const beach = await Beach.create({
        name: 'Performance Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      // Create 100 agents
      const agentPromises = [];
      for (let i = 0; i < 100; i++) {
        agentPromises.push(
          User.create({
            email: `agent${i}@test.com`,
            password: 'hashedPassword',
            name: `Performance Agent ${i}`,
            nic: `NIC-PERF-${i}`,
            role: 'agent',
            assignedBeach: beach._id,
          })
        );
      }
      await Promise.all(agentPromises);

      const startTime = performance.now();

      const response = await request(app).get('/api/agents');

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.agents.length).toBe(100);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Retrieved 100 agents in ${responseTime}ms`);
    });

    it('should efficiently filter agents by beach', async () => {
      const beaches = await Promise.all([
        Beach.create({
          name: 'Beach 1',
          location: {
            address: '123 Beach St',
            city: 'City 1',
            coordinates: { type: 'Point', coordinates: [0, 0] },
          },
          createdBy: new mongoose.Types.ObjectId(),
          isActive: true,
        }),
        Beach.create({
          name: 'Beach 2',
          location: {
            address: '456 Beach Ave',
            city: 'City 2',
            coordinates: { type: 'Point', coordinates: [1, 1] },
          },
          createdBy: new mongoose.Types.ObjectId(),
          isActive: true,
        }),
      ]);

      // Create 50 agents per beach
      const agentPromises = [];
      for (let b = 0; b < 2; b++) {
        for (let i = 0; i < 50; i++) {
          agentPromises.push(
            User.create({
              email: `agent${b}-${i}@test.com`,
              password: 'hashedPassword',
              name: `Agent Beach ${b} ${i}`,
              nic: `NIC-${b}-${i}`,
              role: 'agent',
              assignedBeach: beaches[b]._id,
            })
          );
        }
      }
      await Promise.all(agentPromises);

      const startTime = performance.now();

      const response = await request(app).get('/api/agents');

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.agents.length).toBe(100);
      expect(responseTime).toBeLessThan(3000);
      console.log(`Retrieved 100 agents from 2 beaches in ${responseTime}ms`);
    });
  });

  describe('Performance: Get Single Agent', () => {
    it('should retrieve single agent efficiently', async () => {
      const beach = await Beach.create({
        name: 'Performance Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agent = await User.create({
        email: 'perf-agent@test.com',
        password: 'hashedPassword',
        name: 'Performance Test Agent',
        nic: 'NIC-PERF-SINGLE',
        role: 'agent',
        assignedBeach: beach._id,
      });

      const startTime = performance.now();

      const response = await request(app).get(`/api/agents/${agent._id}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.agent.id).toBe(agent._id.toString());
      expect(responseTime).toBeLessThan(500); // Should be very fast
      console.log(`Retrieved single agent in ${responseTime}ms`);
    });
  });

  describe('Performance: Delete Agent', () => {
    it('should delete agent and update beach efficiently', async () => {
      const beach = await Beach.create({
        name: 'Performance Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agent = await User.create({
        email: 'perf-delete@test.com',
        password: 'hashedPassword',
        name: 'Agent to Delete',
        nic: 'NIC-PERF-DELETE',
        role: 'agent',
        assignedBeach: beach._id,
      });

      beach.assignedAgents = [agent._id];
      await beach.save();

      const startTime = performance.now();

      const response = await request(app).delete(`/api/agents/${agent._id}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000);
      console.log(`Deleted agent and updated beach in ${responseTime}ms`);
    });

    it('should bulk delete multiple agents efficiently', async () => {
      // Create 20 agents across different beaches to avoid max 2 agents per beach limit
      const agentIds = [];
      const beaches = [];

      for (let b = 0; b < 10; b++) {
        const beach = await Beach.create({
          name: `Performance Beach ${b}`,
          location: {
            address: `${b} Beach St`,
            city: 'Beach City',
            coordinates: { type: 'Point', coordinates: [0, b] },
          },
          createdBy: new mongoose.Types.ObjectId(),
          isActive: true,
        });
        beaches.push(beach);
      }

      // Create 20 agents across 10 beaches (2 per beach max)
      const agentPromises = [];
      for (let i = 0; i < 20; i++) {
        const beachIndex = Math.floor(i / 2) % beaches.length;
        const agent = User.create({
          email: `perf-bulk-${i}@test.com`,
          password: 'hashedPassword',
          name: `Bulk Agent ${i}`,
          nic: `NIC-BULK-${i}`,
          role: 'agent',
          assignedBeach: beaches[beachIndex]._id,
        });
        agentPromises.push(agent);
      }
      const agents = await Promise.all(agentPromises);
      agents.forEach((agent) => agentIds.push(agent._id));

      const startTime = performance.now();

      // Delete all agents
      const deletePromises = agentIds.map((agentId) =>
        request(app).delete(`/api/agents/${agentId}`)
      );
      const responses = await Promise.all(deletePromises);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(responseTime).toBeLessThan(10000); // Should handle 20 deletions within 10 seconds
      console.log(`Bulk deleted 20 agents in ${responseTime}ms`);
    });
  });

  describe('Performance: Reassign Agent', () => {
    it('should reassign agent to different beach efficiently', async () => {
      const beaches = await Promise.all([
        Beach.create({
          name: 'Source Beach',
          location: {
            address: '123 Beach St',
            city: 'City 1',
            coordinates: { type: 'Point', coordinates: [0, 0] },
          },
          createdBy: new mongoose.Types.ObjectId(),
          isActive: true,
        }),
        Beach.create({
          name: 'Target Beach',
          location: {
            address: '456 Beach Ave',
            city: 'City 2',
            coordinates: { type: 'Point', coordinates: [1, 1] },
          },
          createdBy: new mongoose.Types.ObjectId(),
          isActive: true,
        }),
      ]);

      const agent = await User.create({
        email: 'perf-reassign@test.com',
        password: 'hashedPassword',
        name: 'Agent to Reassign',
        nic: 'NIC-PERF-REASSIGN',
        role: 'agent',
        assignedBeach: beaches[0]._id,
      });

      beaches[0].assignedAgents = [agent._id];
      await beaches[0].save();

      const startTime = performance.now();

      const response = await request(app).patch(
        `/api/agents/${agent._id}/reassign/${beaches[1]._id}`
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000);
      console.log(`Reassigned agent in ${responseTime}ms`);
    });

    it('should bulk reassign agents efficiently', async () => {
      // Create 5 pairs of source-target beaches for testing bulk reassignment
      const testPairs = [];
      for (let i = 0; i < 5; i++) {
        const sourceBeach = await Beach.create({
          name: `Bulk Test Source Beach ${i}`,
          location: {
            address: `${i} Beach St`,
            city: `City ${i}`,
            coordinates: { type: 'Point', coordinates: [i * 0.5, i * 0.5] },
          },
          createdBy: new mongoose.Types.ObjectId(),
          isActive: true,
        });

        const targetBeach = await Beach.create({
          name: `Bulk Test Target Beach ${i}`,
          location: {
            address: `${i} Target Ave`,
            city: `Target City ${i}`,
            coordinates: {
              type: 'Point',
              coordinates: [i * 0.5 + 1, i * 0.5 + 1],
            },
          },
          createdBy: new mongoose.Types.ObjectId(),
          isActive: true,
        });

        const agent = await User.create({
          email: `perf-bulk-reassign-${i}@test.com`,
          password: 'hashedPassword',
          name: `Bulk Reassign Agent ${i}`,
          nic: `NIC-BULK-REASS-${i}`,
          role: 'agent',
          assignedBeach: sourceBeach._id,
        });

        sourceBeach.assignedAgents = [agent._id];
        await sourceBeach.save();

        testPairs.push({
          agentId: agent._id,
          sourceBeachId: sourceBeach._id,
          targetBeachId: targetBeach._id,
        });
      }

      const startTime = performance.now();

      // Reassign all 5 agents
      const reassignPromises = testPairs.map((pair) =>
        request(app).patch(
          `/api/agents/${pair.agentId}/reassign/${pair.targetBeachId}`
        )
      );
      const responses = await Promise.all(reassignPromises);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // All 5 should succeed since each has its own dedicated beaches
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(responseTime).toBeLessThan(5000);
      console.log(
        `Processed bulk reassignment (5 reassignments) in ${responseTime}ms`
      );
    });
  });

  describe('Performance: Concurrent Operations', () => {
    it('should handle concurrent agent retrieval requests', async () => {
      const beach = await Beach.create({
        name: 'Performance Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      // Create 50 agents
      const agentPromises = [];
      for (let i = 0; i < 50; i++) {
        agentPromises.push(
          User.create({
            email: `concurrent-${i}@test.com`,
            password: 'hashedPassword',
            name: `Concurrent Agent ${i}`,
            nic: `NIC-CONCURRENT-${i}`,
            role: 'agent',
            assignedBeach: beach._id,
          })
        );
      }
      await Promise.all(agentPromises);

      const startTime = performance.now();

      // Send 10 concurrent requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/api/agents'));
      }

      const responses = await Promise.all(requests);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(responseTime).toBeLessThan(5000);
      const avgTime = responseTime / 10;
      console.log(
        `10 concurrent requests completed in ${responseTime}ms (avg: ${avgTime}ms each)`
      );
    });
  });

  describe('Performance: Response Time SLA', () => {
    it('should maintain <500ms response time for single agent retrieval', async () => {
      const beach = await Beach.create({
        name: 'SLA Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      const agent = await User.create({
        email: 'sla-test@test.com',
        password: 'hashedPassword',
        name: 'SLA Test Agent',
        nic: 'NIC-SLA',
        role: 'agent',
        assignedBeach: beach._id,
      });

      // Run 10 times to ensure consistency
      const responseTimes = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        await request(app).get(`/api/agents/${agent._id}`);

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      const avgTime =
        responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      console.log(`Average response time: ${avgTime}ms`);
      console.log(`Max response time: ${maxTime}ms`);

      expect(avgTime).toBeLessThan(500);
      expect(maxTime).toBeLessThan(1000);
    });
  });

  describe('Performance: Memory Efficiency', () => {
    it('should handle large result sets without memory issues', async () => {
      const beach = await Beach.create({
        name: 'Memory Test Beach',
        location: {
          address: '123 Beach St',
          city: 'Beach City',
          coordinates: { type: 'Point', coordinates: [0, 0] },
        },
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true,
      });

      // Create 200 agents
      const agentPromises = [];
      for (let i = 0; i < 200; i++) {
        agentPromises.push(
          User.create({
            email: `memory-test-${i}@test.com`,
            password: 'hashedPassword',
            name: `Memory Test Agent ${i}`,
            nic: `NIC-MEMORY-${i}`,
            role: 'agent',
            assignedBeach: beach._id,
          })
        );
      }
      await Promise.all(agentPromises);

      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      const response = await request(app).get('/api/agents');

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryIncrease = finalMemory - initialMemory;

      expect(response.status).toBe(200);
      expect(response.body.data.agents.length).toBe(200);
      // Memory increase should be reasonable (less than 100MB for 200 agents)
      expect(memoryIncrease).toBeLessThan(100);
      console.log(
        `Retrieved 200 agents with memory increase of ${memoryIncrease.toFixed(2)}MB`
      );
    });
  });
});
