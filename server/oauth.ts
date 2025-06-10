import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { Express } from 'express';
import { storage } from './databaseStorage';

export function setupOAuth(app: Express) {
  const hasGoogleCreds = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  console.log('Setting up OAuth with Google credentials:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    willSetupGoogle: hasGoogleCreds
  });

  // Google OAuth Strategy - only if credentials are available
  if (hasGoogleCreds) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Check if user exists by email
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
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
        return done(error);
      }
    }));

    // Google OAuth Routes
    app.get('/api/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
      (req, res) => {
        res.redirect('/');
      }
    );
  } else {
    // Fallback routes when Google OAuth is not configured
    app.get('/api/auth/google', (req, res) => {
      res.redirect('/login?error=google_not_configured');
    });
    
    app.get('/api/auth/google/callback', (req, res) => {
      res.redirect('/login?error=google_not_configured');
    });
  }

  // GitHub OAuth - Temporarily disabled
  // Will be enabled when GitHub credentials are provided
}