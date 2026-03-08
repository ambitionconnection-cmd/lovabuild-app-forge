

## What Can Be Automated vs. What Needs Manual Work

### Fully Automatable

**1. First 500 Users → 3-Month Free Pro**
- Add a DB trigger on the `profiles` table: when a new profile is created, count total profiles. If count <= 500, automatically set `is_pro = true` and `pro_expires_at = now() + 3 months`.
- No manual work needed. Every new signup is automatically checked and granted Pro if they're within the first 500.
- The "founding member" messaging can be shown conditionally on the frontend based on a `is_founding_member` flag or by checking if `pro_expires_at` is set without a Stripe subscription.

**2. After User #500 → Standard Freemium**
- This happens automatically once the trigger stops granting Pro (count > 500). No code change needed at that point — the existing paywall logic already works for non-Pro users.

**3. Admin Pro Bypass**
- Update `check-subscription` edge function: if the user has the `admin` role in `user_roles`, return `subscribed: true` regardless of Stripe status. This fixes your inability to test Print and other Pro features.

### Requires Manual Action (by you, once)

**4. Ambassador Permanent Pro**
- Create an `ambassador_codes` table with redeemable codes that grant permanent Pro (no expiry).
- You generate codes in the admin panel and send them to your 50-100 contacts.
- They redeem during signup or on their profile page → `is_pro = true`, `pro_expires_at = null` (permanent).
- The code generation and redemption is automated; you just need to distribute the codes manually.

---

## Implementation Plan

### Step 1: Admin Pro bypass
Modify the `check-subscription` edge function to check `user_roles` for admin role. If admin, return `subscribed: true`. Single file change.

### Step 2: Auto-Pro for first 500 users
- DB migration: modify the `handle_new_user()` trigger function to count profiles and set `is_pro`/`pro_expires_at` when count <= 500.
- Add a `is_founding_member` boolean column to `profiles` (default false) so we can show the special "founding member" message.
- Frontend: after signup, if user's profile has `is_founding_member = true`, show a welcome toast: "You're one of FLYAF's first 500 members. Welcome to Pro, on us for 3 months."

### Step 3: Ambassador code system
- DB migration: create `ambassador_codes` table (code, max_uses, uses_count, grants_permanent_pro, is_active) and `code_redemptions` table (code_id, user_id, redeemed_at).
- Admin panel: new section to generate/manage ambassador codes.
- Frontend: "Have a code?" input on the Auth page or Profile page. On redemption, set `is_pro = true` and `pro_expires_at = null`.
- RLS: admins can manage codes; authenticated users can redeem.

### Step 4: Founding member messaging
- Update the Pro upgrade modal to show "You're one of FLYAF's first 500" for founding members approaching expiry.
- Show a subtle badge or note on the profile for founding members.

### Summary of effort

| Feature | Automated? | Your manual work |
|---------|-----------|-----------------|
| First 500 → 3mo Pro | Fully automatic | None |
| After #500 → freemium | Fully automatic | None |
| Admin bypass | Fully automatic | None |
| Ambassador codes | Code auto-redeems | You distribute ~50-100 codes to contacts |
| Ambassador brief | N/A | You send the message (we can draft it) |

