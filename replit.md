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

### July 9, 2025 - Phase 4: Revolutionary "Sabi Buzz" Personality System Complete
- Completely transformed AI commentary from boring analysis to relatable friend advice as platform USP
- AI now sounds like texting a close friend: "OMG!", "You won't believe this", "Seriously?!", "This is HUGE!"
- Enhanced system prompts to be genuinely excited and use relatable expressions
- Commentary examples: "WAIT! Pesa is beating others by 3.3%! That's free money!"
- Added personality-driven fallback with 4+ variations: urgency, excitement, genuine care, insider tips
- Phrases like "Trust me on this", "Plot twist!", "Your wallet will thank you!", "Zero drama, just good rates!"
- Maximum 25 words per comment with emoji usage for extra personality
- Temperature optimized for natural, varied, authentic responses
- System now delivers relatable, informative, engaging, and actionable insights as core platform differentiator
- Addresses critical USP requirement: commentary must have personality and be relatable to drive user engagement

### July 8, 2025 - Phase 2.1: Footer Contrast Enhancement Complete
- Fixed critical contrast issues in footer for better accessibility and readability
- Updated background gradient from gray-800/gray-700 to gray-900/gray-800 for darker base
- Enhanced text contrast: all gray-300/gray-400 text upgraded to gray-200 for better visibility
- Improved border contrast: footer border changed from gray-800 to gray-700
- All footer text now meets WCAG accessibility standards for contrast ratios
- Maintains visual hierarchy while ensuring excellent readability against dark background

### July 8, 2025 - Phase 3: Complete FAQ Branding Consistency Achieved
- Fixed all remaining "TransferCompare" references to "SabiSend" throughout application
- Updated FAQ section in HowItWorks.tsx: 3 question titles and 2 answer descriptions
- Changed theme storage key from "transfercompare-theme" to "sabisend-theme" in App.tsx
- Achieved 100% brand consistency across entire user-facing application
- Addresses third priority from user testing workshop feedback: FAQ branding inconsistency
- No functionality impact - purely branding alignment for professional presentation

### July 8, 2025 - Phase 2: Bottom Section Readability Improvements Complete
- Fixed critical nested anchor tag accessibility issues in Footer component
- Eliminated all `<Link><a>` nested structures causing browser console warnings
- Updated footer branding from "TransferCompare" to "SabiSend" for consistency
- Enhanced visual typography: stronger headings (text-white), improved text contrast (gray-300)
- Increased icon sizes and padding for better visual hierarchy in value propositions
- Improved line spacing with "leading-relaxed" for better content readability
- Simplified link structure by moving styling directly to Link components
- Addressed all accessibility violations in bottom section navigation
- Part of systematic user experience improvements from user testing workshop feedback

### July 8, 2025 - Comprehensive British English Localisation Phase 1 Complete
- Systematically converted American to British English spelling throughout user-facing content
- Updated 15+ components with proper UK spellings: "personalised", "optimisation", "maximise", "prioritise", "favourite"
- Fixed spelling in PersonalizedWizard, PersonalizedDashboard, HowItWorks, ContactUs, CommentaryScheduler, AdminPage components
- Updated AccountPrompt, AccountCreationBanner, and UserProfileNew components for UK audience
- Maintained technical terms and CSS class names unchanged (gray, center, color in code contexts)
- Preserved JSON-LD schema "Organization" spelling as required by technical standards
- Part of systematic UK market localisation addressing user testing workshop feedback
- No functionality regression - purely language conversion for better UK market fit

### June 30, 2025 - Complete Multi-Provider Rate Trends Implementation
- Fixed EnhancedRateTrends component to display all 20 providers with proper multi-select functionality
- Resolved initial issue where only 2 providers (Wise, WorldRemit) were shown by default
- Component now dynamically loads all providers from database and displays them in checkbox interface
- Implemented automatic selection of first 3 providers for better initial user experience
- Enhanced provider color palette to support 25+ providers with distinct visual identification
- Multi-select interface includes provider count display and select all/clear all functionality
- Chart successfully displays both base rates (solid blue) and multiple provider rates (dashed colored lines)
- API endpoint `/api/provider-rate-trends` working perfectly with dynamic provider filtering
- Test page at `/enhanced-trends-test` demonstrates full functionality with all 20 providers available
- Users can now compare unlimited combinations of providers against base rates
- Component maintains responsive design with scrollable provider list for better usability
- All providers properly color-coded: Wise, WorldRemit, Western Union, Skrill, Sendwave, ACE Money Transfer, and 14 others
- No regression to existing functionality - enhanced the working component rather than rebuilding

### June 21, 2025 - Completed 5-Variant Commentary System with Real Provider Data
- Successfully implemented 5 distinct commentary variants per currency pair as requested
- Fixed commentary system to generate authentic data-driven insights using current exchange rate data
- Eliminated all hardcoded commentary values - system now uses real-time provider rates exclusively
- Commentary variants provide different perspectives: market spread analysis, provider leadership, competitive positioning, trend analysis, and value optimization
- All 75 commentary variants (15 currency pairs × 5 variants each) generated and cached successfully
- Automated daily generation at 12:00 PM UTC with 30-minute execution window
- Manual admin trigger available for immediate commentary refresh
- Sample GBP/NGN variants: "GBP/NGN shows 3.7% provider spread - Profee leads at 2168" through "Current GBP/NGN trends favor Profee for optimal transfer value"
- Fixed data deduplication to process 15 unique provider rates instead of 2400+ duplicates
- Realistic spread calculations: GBP/NGN at 3.7%, EUR/NGN at 37.9%, GBP/KES at 1.9%
- Commentary serves random variants from cache to provide variety while maintaining data accuracy
- System now delivers intelligent market insights based on authentic provider competition data

