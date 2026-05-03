const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }, // single-node replica set
  });

  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
};

const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

const clearDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }
};

module.exports = {
  connectDB,
  closeDB,
  clearDB,
};