class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    try {
      return await this.model.create(data);
    } catch (error) {
      console.error('Error in BaseRepository.create:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return await this.model.findById(id);
    } catch (error) {
      console.error('Error in BaseRepository.findById:', error);
      throw error;
    }
  }

  async findOne(filter) {
    try {
      return await this.model.findOne(filter);
    } catch (error) {
      console.error('Error in BaseRepository.findOne:', error);
      throw error;
    }
  }

  async find(filter = {}) {
    try {
      return await this.model.find(filter);
    } catch (error) {
      console.error('Error in BaseRepository.find:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      return await this.model.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      console.error('Error in BaseRepository.update:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      console.error('Error in BaseRepository.delete:', error);
      throw error;
    }
  }

  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      console.error('Error in BaseRepository.count:', error);
      throw error;
    }
  }
}

module.exports = BaseRepository;
