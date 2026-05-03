const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../setup/dbSetup');
const eventService = require('../../service/event.service');
const { Event, Beach, User } = require('../../models/index');

// Chat service is a real side-effect in joinEvent / leaveEvent / createEvent
// Mock it so performance tests don't hit a real server.
jest.mock('../../service/chat.service', () => ({
  createChatGroup: jest
    .fn()
    .mockResolvedValue({ _id: '60d21b4667d0d8992e610c99' }),
  addMember: jest.fn().mockResolvedValue(true),
  removeMember: jest.fn().mockResolvedValue(true),
}));

// ── helpers ────────────────────────────────────────────────────────────────────
const makeDates = (startOffsetDays = 1, endOffsetDays = 7) => {
  const start = new Date();
  start.setDate(start.getDate() + startOffsetDays);
  const end = new Date();
  end.setDate(end.getDate() + endOffsetDays);
  return { start, end };
};

describe('Event Service Performance Tests', () => {
  let beachId;
  let organizerId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();

    // Shared organizer user
    organizerId = new mongoose.Types.ObjectId();
    await User.create({
      _id: organizerId,
      name: 'Perf Organizer',
      email: 'perf-org@test.com',
      password: 'password123',
      role: 'admin',
    });

    // Shared beach
    const beach = await Beach.create({
      name: 'Perf Beach',
      location: {
        address: '1 Perf St',
        city: 'Perf City',
        coordinates: { type: 'Point', coordinates: [0, 0] },
      },
      createdBy: organizerId,
      isActive: true,
    });
    beachId = beach._id;
  });

  // ─────────────────────────────────────────────────────────────
  // Bulk read performance – getEvents with pagination
  // ─────────────────────────────────────────────────────────────
  it('should paginate 2000 events in under 200ms', async () => {
    const { start, end } = makeDates();

    const docs = [];
    for (let i = 0; i < 2000; i++) {
      docs.push({
        title: `Perf Event ${i}`,
        description: 'Performance test event',
        beachId,
        organizerId,
        startDate: start,
        endDate: end,
        status: 'UPCOMING',
        isDeleted: false,
      });
    }
    await Event.insertMany(docs);

    const startTime = performance.now();
    const result = await eventService.getEvents({ status: 'UPCOMING' }, 3, 50);
    const latencyMs = performance.now() - startTime;

    console.log(
      `[Performance] getEvents (pagination page 3/50 on 2k docs): ${latencyMs.toFixed(2)} ms`
    );

    expect(result.events).toHaveLength(50);
    expect(result.pagination.total).toBe(2000);
    expect(latencyMs).toBeLessThan(200);
  }, 15000);

  // ─────────────────────────────────────────────────────────────
  // Single-document read – getEventById
  // ─────────────────────────────────────────────────────────────
  it('should retrieve a single event by ID in under 30ms', async () => {
    const { start, end } = makeDates();
    const event = await Event.create({
      title: 'Single Perf Read',
      description: 'Single read test',
      beachId,
      organizerId,
      startDate: start,
      endDate: end,
    });

    const startTime = performance.now();
    const result = await eventService.getEventById(event._id.toString());
    const latencyMs = performance.now() - startTime;

    console.log(
      `[Performance] getEventById latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(result.title).toBe('Single Perf Read');
    expect(latencyMs).toBeLessThan(30);
  });

  // ─────────────────────────────────────────────────────────────
  // Write performance – updateEvent
  // ─────────────────────────────────────────────────────────────
  it('should update an event in under 50ms', async () => {
    const { start, end } = makeDates();
    const event = await Event.create({
      title: 'Update Perf Test',
      description: 'Before update',
      beachId,
      organizerId,
      startDate: start,
      endDate: end,
    });

    const startTime = performance.now();
    const result = await eventService.updateEvent(
      event._id.toString(),
      organizerId.toString(),
      { title: 'After Update' }
    );
    const latencyMs = performance.now() - startTime;

    console.log(
      `[Performance] updateEvent latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(result.title).toBe('After Update');
    expect(latencyMs).toBeLessThan(50);
  });

  // ─────────────────────────────────────────────────────────────
  // Write performance – soft deleteEvent
  // ─────────────────────────────────────────────────────────────
  it('should soft-delete an event in under 30ms', async () => {
    const { start, end } = makeDates();
    const event = await Event.create({
      title: 'Delete Perf Test',
      description: 'To be deleted',
      beachId,
      organizerId,
      startDate: start,
      endDate: end,
    });

    const startTime = performance.now();
    const result = await eventService.deleteEvent(
      event._id.toString(),
      organizerId.toString()
    );
    const latencyMs = performance.now() - startTime;

    console.log(
      `[Performance] deleteEvent (soft) latency: ${latencyMs.toFixed(2)} ms`
    );

    expect(result.message).toBe('Event deleted successfully');
    expect(latencyMs).toBeLessThan(30);
  });

  // ─────────────────────────────────────────────────────────────
  // Write performance – joinEvent
  // ─────────────────────────────────────────────────────────────
  it('should join an event in under 100ms', async () => {
    const { start, end } = makeDates();
    const volunteerId = new mongoose.Types.ObjectId();
    await User.create({
      _id: volunteerId,
      name: 'Perf Volunteer',
      email: 'perf-vol@test.com',
      password: 'pass',
      role: 'volunteer',
    });

    const event = await Event.create({
      title: 'Join Perf Test',
      description: 'Desc',
      beachId,
      organizerId,
      startDate: start,
      endDate: end,
      status: 'UPCOMING',
      maxVolunteers: 100,
      chatGroupId: new mongoose.Types.ObjectId(),
    });

    const startTime = performance.now();
    const result = await eventService.joinEvent(
      event._id.toString(),
      volunteerId.toString()
    );
    const latencyMs = performance.now() - startTime;

    console.log(`[Performance] joinEvent latency: ${latencyMs.toFixed(2)} ms`);

    const joined = result.volunteers.some(
      (v) => (v?._id || v).toString() === volunteerId.toString()
    );
    expect(joined).toBe(true);
    expect(latencyMs).toBeLessThan(100);
  });

  // ─────────────────────────────────────────────────────────────
  // Write performance – leaveEvent
  // ─────────────────────────────────────────────────────────────
  it('should leave an event in under 100ms', async () => {
    const { start, end } = makeDates();
    const volunteerId = new mongoose.Types.ObjectId();
    await User.create({
      _id: volunteerId,
      name: 'Leave Perf Vol',
      email: 'leave-perf-vol@test.com',
      password: 'pass',
      role: 'volunteer',
    });

    const event = await Event.create({
      title: 'Leave Perf Test',
      description: 'Desc',
      beachId,
      organizerId,
      startDate: start,
      endDate: end,
      status: 'UPCOMING',
      volunteers: [volunteerId],
      chatGroupId: new mongoose.Types.ObjectId(),
    });

    const startTime = performance.now();
    const result = await eventService.leaveEvent(
      event._id.toString(),
      volunteerId.toString()
    );
    const latencyMs = performance.now() - startTime;

    console.log(`[Performance] leaveEvent latency: ${latencyMs.toFixed(2)} ms`);

    expect(result.message).toBe('Left event successfully');
    expect(latencyMs).toBeLessThan(100);
  });

  // ─────────────────────────────────────────────────────────────
  // Read performance – getEventsByAgentId with 500 assigned events
  // ─────────────────────────────────────────────────────────────
  it('should retrieve paginated agent events from 500 records in under 150ms', async () => {
    const agentId = new mongoose.Types.ObjectId();
    await User.create({
      _id: agentId,
      name: 'Perf Agent',
      email: 'perf-agent@test.com',
      password: 'pass',
      role: 'agent',
      assignedBeach: beachId,
    });

    const { start, end } = makeDates();
    const docs = [];
    for (let i = 0; i < 500; i++) {
      docs.push({
        title: `Agent Perf Event ${i}`,
        description: 'Desc',
        beachId,
        organizerId,
        agentId,
        startDate: start,
        endDate: end,
        status: 'UPCOMING',
        isDeleted: false,
      });
    }
    await Event.insertMany(docs);

    const startTime = performance.now();
    const result = await eventService.getEventsByAgentId(
      agentId.toString(),
      1,
      25,
      'UPCOMING'
    );
    const latencyMs = performance.now() - startTime;

    console.log(
      `[Performance] getEventsByAgentId (500 docs, page 1/25): ${latencyMs.toFixed(2)} ms`
    );

    expect(result.events).toHaveLength(25);
    expect(result.pagination.total).toBe(500);
    expect(latencyMs).toBeLessThan(150);
  }, 15000);
});
