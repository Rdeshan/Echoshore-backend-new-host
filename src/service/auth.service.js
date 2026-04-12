const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const chatService = require('./chat.service');
const { ROLES } = require('../constants/roles');
const logger = require('../config/logger');
const { sendAgentCredentialsEmail } = require('../config/email');
const { generateRandomSixDigit } = require('../utils/random');

const buildArchivedEmail = (email, userId) => {
  const [local = 'deleted', domain = 'deleted.local'] = String(email).split('@');
  return `${local}+deleted-${Date.now()}-${userId}@${domain}`;
};

const buildArchivedNic = (nic, userId) => {
  return `${nic}-deleted-${Date.now()}-${userId}`;
};

const archiveDeletedIdentityIfNeeded = async ({ email, nic }) => {
  const orConditions = [{ email, isDeleted: true }];
  if (nic) {
    orConditions.push({ nic, isDeleted: true });
  }

  const deletedUser = await User.findOne({ $or: orConditions });
  if (!deletedUser) {
    return;
  }

  if (deletedUser.email === email) {
    deletedUser.email = buildArchivedEmail(deletedUser.email, deletedUser._id);
  }

  if (nic && deletedUser.nic === nic) {
    deletedUser.nic = buildArchivedNic(deletedUser.nic, deletedUser._id);
  }

  await deletedUser.save();
};

const registerUser = async ({
  email,
  password,
  name,
  address,
  phone,
  role,
}) => {
  await archiveDeletedIdentityIfNeeded({ email });

  const existingUser = await User.findOne({ email, isDeleted: false });
  if (existingUser) {
    throw new Error('USER_EXISTS');
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hashed,
    name,
    address,
    phone,
    role: role || ROLES.VOLUNTEER,
  });

  await user.save();

  // Auto-add to GLOBAL_VOLUNTEER group
  try {
    await chatService.addToGlobalVolunteerGroup(user._id.toString());
  } catch (error) {
    logger.error('Failed to add user to global volunteer group:', error);
    // Don't fail registration if chat group assignment fails
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (user.isDeleted) {
    throw new Error('ACCOUNT_DELETED');
  }

  if (!user.isActive) {
    throw new Error('ACCOUNT_DEACTIVATED');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const findOrCreateGoogleUser = async (profile) => {
  const email = profile.emails?.[0]?.value;

  let user = await User.findOne({ googleId: profile.id });
  if (user) return user;

  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = profile.id;
      await user.save();
      return user;
    }
  }

  // Create new user
  user = await User.create({
    googleId: profile.id,
    email,
    name: profile.displayName,
    role: ROLES.VOLUNTEER,
  });

  // Auto-add to GLOBAL_VOLUNTEER group
  try {
    await chatService.addToGlobalVolunteerGroup(user._id.toString());
  } catch (error) {
    logger.error('Failed to add user to global volunteer group:', error);
    // Don't fail registration if chat group assignment fails
  }

  return user;
};

const registerAgent = async ({ email, password, name, nic, assignedBeach }) => {
  await archiveDeletedIdentityIfNeeded({ email, nic });

  const existingEmail = await User.findOne({ email, isDeleted: false });
  if (existingEmail) {
    throw new Error('USER_EXISTS');
  }

  const existingNic = await User.findOne({ nic, isDeleted: false });
  if (existingNic) {
    throw new Error('NIC_EXISTS');
  }

  const Beach = require('../models/Beach');
  const beach = await Beach.findById(assignedBeach);
  if (!beach || !beach.isActive) {
    throw new Error('BEACH_NOT_FOUND');
  }

  // Check real active assignment count from users (ignores stale beach refs).
  const activeAgentsOnBeach = await User.find({
    assignedBeach,
    role: ROLES.AGENT,
    isDeleted: false,
  })
    .select('_id')
    .lean();

  if (activeAgentsOnBeach.length >= 2) {
    throw new Error('BEACH_MAX_AGENTS');
  }

  const plainPassword = generateRandomSixDigit();
  const hashed = await bcrypt.hash(plainPassword, 10);

  const agent = new User({
    email,
    password: hashed,
    name,
    nic,
    assignedBeach,
    role: 'agent',
  });

  await agent.save();

  // Keep beach assignment ids in sync with live agent records.
  const syncedAgentIds = [...new Set([...activeAgentsOnBeach.map((a) => a._id.toString()), agent._id.toString()])];
  beach.assignedAgents = syncedAgentIds;
  await beach.save();

  // Send agent credentials email
  // Send email in the background so agent creation response is fast.
  setImmediate(async () => {
    try {
      await sendAgentCredentialsEmail(email, {
        email,
        password: plainPassword,
        name,
      });
    } catch (emailError) {
      logger.error(
        'Failed to send agent credentials email, but agent was created:',
        emailError
      );
    }
  });

  return {
    agent: {
      id: agent._id,
      email: agent.email,
      name: agent.name,
      nic: agent.nic,
      assignedBeach: agent.assignedBeach,
      role: agent.role,
    },
  };
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!user.password) {
    throw new Error('NO_PASSWORD_SET');
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error('INVALID_OLD_PASSWORD');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  return { message: 'Password updated successfully' };
};

const deleteAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new Error('USER_NOT_FOUND');
  }

  if (user.role === ROLES.AGENT && user.assignedBeach) {
    const Beach = require('../models/Beach');
    await Beach.findByIdAndUpdate(user.assignedBeach, {
      $pull: { assignedAgents: user._id },
    });
    user.assignedBeach = null;
  }

  user.email = buildArchivedEmail(user.email, user._id);
  if (user.nic) {
    user.nic = buildArchivedNic(user.nic, user._id);
  }
  user.isDeleted = true;
  await user.save();
  return { message: 'Account deleted successfully' };
};

module.exports = {
  registerUser,
  loginUser,
  findOrCreateGoogleUser,
  registerAgent,
  changePassword,
  deleteAccount,
};
