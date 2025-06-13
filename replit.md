# replit.md

## Overview

This is a currency exchange rate comparison application built with Node.js, Express, and Drizzle ORM. The application allows users to compare exchange rates from various providers across 15 major currency corridors (GBP/EUR/USD to NGN/GHS/KES/INR/PKR), view historical rate trends, and set up rate alerts via email notifications.

## System Architecture

### Frontend Architecture
- **Framework**: Vite-powered React application with TypeScript
- **UI Components**: Custom components with Shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Query for server state management
- **Routing**: Client-side routing for single-page application experience

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful endpoints with JSON responses
- **Data Collection**: Multi-source rate aggregation (Alpha Vantage API, web scraping)
- **Scheduling**: Background jobs for rate updates and data maintenance

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **Tables**:
  - `rate_trends`: Historical exchange rate data with source attribution
  - `exchange_rates`: Current rates from providers with verification status
  - `providers`: Money transfer service configurations
  - `rate_cache`: Cached current rates for performance
  - `rate_alerts`: User email notification preferences
  - `users`: User authentication and preferences
  - `system_settings`: Application configuration

## Key Components

### Rate Collection System
- **Alpha Vantage Integration**: Fetches authentic historical FX data for 15 currency pairs
- **Provider Rate Scraping**: Automated collection from money transfer services
- **Data Verification**: Admin verification system for rate accuracy
- **Source Attribution**: Tracks data provenance (alpha_vantage, scraper, manual)

### Historical Data Management
- **Trend Analysis**: 2+ years of historical data for chart visualization
- **Data Protection**: Integrity monitoring to prevent regression during updates
- **Backup System**: CSV exports and restore scripts for data protection

### Rate Alert System
- **Email Notifications**: Users can set alerts for target exchange rates
- **Trigger Types**: Both absolute value and percentage-based alerts
- **Alert Basis**: Choose between official rates or best provider rates

### Admin Dashboard
- **Rate Verification**: Manual verification of suspicious rates
- **Provider Management**: Configure and manage money transfer providers
- **Data Monitoring**: View data integrity status and perform manual updates

## Data Flow

1. **Rate Collection**: Scheduled jobs fetch current rates from multiple sources
2. **Data Validation**: Rates are validated for reasonableness and flagged for review
3. **Storage**: Verified rates stored in database with source attribution
4. **API Serving**: Frontend queries rates via REST endpoints
5. **Alert Processing**: Background job checks for triggered rate alerts
6. **Historical Tracking**: Daily rate snapshots build trend data over time

## External Dependencies

### APIs and Services
- **Alpha Vantage**: Primary source for historical FX data (requires API key)
- **Exchange Rate APIs**: Fallback sources for current rates
- **Email Service**: For rate alert notifications
- **Web Scraping**: Direct provider rate collection

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **Neon Database**: Serverless PostgreSQL hosting
- **Vite**: Frontend build tool and development server

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16 module
- **Build Process**: `npm run build` compiles frontend and backend
- **Start Command**: `npm run start` for production server
- **Development**: `npm run dev` with hot reload on port 5000

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `ALPHA_VANTAGE_API_KEY`: Historical rate data access
- `EXCHANGE_API_KEY`: Fallback rate API access

### Database Setup
- Automatic table creation on first run
- Migration system for schema updates
- Data seeding for initial provider configuration

## Recent Changes

### June 12, 2025 - Personalized Feature Discovery System
- Replaced static onboarding tour with intelligent PersonalizedWizard component
- Implemented context-aware help system that analyzes user behavior patterns
- Added adaptive logic based on user preferences and completion status
- Configured respectful trigger timing (30-second delay minimum)
- Added user choice respect mechanism for dismissal and skipping
- Removed visible help buttons from interface to prevent spam
- Added CSS highlighting effects for guided feature discovery

### June 13, 2025 - Account Creation Encouragement
- Added AccountPrompt component for non-logged-in users
- Subtle encouragement to create accounts for personalized features
- Respectful timing (45-second delay, 24-hour cooldown between shows)
- Shows after user engagement (3+ visits or has compared rates)
- Highlights key benefits: rate alerts, trend analysis, saved preferences

## Changelog
- June 12, 2025. Initial setup with personalized wizard system

## User Preferences

### Communication Style
- Simple, everyday language
- Non-intrusive help system
- Respect user choice to dismiss or skip suggestions
- No spam or aggressive prompting
- At least 30 seconds before showing any help suggestions