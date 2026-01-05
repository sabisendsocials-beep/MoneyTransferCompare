# replit.md

## Overview
This is a currency exchange rate comparison application built with Node.js, Express, and Drizzle ORM. It enables users to compare exchange rates from various providers across 15 major currency corridors (GBP/EUR/USD to NGN/GHS/KES/INR/PKR). The application also provides historical rate trends and allows users to set up rate alerts via email notifications, aiming to be a comprehensive tool for informed money transfers.

## User Preferences
### Communication Style
- Simple, everyday language
- Non-intrusive help system
- Respect user choice to dismiss or skip suggestions
- No spam or aggressive prompting
- At least 30 seconds before showing any help suggestions

## System Architecture
### Frontend Architecture
- **Framework**: Vite-powered React application with TypeScript
- **UI Components**: Custom components built with Shadcn/ui design system, utilizing Tailwind CSS for styling with CSS variables for theming.
- **State Management**: React Query for efficient server state management.
- **Routing**: Client-side routing provides a seamless single-page application experience.

### Backend Architecture
- **Framework**: Express.js with TypeScript, providing RESTful API endpoints with JSON responses.
- **Database ORM**: Drizzle ORM with PostgreSQL as the primary database.
- **Data Collection**: Multi-source rate aggregation, combining Alpha Vantage API data with web scraping for provider rates.
- **Scheduling**: Background jobs are used for automated rate updates and data maintenance.

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon serverless.
- **Key Tables**: `rate_trends` for historical data, `exchange_rates` for current rates, `providers` for service configurations, `rate_cache` for performance, `rate_alerts` for user notifications, `users` for authentication, and `system_settings` for application configuration.

### Key Features
- **Rate Collection System**: Integrates with Alpha Vantage for historical FX data and performs web scraping for current provider rates, including an admin verification system for accuracy.
- **Historical Data Management**: Stores over two years of historical data for trend analysis, with integrity monitoring and backup capabilities.
- **Rate Alert System**: Allows users to set email notifications for target exchange rates (absolute or percentage-based) against official or best provider rates.
- **Admin Dashboard**: Provides tools for rate verification, provider management, and data integrity monitoring.
- **Data Flow**: Rates are collected, validated, stored with source attribution, served via API, and used for alert processing and historical tracking.
- **Personalized Feature Discovery**: An intelligent `PersonalizedWizard` component offers context-aware, adaptive help based on user behavior, respecting user choices and timing.
- **Account Encouragement**: Subtle prompts encourage non-logged-in users to create accounts, highlighting personalized features.
- **Enhanced Registration Flow**: New users are seamlessly redirected to profile setup after OAuth, with welcome messages and preference configuration options.
- **Consolidated AI Power Insights** (`/api/ai/power-insight`): Unified endpoint providing 7-day and 30-day rate forecasts with confidence ratings, anomaly detection (best/worst in 30 days, high spread alerts), and actionable recommendations (send now/wait/set alert). Replaces separate prediction, timing, and alert suggestion endpoints. Frontend uses `RateForecast` component.
- **Market Commentary**: Commentary system provides data-driven insights based on live market data, provider rates, and spreads, accessible in the "AI Insights" tab.
- **Multi-Provider Rate Trends**: Displays historical trends for all providers with multi-select functionality and distinct color coding.
- **Commentary System**: Generates authentic, data-driven insights with 5 distinct variants per currency pair, based on real-time provider data.
- **Localization**: Comprehensive British English localization across user-facing content.
- **UI/UX Decisions**: Focus on contrast enhancement (especially in footer), branding consistency (SabiSend branding), and improved readability with enhanced typography and iconography. Currency symbols are used instead of codes for better clarity.

## External Dependencies
### APIs and Services
- **Alpha Vantage**: Primary source for historical FX data.
- **Exchange Rate APIs**: Fallback sources for current rates.
- **Email Service**: For sending rate alert notifications.
- **Web Scraping**: For direct collection of provider rates.
- **Wise API**: Integrated for authentic exchange rates.

### Development Tools
- **Drizzle Kit**: For database migrations and schema management.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Vite**: Frontend build tool and development server.