# FLYAF Blueprint — Detailed Documentation Pack (v2)

Rewrite the six docs as an in-depth "blueprint" (about 3–4 pages each, ~1,500–2,500 words), based only on the live app and its current data. The originals stay as they are. The new versions are saved as `flyaf-docs/v2/*_v2.md`.

## Shared rules
- Geographic order stays the same: London (Soho, 32 of 107 London shops) → Paris → Asia (Japan, Korea, China, Thailand, plus 5 Asian languages) → New York / LA. Africa and the West Indies only appear as early-stage regions.
- Every figure (shop, brand and country counts, prices, limits) is re-checked against the database and code before writing.
- Each file has a short summary at the top, sections with explanations ("what it is, why it matters, how it works"), and tables where they help. A "Key takeaways" box closes each file.

## Files
1. **PROJECT_OVERVIEW_v2** — mission and founder story, the problem it solves, target users (personas), market priority with reasons and shop counts per city, how the product has changed (Drops became Hot, no ads), value proposition, business model (Pro, affiliates, promoters).
2. **FEATURES_v2** — a full walkthrough of each feature: the map and Nearby, Route building and sharing, PDF export, Global Index and brand pages, the Hot feed and Street Spotted (AI outfit detection, Shop This Fit), collections, profiles, Pro and free-tier limits, the street promoter system, the admin tools, onboarding, and the 7 languages. For each one: the user flow, its rules, and its status (live, partly built, or removed).
3. **TECH_STACK_v2** — the architecture diagram, frontend structure, backend (database, functions, storage, sign-in with Apple/Google), mapping and geocoding, PWA and caching, analytics, the main design decisions and why they were made, and security.
4. **DATA_MODEL_v2** — the main tables and how they connect, the public shop view and access rules, categories, brand tiers and subcultures, coordinate accuracy, the city and country lists, user content and moderation, and the promoter tables and payout logic.
5. **DESIGN_SYSTEM_v2** — brand identity and tone of voice, the colour palette with exact values and the colour for each tab, typography (Montserrat, Cormorant, IBM Plex Mono), the urban night look, map markers and labels, bottom sheets, mobile-first rules, selected-state styling, and do's and don'ts.
6. **STATUS_AND_ROADMAP_v2** — what is live now, known limitations (for example missing Caribbean logos and addresses, Africa coverage), data quality results, work in progress, and priorities ranked by what they're worth and how much work they take.

## Process
- Re-read the main code files and run read-only database counts to refresh the figures.
- Write the files, check the page length and that the formatting displays correctly, then present all six.
