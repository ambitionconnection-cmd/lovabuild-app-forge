

## Plan: Street Promoter System — PDF Tutorial

Create a polished, branded PDF guide explaining how admins use the new Street Promoter Tracking System end-to-end.

### Output

Single file: `/mnt/documents/FLYAF_Street_Promoter_Guide.pdf` (multi-page, A4, FLYAF-branded).

### Approach

Generate via Python `reportlab` (already-supported in sandbox) using FLYAF's color palette: deep red `#AD3A49`, charcoal, cream/neutral. Clean serif/sans pairing, generous spacing, no overlapping elements. QA by rendering to images and visually inspecting every page before delivery.

### Document Structure (8 pages)

1. **Cover** — FLYAF wordmark, title "Street Promoter System", subtitle "Admin Guide", version + date.
2. **What it is & why it exists** — One-paragraph overview, the 4 system parts (promoters, /ref landing, admin dashboard, public results), and the payout model summary.
3. **Quick start (3-step onboarding)** — Walks through the in-app onboarding card: create promoter → copy link → test /ref redirect. Includes the URL pattern `flyaf.app/ref/CODE`.
4. **Creating & managing promoters** — Fields (name, code, city), how to pause/resume, how to mark a campaign complete, how to copy referral links and open the public results page.
5. **How tracking & qualification work** — Session ID + IP hash dedup (24h window), 30-second qualification via `sendBeacon`, first-promoter-wins attribution, the `capped` flag when daily cap is hit.
6. **Payout model** — Plain-English formula:
   `(qualified visits × £0.50) + (campaign sign-ins × £1.00) + (post-campaign sign-ins × £0.20)`, daily cap £20, 7-day post-campaign window. Worked example with numbers.
7. **Reading the dashboard** — Explains every column on `/admin/promoters` (visits today/total, sign-ins, conversion %, payout today/total, CAP REACHED badge) and the detail page (visit log, editable campaign settings, Mark as Paid).
8. **Sharing the public results link** — `flyaf.app/results/CODE`, what the promoter sees (progress bars, earnings, motivational tier message), and best-practice tips for promoters in the field.

### Visual Style

- A4 portrait, 20mm margins.
- Page header on pages 2+: small FLYAF mark left, "Street Promoter Guide" right, thin red rule.
- Page footer: page number + "FLYAF Admin Documentation".
- Section titles in deep red, body in dark charcoal, callout boxes (light cream fill, red left border) for tips and formulas.
- Monospace inline code for URLs and codes (e.g., `JAY01`, `/ref/JAY01`).
- No images required — pure typographic layout with shaped callouts and a simple step-flow diagram on page 3.

### Technical Notes

- Use `reportlab.platypus` (`SimpleDocTemplate`, `Paragraph`, `Spacer`, `Table`, `KeepTogether`) for clean flowable layout.
- Custom `ParagraphStyle`s for H1/H2/body/code/callout.
- Use `<super>`/`<sub>` XML tags if needed — never Unicode super/subscripts (per skill guidance).
- After generation: convert to JPEGs at 150 DPI, view every page, fix any overflow/overlap, regenerate, re-verify.
- Emit final artifact via `<lov-artifact path="FLYAF_Street_Promoter_Guide.pdf" mime_type="application/pdf">`.

