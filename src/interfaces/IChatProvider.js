/**
 * IChatProvider Interface (SOLID - Dependency Inversion)
 * Defines contract for chat message providers
 * Firebase can be replaced with any other provider implementing this interface
 */
class IChatProvider {
  /**
   * Register a new chat group in the provider
   * @param {string} chatGroupId - The chat group ID
   * @param {Object} groupData - Group metadata {name, type}
   * @returns {Promise<void>}
   */
  async createChatGroup(chatGroupId, groupData) {
    throw new Error('Method not implemented');
  }

  /**
   * Send a message to a chat group
   * @param {string} chatGroupId - The chat group ID
   * @param {Object} messageData - Message data {senderId, text, mediaUrl}
   * @returns {Promise<Object>} - Created message with ID
   */
  async sendMessage(chatGroupId, messageData) {
    throw new Error('Method not implemented');
  }

  /**
   * Get messages from a chat group
   * @param {string} chatGroupId - The chat group ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} - Array of messages
   */
  async getMessages(chatGroupId, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete a message
   * @param {string} chatGroupId - The chat group ID
   * @param {string} messageId - The message ID
   * @returns {Promise<void>}
   */
  async deleteMessage(chatGroupId, messageId) {
    throw new Error('Method not implemented');
  }

  /**
   * Mark message as seen
   * @param {string} chatGroupId - The chat group ID
   * @param {string} messageId - The message ID
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async markMessageSeen(chatGroupId, messageId, userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get unread message count
   * @param {string} chatGroupId - The chat group ID
   * @param {string} userId - The user ID
   * @returns {Promise<number>} - Number of unread messages
   */
  async getUnreadCount(chatGroupId, userId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IChatProvider;
