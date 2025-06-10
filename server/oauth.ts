import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { Express } from 'express';
import { storage } from './databaseStorage';

export function setupOAuth(app: Express) {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists by email
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        let user = await storage.getUserByEmail(email);
        
        if (user) {
          // Update existing user with Google info
          user = await storage.updateUser(user.id, {
            firstName: profile.name?.givenName || user.firstName,
            lastName: profile.name?.familyName || user.lastName,
            profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
          });
        } else {
          // Create new user
          user = await storage.createUser({
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImageUrl: profile.photos?.[0]?.value || null,
            password: '', // No password needed for OAuth users
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists by email
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in GitHub profile'), null);
        }

        let user = await storage.getUserByEmail(email);
        
        if (user) {
          // Update existing user with GitHub info
          user = await storage.updateUser(user.id, {
            firstName: profile.displayName?.split(' ')[0] || user.firstName,
            lastName: profile.displayName?.split(' ').slice(1).join(' ') || user.lastName,
            profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
          });
        } else {
          // Create new user
          const nameParts = profile.displayName?.split(' ') || ['', ''];
          user = await storage.createUser({
            email,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            profileImageUrl: profile.photos?.[0]?.value || null,
            password: '', // No password needed for OAuth users
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // OAuth Routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  app.get('/api/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );

  app.get('/api/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login?error=github_auth_failed' }),
    (req, res) => {
      res.redirect('/');
    }
  );
}