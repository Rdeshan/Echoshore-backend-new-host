const BaseRepository = require('./base.repository');
const User = require('../models/User');

class AgentRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findAllAgents() {
    return this.model
      .find({ role: 'agent' })
      .select('-password -googleId')
      .populate('assignedBeach', 'name location isActive')
      .sort({ createdAt: -1 });
  }

  async findAgentById(agentId) {
    return this.model
      .findOne({ _id: agentId, role: 'agent' })
      .select('-password -googleId')
      .populate('assignedBeach', 'name location isActive');
  }

  async findAgentsByBeach(beachId) {
    return this.model
      .find({ role: 'agent', assignedBeach: beachId })
      .select('-password -googleId');
  }
}

module.exports = new AgentRepository();