### June 19, 2025 - Account Creation Encouragement Banner
- Added compact AccountCreationBanner component above Hero section for non-logged-in users
- Features clear value proposition highlighting personalized features (alerts, trends, saved preferences)
- Responsive design with benefits icons and prominent "Sign Up Free" CTA button
- Strategic positioning to maximize visibility and encourage account creation
- Minimal space usage while maintaining strong visual appeal
- Fixed authentication redirect issue in banner button to use correct login endpoint

### June 19, 2025 - Results Page Currency Symbol Enhancement
- Enhanced results pages to display proper currency symbols instead of currency codes
- Updated EnhancedComparisonResults component to accept dynamic fromCurrency/toCurrency props
- Implemented comprehensive currency symbol mapping for all supported currencies (£, €, $, ₦, KSh, ₵, ₹, ₨)
- Results now format amounts with appropriate symbols and decimal precision for each currency type
- Improved visual presentation and user experience across all currency corridors

### June 19, 2025 - Homepage Calculator Navigation Fix
- Fixed homepage calculator defaulting to GBP/NGN regardless of user currency selection
- Applied same pattern used in PersonalizedDashboard for consistent navigation behavior
- Changed from static Link component to programmatic navigation using useLocation hook
- Updated Results page to support both parameter formats (fromCurrency/toCurrency and from/to) for compatibility
- Calculator now properly respects user currency selections and navigates to correct comparison results

### June 19, 2025 - Sabi Buzz: Data-Driven Market Insights System (USP Feature)
- Transformed commentary system to focus on real market data analysis and actionable insights
- Integrated with live database to analyze actual provider rates, spreads, and market movements
- AI prompts enhanced to provide data-driven commentary based on provider performance and rate changes
- Commentary examples: "Wise leads with 2.1% better rates than market average", "Provider spread at 3.2% suggests competitive conditions"
- Real-time analysis of rate advantages, position changes, and market competitiveness
- Added dismissible toast notifications on homepage and personalized dashboard
- Integrated as prominent feature in AI Insights tab of personalized dashboard
- System generates meaningful insights for customers making transfer decisions
- Positioned as intelligent market analysis tool distinguishing platform from basic rate comparison sites

### June 18, 2025 - Enhanced Daily Rate Collection and API Integration
- Fixed Provider API Scheduler routing regression caused by duplicated path segments
- Successfully integrated Wise API with complete database storage for all 15 currency pairs
- Updated daily increment system to capture latest rates instead of first-of-day rates
- Wise API now collecting authentic rates: GBP/NGN (2113.78), EUR/NGN (1808.55), etc.
- Enhanced database verification to actually save API rates to exchange_rates table
- Daily increment scheduler now updates existing entries with latest Alpha Vantage rates
- Maintained data integrity while ensuring most current rates are captured each day
- Optimized Provider API Scheduler timing mechanism: now checks for missed runs immediately on startup and executes catch-up collections automatically
- Reduced scheduler frequency from every 2 minutes to every 30 minutes (15x more efficient)
- Implemented smart missed-run detection that executes immediately when scheduled time has passed

### June 16, 2025 - Enhanced Daily Increment Scheduler
- Updated daily increment scheduler to run 5 times per day instead of once
- New schedule: 3am, 9am, 12pm, 3pm, and 6pm UTC
- Implemented hour-based tracking to prevent duplicate runs within same hour
- Enhanced status reporting with completed/remaining hours tracking
- Maintained data integrity protection and duplicate prevention
- No regression to existing functionality or historical data protection

### June 16, 2025 - Daily Increment Data Gap Resolution
- Identified and resolved missing daily increment data for June 14-16, 2025
- Added interpolated rates for missing days to maintain data continuity
- Brought daily increment system current with today's date
- Complete coverage now available from Alpha Vantage base data through current date

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

### June 13, 2025 - Enhanced Registration Flow
- Modified OAuth callback in replitAuth.ts to detect new user creation
- Added upsertUserWithCreationStatus method to track user creation status
- New users automatically redirected to /profile?setup=true after Google OAuth (fallback approach implemented)
- Added welcome message and optional preference configuration in UserProfileNew.tsx
- Added welcome messages on dashboard for users without preferences set
- PersonalizedDashboard detects missing preferences and shows helpful setup prompts
- Users can skip setup and continue to dashboard if preferred
- Success feedback guides users to explore personalized dashboard
- Fallback approach ensures all new users see preference setup encouragement

## Changelog
- June 12, 2025. Initial setup with personalized wizard system

## User Preferences

### Communication Style
- Simple, everyday language
- Non-intrusive help system
- Respect user choice to dismiss or skip suggestions
- No spam or aggressive prompting
- At least 30 seconds before showing any help suggestions