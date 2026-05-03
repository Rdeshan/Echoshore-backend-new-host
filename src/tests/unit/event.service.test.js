const eventService = require('../../service/event.service');
const Event = require('../../models/Event');
const User = require('../../models/User');
const chatService = require('../../service/chat.service');
const { AppError } = require('../../utils/AppError');
const { ROLES } = require('../../constants/roles');

jest.mock('../../models/Event');
jest.mock('../../models/User');
jest.mock('../../service/chat.service');

// ---------- helpers ----------
const makeSession = () => ({
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
});

describe('Event Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // createEvent
  // ─────────────────────────────────────────────────────────────
  describe('createEvent', () => {
    it('should create an event and chat group successfully', async () => {
      const organizerId = '507f1f77bcf86cd799439011';
      const eventData = { title: 'Cleanup' };

      User.findById.mockResolvedValue({ _id: organizerId, role: ROLES.ORGANIZER });

      const session = makeSession();
      Event.startSession.mockResolvedValue(session);

      const mockEvent = [
        {
          _id: 'event123',
          title: 'Cleanup',
          organizerId,
          save: jest.fn().mockResolvedValue(true),
        },
      ];
      Event.create.mockResolvedValue(mockEvent);

      chatService.createChatGroup.mockResolvedValue({ _id: 'chat123' });

      Event.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ ...mockEvent[0], chatGroupId: 'chat123' }),
      });

      const result = await eventService.createEvent(organizerId, eventData);

      expect(User.findById).toHaveBeenCalledWith(organizerId);
      expect(Event.create).toHaveBeenCalled();
      expect(chatService.createChatGroup).toHaveBeenCalled();
      expect(result.chatGroupId).toBe('chat123');
      expect(session.commitTransaction).toHaveBeenCalled();
    });

    it('should throw AppError if user is not organizer or admin', async () => {
      const organizerId = '507f1f77bcf86cd799439011';
      User.findById.mockResolvedValue({ _id: organizerId, role: ROLES.VOLUNTEER });

      await expect(eventService.createEvent(organizerId, {})).rejects.toThrow(AppError);
    });

    it('should throw AppError if organizer is not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        eventService.createEvent('507f1f77bcf86cd799439011', {})
      ).rejects.toThrow(AppError);
    });

    it('should abort transaction and rethrow on error', async () => {
      const organizerId = '507f1f77bcf86cd799439011';
      User.findById.mockResolvedValue({ _id: organizerId, role: ROLES.ORGANIZER });

      const session = makeSession();
      Event.startSession.mockResolvedValue(session);
      Event.create.mockRejectedValue(new Error('DB error'));

      await expect(eventService.createEvent(organizerId, { title: 'X' })).rejects.toThrow(
        'DB error'
      );
      expect(session.abortTransaction).toHaveBeenCalled();
      expect(session.endSession).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getEvents
  // ─────────────────────────────────────────────────────────────
  describe('getEvents', () => {
    it('should retrieve list of events with pagination', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ title: 'Event' }]),
      };

      Event.find.mockReturnValue(mockQuery);
      Event.countDocuments.mockResolvedValue(1);

      const result = await eventService.getEvents({ status: 'UPCOMING' }, 1, 10);

      expect(Event.find).toHaveBeenCalledWith({ isDeleted: false, status: 'UPCOMING' });
      expect(result.events).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.pages).toBe(1);
    });

    it('should apply organizerId filter when provided', async () => {
      const orgId = '507f1f77bcf86cd799439011';
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Event.find.mockReturnValue(mockQuery);
      Event.countDocuments.mockResolvedValue(0);

      await eventService.getEvents({ organizerId: orgId }, 1, 10);

      expect(Event.find).toHaveBeenCalledWith(
        expect.objectContaining({ organizerId: orgId })
      );
    });

    it('should return correct page metadata', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(new Array(10).fill({ title: 'E' })),
      };
      Event.find.mockReturnValue(mockQuery);
      Event.countDocuments.mockResolvedValue(25);

      const result = await eventService.getEvents({}, 2, 10);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pages).toBe(3);
      expect(result.pagination.limit).toBe(10);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getEventById
  // ─────────────────────────────────────────────────────────────
  describe('getEventById', () => {
    it('should return event when found', async () => {
      const eventId = '507f1f77bcf86cd799439012';
      Event.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: eventId, title: 'Cleanup' }),
      });

      const result = await eventService.getEventById(eventId);

      expect(result._id).toBe(eventId);
    });

    it('should throw AppError when event is not found', async () => {
      Event.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        eventService.getEventById('507f1f77bcf86cd799439099')
      ).rejects.toThrow(AppError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // updateEvent
  // ─────────────────────────────────────────────────────────────
  describe('updateEvent', () => {
    const eventId = '507f1f77bcf86cd799439012';
    const userId = '507f1f77bcf86cd799439011';

    it('should allow the organizer to update the event', async () => {
      const mockSave = jest.fn();
      Event.findOne.mockResolvedValue({
        _id: eventId,
        organizerId: { toString: () => userId },
        save: mockSave,
      });
      User.findById.mockResolvedValue({ role: ROLES.ORGANIZER });

      Event.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: eventId, title: 'Updated' }),
      });

      const result = await eventService.updateEvent(eventId, userId, { title: 'Updated' });

      expect(mockSave).toHaveBeenCalled();
      expect(result.title).toBe('Updated');
    });

    it('should allow an admin to update the event', async () => {
      const adminId = '507f1f77bcf86cd799439022';
      const mockSave = jest.fn();
      Event.findOne.mockResolvedValue({
        _id: eventId,
        organizerId: { toString: () => userId }, // different user
        save: mockSave,
      });
      User.findById.mockResolvedValue({ role: ROLES.ADMIN });

      Event.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: eventId, title: 'Admin Updated' }),
      });

      const result = await eventService.updateEvent(eventId, adminId, {
        title: 'Admin Updated',
      });

      expect(mockSave).toHaveBeenCalled();
      expect(result.title).toBe('Admin Updated');
    });

    it('should throw AppError if user is not organizer or admin', async () => {
      const otherId = '507f1f77bcf86cd799439033';
      Event.findOne.mockResolvedValue({
        _id: eventId,
        organizerId: { toString: () => userId },
        save: jest.fn(),
      });
      User.findById.mockResolvedValue({ role: ROLES.VOLUNTEER });

      await expect(
        eventService.updateEvent(eventId, otherId, { title: 'Hack' })
      ).rejects.toThrow(AppError);
    });

    it('should throw AppError if event not found', async () => {
      Event.findOne.mockResolvedValue(null);

      await expect(
        eventService.updateEvent(eventId, userId, { title: 'X' })
      ).rejects.toThrow(AppError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // assignAgent
  // ─────────────────────────────────────────────────────────────
  describe('assignAgent', () => {
    const eventId = '507f1f77bcf86cd799439012';
    const agentId = '507f1f77bcf86cd799439013';
    const beachId = '507f1f77bcf86cd799439014';

    it('should assign an agent that belongs to the same beach', async () => {
      const mockSave = jest.fn();
      Event.findOne.mockResolvedValue({
        _id: eventId,
        beachId: { toString: () => beachId },
        save: mockSave,
      });
      User.findOne.mockResolvedValue({
        _id: agentId,
        role: ROLES.AGENT,
        assignedBeach: { toString: () => beachId },
      });
      Event.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: eventId, agentId }),
      });

      const result = await eventService.assignAgent(eventId, agentId);

      expect(mockSave).toHaveBeenCalled();
      expect(result.agentId).toBe(agentId);
    });

    it('should throw AppError when event not found', async () => {
      Event.findOne.mockResolvedValue(null);

      await expect(eventService.assignAgent(eventId, agentId)).rejects.toThrow(AppError);
    });

    it('should throw AppError when agent not found or wrong role', async () => {
      Event.findOne.mockResolvedValue({ _id: eventId, beachId: { toString: () => beachId } });
      User.findOne.mockResolvedValue(null);

      await expect(eventService.assignAgent(eventId, agentId)).rejects.toThrow(AppError);
    });

    it('should throw AppError when agent is assigned to a different beach', async () => {
      Event.findOne.mockResolvedValue({
        _id: eventId,
        beachId: { toString: () => beachId },
        save: jest.fn(),
      });
      User.findOne.mockResolvedValue({
        _id: agentId,
        role: ROLES.AGENT,
        assignedBeach: { toString: () => 'different-beach-id' },
      });

      await expect(eventService.assignAgent(eventId, agentId)).rejects.toThrow(AppError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // joinEvent
  // ─────────────────────────────────────────────────────────────
  describe('joinEvent', () => {
    const eventId = '507f1f77bcf86cd799439012';
    const userId = '507f1f77bcf86cd799439013';

    it('should allow volunteer to join and add them to chat', async () => {
      const mockEvent = {
        _id: eventId,
        status: 'UPCOMING',
        volunteers: [],
        chatGroupId: 'chat123',
        organizerId: 'org123',
        save: jest.fn(),
      };
      Event.findOne.mockResolvedValue(mockEvent);

      const session = makeSession();
      Event.startSession.mockResolvedValue(session);

      Event.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockEvent),
      });

      await eventService.joinEvent(eventId, userId);

      expect(mockEvent.volunteers).toContain(userId);
      expect(mockEvent.save).toHaveBeenCalled();
      expect(chatService.addMember).toHaveBeenCalledWith('chat123', userId, 'org123');
    });

    it('should throw AppError if event is not UPCOMING', async () => {
      Event.findOne.mockResolvedValue({
        _id: eventId,
        status: 'COMPLETED',
        volunteers: [],
      });

      await expect(eventService.joinEvent(eventId, userId)).rejects.toThrow(AppError);
    });

    it('should throw AppError if user already joined', async () => {
      Event.findOne.mockResolvedValue({
        _id: eventId,
        status: 'UPCOMING',
        volunteers: [{ toString: () => userId }],
      });

      await expect(eventService.joinEvent(eventId, userId)).rejects.toThrow(AppError);
    });

    it('should throw AppError if event is full', async () => {
      Event.findOne.mockResolvedValue({
        _id: eventId,
        status: 'UPCOMING',
        maxVolunteers: 2,
        volunteers: [
          { toString: () => 'other1' },
          { toString: () => 'other2' },
        ],
      });

      await expect(eventService.joinEvent(eventId, userId)).rejects.toThrow(AppError);
    });

    it('should throw AppError if event not found', async () => {
      Event.findOne.mockResolvedValue(null);

      await expect(eventService.joinEvent(eventId, userId)).rejects.toThrow(AppError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // leaveEvent
  // ─────────────────────────────────────────────────────────────
  describe('leaveEvent', () => {
    const eventId = '507f1f77bcf86cd799439012';
    const userId = '507f1f77bcf86cd799439013';

    it('should remove volunteer from event and chat group', async () => {
      const mockSave = jest.fn();
      const mockEvent = {
        _id: eventId,
        chatGroupId: 'chat123',
        organizerId: 'org123',
        volunteers: [{ toString: () => userId }, { toString: () => 'other' }],
        save: mockSave,
      };
      Event.findOne.mockResolvedValue(mockEvent);

      const session = makeSession();
      Event.startSession.mockResolvedValue(session);

      const result = await eventService.leaveEvent(eventId, userId);

      expect(mockSave).toHaveBeenCalled();
      expect(chatService.removeMember).toHaveBeenCalledWith('chat123', userId, userId);
      expect(result.message).toBe('Left event successfully');
    });

    it('should throw AppError if user has not joined', async () => {
      Event.findOne.mockResolvedValue({
        _id: eventId,
        volunteers: [{ toString: () => 'someoneElse' }],
      });

      await expect(eventService.leaveEvent(eventId, userId)).rejects.toThrow(AppError);
    });

    it('should throw AppError if event not found', async () => {
      Event.findOne.mockResolvedValue(null);

      await expect(eventService.leaveEvent(eventId, userId)).rejects.toThrow(AppError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // deleteEvent
  // ─────────────────────────────────────────────────────────────
  describe('deleteEvent', () => {
    const eventId = '507f1f77bcf86cd799439012';
    const userId = '507f1f77bcf86cd799439011';

    it('should soft-delete the event when called by organizer', async () => {
      const mockSave = jest.fn();
      Event.findOne.mockResolvedValue({
        _id: eventId,
        organizerId: { toString: () => userId },
        isDeleted: false,
        save: mockSave,
      });
      User.findById.mockResolvedValue({ role: ROLES.ORGANIZER });

      const result = await eventService.deleteEvent(eventId, userId);

      expect(mockSave).toHaveBeenCalled();
      expect(result.message).toBe('Event deleted successfully');
    });

    it('should throw AppError if user is not authorized', async () => {
      const otherId = '507f1f77bcf86cd799439033';
      Event.findOne.mockResolvedValue({
        _id: eventId,
        organizerId: { toString: () => userId },
        save: jest.fn(),
      });
      User.findById.mockResolvedValue({ role: ROLES.VOLUNTEER });

      await expect(eventService.deleteEvent(eventId, otherId)).rejects.toThrow(AppError);
    });

    it('should throw AppError if event is not found', async () => {
      Event.findOne.mockResolvedValue(null);

      await expect(eventService.deleteEvent(eventId, userId)).rejects.toThrow(AppError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getEventsByAgentId
  // ─────────────────────────────────────────────────────────────
  describe('getEventsByAgentId', () => {
    const agentId = '507f1f77bcf86cd799439015';

    it('should return events assigned to a specific agent with pagination', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ title: 'Agent Event' }]),
      };
      Event.find.mockReturnValue(mockQuery);
      Event.countDocuments.mockResolvedValue(1);

      const result = await eventService.getEventsByAgentId(agentId, 1, 10);

      expect(Event.find).toHaveBeenCalledWith(
        expect.objectContaining({ agentId, isDeleted: false })
      );
      expect(result.events).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply status filter when provided', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Event.find.mockReturnValue(mockQuery);
      Event.countDocuments.mockResolvedValue(0);

      await eventService.getEventsByAgentId(agentId, 1, 10, 'UPCOMING');

      expect(Event.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'UPCOMING' })
      );
    });

    it('should ignore invalid status values', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Event.find.mockReturnValue(mockQuery);
      Event.countDocuments.mockResolvedValue(0);

      await eventService.getEventsByAgentId(agentId, 1, 10, 'INVALID_STATUS');

      const callArg = Event.find.mock.calls[0][0];
      expect(callArg.status).toBeUndefined();
    });
  });
});
