const eventController = require('../../controller/event.controller');
const eventService = require('../../service/event.service');

jest.mock('../../service/event.service');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Event Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // createEvent
  // ─────────────────────────────────────────────────────────────
  describe('createEvent', () => {
    it('should format output and return 201 status', async () => {
      const mockEvent = { _id: 'event1', title: 'Test Event' };
      eventService.createEvent.mockResolvedValue(mockEvent);

      const req = { body: { title: 'Test Event' }, user: { id: 'org123' } };
      const res = mockResponse();

      await eventController.createEvent(req, res, mockNext);

      expect(eventService.createEvent).toHaveBeenCalledWith('org123', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event created successfully',
        data: mockEvent,
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Create failed');
      eventService.createEvent.mockRejectedValue(error);

      const req = { body: {}, user: { id: 'org123' } };
      const res = mockResponse();

      await eventController.createEvent(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getEvents
  // ─────────────────────────────────────────────────────────────
  describe('getEvents', () => {
    it('should query events from service and return 200', async () => {
      const mockResult = { events: [{ _id: '1' }], pagination: { total: 1 } };
      eventService.getEvents.mockResolvedValue(mockResult);

      const req = { query: { page: 1, limit: 10, status: 'UPCOMING' } };
      const res = mockResponse();

      await eventController.getEvents(req, res, mockNext);

      expect(eventService.getEvents).toHaveBeenCalledWith(
        { status: 'UPCOMING' },
        1,
        10
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should pass organizerId and startDate filters when provided', async () => {
      const mockResult = { events: [], pagination: { total: 0 } };
      eventService.getEvents.mockResolvedValue(mockResult);

      const req = {
        query: {
          page: '2',
          limit: '5',
          organizerId: 'org1',
          startDate: '2025-01-01',
        },
      };
      const res = mockResponse();

      await eventController.getEvents(req, res, mockNext);

      expect(eventService.getEvents).toHaveBeenCalledWith(
        { organizerId: 'org1', startDate: '2025-01-01' },
        2,
        5
      );
    });

    it('should call next with error on failure', async () => {
      const error = new Error('DB error');
      eventService.getEvents.mockRejectedValue(error);

      const req = { query: {} };
      const res = mockResponse();

      await eventController.getEvents(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getEventById
  // ─────────────────────────────────────────────────────────────
  describe('getEventById', () => {
    it('should return a single event with 200 status', async () => {
      const mockEvent = { _id: 'event1', title: 'Cleanup Day' };
      eventService.getEventById.mockResolvedValue(mockEvent);

      const req = { params: { id: 'event1' } };
      const res = mockResponse();

      await eventController.getEventById(req, res, mockNext);

      expect(eventService.getEventById).toHaveBeenCalledWith('event1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockEvent });
    });

    it('should call next with error when not found', async () => {
      const error = new Error('Not Found');
      eventService.getEventById.mockRejectedValue(error);

      const req = { params: { id: 'bad-id' } };
      const res = mockResponse();

      await eventController.getEventById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // updateEvent
  // ─────────────────────────────────────────────────────────────
  describe('updateEvent', () => {
    it('should update an event and return 200', async () => {
      const mockEvent = { _id: 'event1', title: 'Updated Title' };
      eventService.updateEvent.mockResolvedValue(mockEvent);

      const req = {
        params: { id: 'event1' },
        user: { id: 'user1' },
        body: { title: 'Updated Title' },
      };
      const res = mockResponse();

      await eventController.updateEvent(req, res, mockNext);

      expect(eventService.updateEvent).toHaveBeenCalledWith('event1', 'user1', {
        title: 'Updated Title',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event updated successfully',
        data: mockEvent,
      });
    });

    it('should call next with error on update failure', async () => {
      const error = new Error('Unauthorized');
      eventService.updateEvent.mockRejectedValue(error);

      const req = { params: { id: 'event1' }, user: { id: 'other' }, body: {} };
      const res = mockResponse();

      await eventController.updateEvent(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // assignAgent
  // ─────────────────────────────────────────────────────────────
  describe('assignAgent', () => {
    it('should assign agent to event and return 200', async () => {
      const mockEvent = { _id: 'event1', agentId: 'agent1' };
      eventService.assignAgent.mockResolvedValue(mockEvent);

      const req = { params: { id: 'event1' }, body: { agentId: 'agent1' } };
      const res = mockResponse();

      await eventController.assignAgent(req, res, mockNext);

      expect(eventService.assignAgent).toHaveBeenCalledWith('event1', 'agent1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Agent assigned to event successfully',
        data: mockEvent,
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Agent not found');
      eventService.assignAgent.mockRejectedValue(error);

      const req = { params: { id: 'event1' }, body: { agentId: 'bad-agent' } };
      const res = mockResponse();

      await eventController.assignAgent(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // joinEvent
  // ─────────────────────────────────────────────────────────────
  describe('joinEvent', () => {
    it('should call joinEvent in service and return 200', async () => {
      const mockResult = { title: 'Joined Event' };
      eventService.joinEvent.mockResolvedValue(mockResult);

      const req = { params: { id: 'event123' }, user: { id: 'vol123' } };
      const res = mockResponse();

      await eventController.joinEvent(req, res, mockNext);

      expect(eventService.joinEvent).toHaveBeenCalledWith('event123', 'vol123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Joined event successfully',
        data: mockResult,
      });
    });

    it('should call next with error on join failure', async () => {
      const error = new Error('Event full');
      eventService.joinEvent.mockRejectedValue(error);

      const req = { params: { id: 'event123' }, user: { id: 'vol123' } };
      const res = mockResponse();

      await eventController.joinEvent(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // leaveEvent
  // ─────────────────────────────────────────────────────────────
  describe('leaveEvent', () => {
    it('should call leaveEvent and return 200', async () => {
      eventService.leaveEvent.mockResolvedValue({
        message: 'Left event successfully',
      });

      const req = { params: { id: 'event123' }, user: { id: 'vol123' } };
      const res = mockResponse();

      await eventController.leaveEvent(req, res, mockNext);

      expect(eventService.leaveEvent).toHaveBeenCalledWith(
        'event123',
        'vol123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Left event successfully',
        })
      );
    });

    it('should call next with error on leave failure', async () => {
      const error = new Error('Not joined');
      eventService.leaveEvent.mockRejectedValue(error);

      const req = { params: { id: 'event123' }, user: { id: 'vol123' } };
      const res = mockResponse();

      await eventController.leaveEvent(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // deleteEvent
  // ─────────────────────────────────────────────────────────────
  describe('deleteEvent', () => {
    it('should soft-delete event and return 200', async () => {
      eventService.deleteEvent.mockResolvedValue({
        message: 'Event deleted successfully',
      });

      const req = { params: { id: 'event123' }, user: { id: 'user1' } };
      const res = mockResponse();

      await eventController.deleteEvent(req, res, mockNext);

      expect(eventService.deleteEvent).toHaveBeenCalledWith(
        'event123',
        'user1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event deleted successfully',
        })
      );
    });

    it('should call next with error on delete failure', async () => {
      const error = new Error('Unauthorized');
      eventService.deleteEvent.mockRejectedValue(error);

      const req = { params: { id: 'event123' }, user: { id: 'user1' } };
      const res = mockResponse();

      await eventController.deleteEvent(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getEventsByAgentId
  // ─────────────────────────────────────────────────────────────
  describe('getEventsByAgentId', () => {
    it('should return events for an agent with 200 status', async () => {
      const mockResult = { events: [{ _id: 'e1' }], pagination: { total: 1 } };
      eventService.getEventsByAgentId.mockResolvedValue(mockResult);

      const req = {
        params: { agentId: 'agent1' },
        query: { page: '1', limit: '10', status: 'UPCOMING' },
      };
      const res = mockResponse();

      await eventController.getEventsByAgentId(req, res, mockNext);

      expect(eventService.getEventsByAgentId).toHaveBeenCalledWith(
        'agent1',
        1,
        10,
        'UPCOMING'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Agent not found');
      eventService.getEventsByAgentId.mockRejectedValue(error);

      const req = { params: { agentId: 'bad' }, query: {} };
      const res = mockResponse();

      await eventController.getEventsByAgentId(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
