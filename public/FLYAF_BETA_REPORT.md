# FLYAF (formerly HEARDROP) — Beta Release Report

**Document Type:** Internal Board & Stakeholder Report  
**Date:** March 4, 2026  
**Version:** Beta 1.0  
**Classification:** Confidential — For Internal Distribution Only  
**Prepared for:** Board of Directors, CEO, COO, Product Manager, Marketing Agency, Development Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Complete Feature Inventory](#3-complete-feature-inventory)
4. [Technical Architecture](#4-technical-architecture)
5. [Monetization Model](#5-monetization-model)
6. [Admin & Operations Capabilities](#6-admin--operations-capabilities)
7. [Internationalization (i18n)](#7-internationalization-i18n)
8. [Security Infrastructure](#8-security-infrastructure)
9. [Deployment Roadmap](#9-deployment-roadmap)
10. [Marketing Requirements](#10-marketing-requirements)
11. [Known Limitations & Next Steps](#11-known-limitations--next-steps)
12. [Cost Summary](#12-cost-summary)
13. [Appendix: File & Route Reference](#13-appendix-file--route-reference)

---

## 1. Executive Summary

FLYAF is a community-driven streetwear discovery platform built as a Progressive Web App (PWA). It connects streetwear enthusiasts with brands, shops, and drops worldwide through an interactive map, curated brand index, and user-generated lookbook ("HOT" feed).

**Current Status:** Feature-complete Beta — ready for internal QA, soft launch, and app store submission pipeline.

**Key Metrics at Launch:**
- 150+ brands indexed with logos, descriptions, and social links
- 200+ shops globally with geocoded coordinates
- 35+ drops with affiliate tracking
- Multi-language support (8 languages)
- Full admin dashboard with analytics, moderation, and CRM tools
- Freemium monetization with Stripe integration

---

## 2. Product Overview

### Vision
FLYAF is the "Shazam for streetwear" — a platform that lets users discover what brands are around them, explore drops, and share their personal style with a global community.

### Target Audience
- Streetwear enthusiasts aged 16-35
- Sneakerheads, hypebeast culture followers
- Fashion-forward travelers exploring new cities
- Brand ambassadors and micro-influencers

### Platform
- **Type:** Progressive Web App (PWA) with native app wrapper capability (Capacitor)
- **Desktop:** Responsive with top navigation bar
- **Mobile:** Native-feel bottom tab bar with haptic feedback
- **Offline:** PWA service worker for basic offline support

---

## 3. Complete Feature Inventory

### 3.1 Navigation Structure (Bottom Tab Bar — Mobile)

| Tab | Icon | Route | Description |
|-----|------|-------|-------------|
| **Nearby** | Map | `/` | Interactive Mapbox map with shop markers |
| **Route** | Route | `/route` | Multi-stop shop route planner |
| **Index** | Globe | `/global-index` | Searchable brand directory A-Z |
| **HOT** | Flame | `/feed` | Community lookbook (Street Spotted) |
| **More** | Menu | `/more` | Profile, settings, contact, about |

### 3.2 Interactive Map (Nearby Tab)

- **Mapbox GL JS** powered interactive map with custom markers
- Shop clustering at zoom levels for performance
- Bottom sheet with shop list (filterable by city, brand, category)
- Tap-to-view shop detail: name, address, hours, brand, directions link
- Category filters: streetwear, sneakers, luxury, vintage, techwear, skate, etc.
- Geolocation: "Near me" positioning
- Shop detail modal with opening hours (JSON-based per day)

### 3.3 Route Planner

- Add multiple shops as stops on a planned route
- Drag-and-drop reordering of stops
- Route sharing via unique shareable link (`/route/:code`)
- Save routes to account (authenticated)
- Side panel on desktop, bottom sheet on mobile
- Deep link support for shared routes

### 3.4 Global Brand Index

- A-Z scrollable brand directory with logos
- Search with debounced input
- Filter by category (streetwear, sneakers, luxury, vintage, etc.)
- Brand detail pages (`/brand/:slug`) with:
  - Logo, banner, description, history
  - Country of origin with flag emoji
  - Official website, Instagram, TikTok links
  - Affiliated shops list
  - Upcoming drops for that brand
  - Favorite/save functionality (authenticated)

### 3.5 HOT Feed (Street Spotted / Community Lookbook)

- User-generated outfit photo feed
- **Masonry grid layout** (2 columns mobile, 3 columns desktop)
- Post creation flow:
  - Camera/upload photo with auto-resize optimization
  - Caption input
  - City & country selection
  - Instagram handle & TikTok handle (optional)
  - **Style tags** — pick up to 3 from presets (streetwear, techwear, vintage, etc.) or create custom `#tags`
  - Brand tagging from database (optional, with "Request this brand" for missing brands)
- Feed filtering by: style tag, city, country, brand
- Like/heart system (authenticated)
- Post detail view with full metadata
- Moderation: all posts are `pending` by default until admin approval
- Pro badge displayed on Pro user posts

### 3.6 My HEARDROP (Favorites Hub)

- Saved/favorite brands list
- Saved/favorite shops list
- Drop reminders overview
- Quick access to personalized content

### 3.7 Drops System

- Drop cards with: title, brand, image, release date, status (upcoming/live/ended)
- Affiliate links with click tracking
- Discount codes with copy-to-clipboard tracking
- Pro-exclusive drops (gated behind subscription)
- Featured drops highlighting
- Product image galleries
- Video URL support
- Drop reminder system (push-to-database for notification pipeline)

### 3.8 Collections

- Curated brand collections (e.g., "Best of Techwear", "Heritage Brands")
- Admin-managed with cover images, descriptions
- Sortable display order
- Public browsable at `/collections`

### 3.9 User Authentication & Profiles

- Email + password authentication via Supabase Auth
- Password strength validation (edge function)
- Password breach checking (HaveIBeenPwned API via edge function)
- Login attempt rate limiting (per email + per IP)
- Profile management: display name, avatar upload
- Notification preferences (weekly digest, drop reminders, etc.)
- Pro subscription status display
- Founding member badge (first 500 users)

### 3.10 Onboarding

- Full-screen splash onboarding for first-time visitors
- Dismissible, stored in localStorage
- Introduces key features visually

### 3.11 Contact Form

- Public contact form with inquiry types
- Submissions stored in database
- Admin-viewable with resolve/unresolve toggle

### 3.12 About Page

- Platform information and mission
- Public access

### 3.13 Notification History

- In-app notification feed (authenticated)
- Read/unread status
- Metadata-rich notifications

---

## 4. Technical Architecture

### 4.1 Frontend Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tooling & dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library (Radix primitives) |
| **React Router v6** | Client-side routing |
| **TanStack Query** | Server state management & caching |
| **react-i18next** | Internationalization |
| **Mapbox GL JS** | Interactive maps |
| **Recharts** | Analytics charting |
| **Framer Motion** (via CSS) | Animations |
| **vite-plugin-pwa** | PWA/service worker |
| **date-fns** | Date formatting |
| **jsPDF** | PDF export |
| **QRCode** | QR code generation |
| **Zod** | Schema validation |
| **React Hook Form** | Form management |

### 4.2 Backend Stack (Lovable Cloud / Supabase)

| Service | Usage |
|---------|-------|
| **PostgreSQL Database** | All data storage (24+ tables) |
| **Row Level Security (RLS)** | Fine-grained access control on every table |
| **Auth** | Email/password authentication |
| **Storage** | 4 buckets: `drop-images`, `brand-images`, `street-spotted`, `avatars` |
| **Edge Functions** | 14 serverless functions |
| **Realtime** | Available but not yet utilized |

### 4.3 Edge Functions Inventory

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `check-password-breach` | HaveIBeenPwned API check | No |
| `validate-password-strength` | Password complexity validation | No |
| `check-subscription` | Stripe subscription status sync | Yes |
| `create-checkout` | Stripe checkout session creation | Yes |
| `customer-portal` | Stripe customer portal link | Yes |
| `send-drop-notifications` | Drop reminder emails | Service |
| `send-weekly-digest` | Weekly digest emails | Service |
| `send-admin-notifications` | Admin summary email alerts | Service |
| `send-scheduled-audit-export` | Scheduled audit log exports | Service |
| `send-security-alert` | Security incident alerts | Service |
| `track-email` | Email open/click tracking | No |
| `monitor-email-engagement` | Email engagement metrics | No |
| `track-affiliate-analytics` | Affiliate click/copy tracking | No |
| `brand-radar-fetch` | Brand news aggregation | No |
| `ip-rate-limit` | IP-based login throttling | Service |
| `log-security-event` | Security audit logging | Service |
| `geocode-shops` | Shop address geocoding | Service |
| `generate-brand-images` | AI brand image generation | Service |
| `bulk-download-images` | Bulk image archive download | Service |

### 4.4 Database Schema (24 Tables)

**Core Content:** `brands`, `shops`, `drops`, `collections`, `featured_brands`  
**User Data:** `profiles`, `user_roles`, `user_favorite_brands`, `user_favorite_shops`, `user_drop_reminders`  
**Community:** `street_spotted_posts`, `street_spotted_likes`, `street_spotted_post_brands`, `brand_requests`  
**Security:** `login_attempts`, `ip_login_attempts`, `security_audit_log`  
**Analytics:** `affiliate_analytics`, `email_analytics`, `notification_history`  
**Admin:** `admin_notification_preferences`, `scheduled_audit_exports`, `ambassador_codes`, `code_redemptions`  
**Routes:** `saved_routes`, `shared_routes`  
**Misc:** `contact_submissions`, `brand_radar_items`  
**Views:** `affiliate_analytics_summary`, `shops_public`

### 4.5 Third-Party Integrations

| Service | Purpose | Key Type |
|---------|---------|----------|
| **Mapbox** | Interactive maps | Public token |
| **Stripe** | Payment processing | Secret key |
| **Resend** | Transactional emails | API key |

---

## 5. Monetization Model

### 5.1 Freemium Tiers

| Feature | Free | Pro (£2.99/mo or £19.99/yr) |
|---------|------|----------------------------|
| Browse map & shops | ✅ | ✅ |
| View brand index | ✅ | ✅ |
| View public drops | ✅ | ✅ |
| Save favorites | Limited | ✅ Unlimited |
| Post to HOT feed | ✅ | ✅ + Pro badge |
| Pro-exclusive drops | ❌ | ✅ |
| Boosted visibility | ❌ | ✅ |
| Route saving | Limited | ✅ Unlimited |

### 5.2 Growth Mechanics

- **First 500 users** → Automatic 3-month free Pro + "Founding Member" badge (database trigger)
- **After user #500** → Standard freemium conversion funnel
- **Ambassador codes** → Admin-generated codes for influencers/contacts (permanent or time-limited Pro)
- **Affiliate revenue** → Tracked clicks and discount code copies on drops

### 5.3 Revenue Streams

1. **Pro subscriptions** — £2.99/month or £19.99/year
2. **Affiliate commissions** — Brand affiliate links on drops (tracked per click)
3. **Featured brand placements** — Admin-managed featured brand of the week
4. **No display advertising** — Strategic decision to maintain user experience

---

## 6. Admin & Operations Capabilities

### 6.1 Admin Dashboard (`/admin`)

Accessible to users with `admin` role in `user_roles` table.

**Security Section:**
- Locked email accounts management
- Locked IP addresses management
- Security audit log with export (CSV, PDF)

**Content Management:**
- Full CRUD for brands (with bulk CSV import)
- Full CRUD for shops (with bulk CSV import + geocoding)
- Full CRUD for drops (with bulk CSV import)
- Drops calendar view
- Street Spotted post moderation queue (approve/reject)
- Brand requests queue (from community)
- Featured brand of the week management
- Collections management

**Communications:**
- Contact message inbox with resolve/unresolve
- Email analytics dashboard
- Email notification preferences (per-admin)
- Scheduled audit export management

**Media:**
- Media library browser
- AI-powered brand image generator
- Image archive management with bulk download

**Growth:**
- Ambassador code generation and management
- Code redemption tracking

**Data & Analytics:**
- Unified user analytics (signups, Pro conversions, founding members)
- Affiliate analytics (clicks, discount copies, per-drop performance)
- CSV export and print functionality for all analytics
- Data exports (brands list, shops list)

### 6.2 Admin Notification Banner

- Persistent dashboard banner showing pending items count
- Categories: unread contact messages, pending HOT posts, pending brand requests
- "All Clear" state with green indicator when zero items pending

### 6.3 Admin Email Notifications

- Configurable per-admin email preferences
- Toggle alerts for: contact messages, pending posts, brand requests, new signups
- Edge function sends summary digests via Resend

---

## 7. Internationalization (i18n)

### Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Complete (primary) |
| French | `fr` | ✅ Complete |
| Japanese | `ja` | ✅ Complete |
| Korean | `ko` | ✅ Complete |
| Thai | `th` | ✅ Complete |
| Simplified Chinese | `zh-CN` | ✅ Complete |
| Traditional Chinese | `zh-TW` | ✅ Complete |

- Auto-detection via browser language
- Manual language switcher in app
- All UI strings externalized to JSON locale files

---

## 8. Security Infrastructure

### 8.1 Authentication Security

- Password strength validation (server-side edge function)
- Password breach detection via HaveIBeenPwned k-Anonymity API
- Per-email login attempt rate limiting with lockout
- Per-IP login attempt rate limiting with lockout
- Account lockout recovery (admin-managed)

### 8.2 Data Security

- Row Level Security (RLS) on **every table**
- Role-based access: `admin`, `moderator`, `user` roles via `user_roles` table
- `SECURITY DEFINER` functions for cross-table role checks (prevents RLS recursion)
- Service role isolation for edge functions
- No client-side admin checks — all server-validated

### 8.3 Audit & Compliance

- Full security audit log with event types, IP addresses, user emails
- Scheduled audit exports (CSV/PDF via email)
- Admin-configurable export schedules

---

## 9. Deployment Roadmap

### 9.1 Web Deployment (Ready Now)

The app is currently deployed and accessible at:
- **Staging:** `https://lovabuild-app-forge.lovable.app`
- **Custom domain:** Configurable via Lovable dashboard (requires paid plan)

**Action required:**
1. Purchase and configure custom domain (e.g., `flyaf.com` or `flyaf.app`)
2. Set up DNS records pointing to Lovable hosting
3. Enable HTTPS (automatic via Lovable)
4. Update all email templates and links to use production domain

### 9.2 Mobile App Deployment

A full step-by-step guide exists in `MOBILE_APP_DEPLOYMENT_GUIDE.md`. Summary:

| Task | Timeline | Cost | Owner |
|------|----------|------|-------|
| Set up Capacitor wrapper | 2-4 hours | Free | Developer |
| Build Android APK/AAB | 4-6 hours | Free | Developer |
| Build iOS IPA (requires Mac) | 4-8 hours | Free | Developer |
| Google Play Console account | 1 day | $25 one-time | Product |
| Apple Developer account | 1 day | $99/year | Product |
| App store listings (screenshots, descriptions) | 4-8 hours | Free | Marketing + Product |
| Google Play review | 1-7 days | Free | Automated |
| Apple App Store review | 1-14 days | Free | Automated |

**Total estimated timeline:** 2-3 weeks from start to live on both stores.

### 9.3 Pre-Launch Checklist

- [ ] Custom domain purchased and configured
- [ ] Privacy policy page created and hosted
- [ ] Terms of service page created and hosted
- [ ] App store developer accounts created (Google + Apple)
- [ ] App icon finalized (1024x1024 PNG)
- [ ] App store screenshots prepared (multiple device sizes)
- [ ] App store descriptions finalized (short + full)
- [ ] Demo/test accounts created for Apple review
- [ ] Stripe webhooks configured for production
- [ ] Resend email sender domain verified
- [ ] Mapbox API key rate limits configured for production
- [ ] Initial 150+ brands data verified for accuracy
- [ ] All 200+ shop coordinates verified for accuracy
- [ ] Ambassador codes generated for initial 50-100 contacts
- [ ] Admin notification email preferences configured
- [ ] Content moderation workflow documented for team

---

## 10. Marketing Requirements

### 10.1 Brand Assets Needed

| Asset | Spec | Status |
|-------|------|--------|
| App icon | 1024x1024 PNG, no transparency | ⚠️ Needed |
| Feature graphic (Google Play) | 1024x500 PNG | ⚠️ Needed |
| App store screenshots (iPhone) | 1290x2796, 1284x2778, 1242x2208 | ⚠️ Needed |
| App store screenshots (Android) | 1080x1920 minimum | ⚠️ Needed |
| Brand logo (horizontal) | SVG + PNG | ⚠️ Needed |
| Brand logo (square/social) | 500x500 PNG | ⚠️ Needed |
| OG share image | 1200x630 PNG | ⚠️ Needed |
| Promotional video (optional) | 30s-60s, 1080p | ⚠️ Optional |

### 10.2 Copy Needed

| Copy | Max Length | Status |
|------|-----------|--------|
| App Store short description | 80 chars | ⚠️ Draft in deployment guide |
| App Store full description | 4,000 chars | ⚠️ Draft in deployment guide |
| App Store keywords (iOS) | 100 chars | ⚠️ Draft in deployment guide |
| Privacy policy | Full page | ⚠️ Needed |
| Terms of service | Full page | ⚠️ Needed |
| Social media bio | 160 chars | ⚠️ Needed |
| Press kit / one-pager | 1 page | ⚠️ Needed |

### 10.3 Launch Strategy Recommendations

#### Phase 1: Soft Launch (Week 1-2)
- Deploy to web with custom domain
- Invite 50-100 ambassadors via ambassador codes (permanent Pro)
- Seed HOT feed with 20-30 curated outfit posts
- Populate drops calendar with upcoming 10-15 drops

#### Phase 2: Community Building (Week 3-4)
- Instagram + TikTok launch accounts
- "First 500 get Pro free" campaign messaging
- Influencer seeding with ambassador codes
- Cross-promotion with indexed brands

#### Phase 3: App Store Launch (Week 4-6)
- Submit to Google Play and Apple App Store simultaneously
- PR outreach to streetwear publications (Highsnobiety, Hypebeast, Complex)
- Reddit presence (r/streetwear, r/sneakers)

#### Phase 4: Growth (Month 2+)
- User-generated content campaigns (best outfit of the week)
- Brand partnership program for featured placements
- Affiliate revenue optimization
- Pro conversion campaigns targeting power users

### 10.4 Key Messaging Points

1. **"Your streetwear city guide"** — Map-first discovery of shops worldwide
2. **"Never miss a drop"** — Drop calendar with reminders and affiliate links
3. **"Show your style"** — Community lookbook where users share outfits
4. **"First 500 go Pro free"** — Urgency-driven early adopter hook
5. **"150+ brands, 200+ shops, one app"** — Scale credibility

### 10.5 Social Media Channels to Establish

| Platform | Handle suggestion | Primary use |
|----------|-------------------|-------------|
| Instagram | @flyaf.app | Outfit reposts, drop alerts |
| TikTok | @flyaf.app | Street style videos, shop tours |
| X/Twitter | @flyafapp | Drop alerts, community engagement |
| Discord | FLYAF Community | Power user community, feedback |

---

## 11. Known Limitations & Next Steps

### 11.1 Current Limitations

| Item | Details | Priority |
|------|---------|----------|
| No push notifications | Only email + in-app; native push requires Capacitor plugin | High |
| No social auth | Email/password only; Google/Apple sign-in not yet configured | Medium |
| No user-to-user messaging | Community features are public-only | Low |
| No offline map caching | Maps require internet connection | Low |
| Email auto-confirm disabled | Users must verify email before login | By design |
| No image CDN | Images served directly from Supabase storage | Medium |
| Admin cron jobs not scheduled | Email notifications must be triggered manually or via external cron | High |

### 11.2 Recommended Post-Launch Development

| Feature | Effort | Impact |
|---------|--------|--------|
| Push notifications (Capacitor + FCM/APNs) | 2-3 weeks | High |
| Google/Apple social sign-in | 1 week | Medium |
| Automated daily admin email digest (cron) | 1 day | Medium |
| Image CDN/optimization pipeline | 1 week | Medium |
| Advanced analytics dashboard (conversion funnels) | 2 weeks | Medium |
| User follow system | 2-3 weeks | Medium |
| Brand claiming/verification program | 2 weeks | High |
| In-app purchase for Pro (iOS/Android) | 2-3 weeks | High |
| Offline map tile caching | 1 week | Low |

---

## 12. Cost Summary

### 12.1 Current Operating Costs

| Service | Cost | Billing |
|---------|------|---------|
| Lovable Cloud (hosting + database + auth + storage) | Usage-based, free tier available | Monthly |
| Mapbox | Free up to 50K map loads/month | Monthly |
| Stripe | 2.9% + 30¢ per transaction | Per transaction |
| Resend | Free up to 3K emails/month | Monthly |
| Custom domain | ~$10-15/year | Annual |

### 12.2 App Store Costs

| Item | Cost | Billing |
|------|------|---------|
| Google Play Developer | $25 | One-time |
| Apple Developer Program | $99 | Annual |

### 12.3 Total Minimum Launch Cost

- **Web only:** ~$15/year (domain)
- **Web + Android:** ~$40 (domain + Google Play)
- **Web + iOS + Android:** ~$140 (domain + both stores)

---

## 13. Appendix: File & Route Reference

### Public Routes (No Auth Required)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Directions (Map) | Interactive shop map |
| `/global-index` | GlobalIndex | Brand directory A-Z |
| `/brand/:slug` | BrandDetail | Individual brand page |
| `/shop-map` | ShopMap | Alternate map view |
| `/feed` | Feed (HOT) | Community lookbook |
| `/collections` | Collections | Curated brand collections |
| `/contact` | Contact | Contact form |
| `/about` | About | About page |
| `/route/:code` | SharedRoute | Shared route viewer |
| `/auth` | Auth | Login/signup |

### Protected Routes (Auth Required)

| Route | Component | Description |
|-------|-----------|-------------|
| `/profile` | Profile | User profile settings |
| `/my-heardrop` | MyHeardrop | Favorites hub |
| `/admin` | Admin | Admin dashboard |
| `/analytics` | Analytics | Analytics (admin) |
| `/notifications` | NotificationHistory | Notification inbox |
| `/route` | RoutePage | Route planner |

### Admin Dashboard Sections

| Section | Tab Value | Description |
|---------|-----------|-------------|
| Locked Accounts | `accounts` | Email lockout management |
| Locked IPs | `ips` | IP lockout management |
| Audit Log | `audit` | Security event log |
| Brands | `brands` | Brand CRUD + bulk import |
| Shops | `shops` | Shop CRUD + bulk import + geocoding |
| Drops | `drops` | Drop CRUD + bulk import |
| Calendar | `calendar` | Drops calendar view |
| Spot Moderation | `spot-moderation` | HOT post approval queue |
| Brand Requests | `brand-requests` | Community brand requests |
| Featured Brand | `featured-brand` | Brand of the week |
| Collections | `collections` | Curated collections |
| Contact Messages | `contact-messages` | Contact inbox |
| Email Analytics | `analytics` | Email engagement metrics |
| Email Notifications | `email-notifications` | Admin alert preferences |
| Scheduled Exports | `scheduled` | Audit export scheduling |
| Media Library | `media` | Uploaded media browser |
| AI Image Generator | `brand-images` | AI brand image creation |
| Image Archive | `image-archive` | Bulk image management |
| Ambassador Codes | `ambassador-codes` | Code generation + tracking |
| User Analytics | `user-analytics` | User growth + affiliate metrics |
| Data Exports | `data-exports` | CSV data export tools |

---

**End of Report**

*This document should be updated as the platform evolves beyond Beta. For technical handover, refer to the codebase README.md and inline code documentation.*

*For questions, contact the development team via the admin dashboard or the project's Lovable workspace.*

---

**Prepared by:** FLYAF Development Team via Lovable  
**Distribution:** Board of Directors, C-Suite, Product, Marketing, Engineering
