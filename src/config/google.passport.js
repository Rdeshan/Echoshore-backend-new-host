const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const { findOrCreateGoogleUser } = require('../service/auth.service');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await findOrCreateGoogleUser(profile);
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

module.exports = passport;
