

## Plan: Add Missing Brand Logos

There are **55 brands** without logos in the database. The approach will be to use Google's favicon service and known website domains to fetch logos, plus a SQL migration to set `logo_url` for all brands where we can source one.

### Approach

1. **Use Google Favicon Service** for well-known brands (128px icons from `https://www.google.com/s2/favicons?domain=DOMAIN&sz=128`). This works reliably for brands with established websites.

2. **Download favicon PNGs** to `/public/brands/` for the major/well-known brands and set their `logo_url` via SQL migration.

3. **Brands with known websites** (can fetch favicon):
   - Engineered Garments, Maharishi, Maniere De Voir, MKI Miyuki Zoku, Pop Trading Company, Unknown London, PUMA, UNIQLO, Vans, Jordan Brand, Rick Owens, JW Anderson, Lemaire, Simone Rocha, Erdem, Wales Bonner, On, FatFace, size?, Alaïa, Ashley Williams, Auralee, A.Presse, Beyond Retro, Girls Don't Cry, NOCTA, Perks and Mini, Shushu/Tong, Wasted Youth, Rokit, SCRT

4. **Smaller/niche brands** without established websites will use the text-fallback that `BrandLogo` component already provides (displaying the brand name).

### Technical Details

- Create ~30+ favicon PNG files in `/public/brands/` using the Google favicon service
- Write a single SQL migration to `UPDATE brands SET logo_url = '/brands/[slug]-logo.png' WHERE slug = '[slug]'` for each brand
- For brands where the domain is unknown, I'll research the correct website URL first
- Priority given to well-known fashion brands (Rick Owens, PUMA, Vans, UNIQLO, Jordan Brand, Wales Bonner, JW Anderson, etc.)

### Brand-to-Domain Mapping (key ones)

| Brand | Domain |
|-------|--------|
| PUMA | puma.com |
| UNIQLO | uniqlo.com |
| Vans | vans.com |
| Jordan Brand | nike.com/jordan |
| Rick Owens | rickowens.eu |
| JW Anderson | jwanderson.com |
| Lemaire | lemaire.fr |
| Wales Bonner | walesbonner.net |
| On | on.com |
| FatFace | fatface.com |
| Simone Rocha | simonerocha.com |
| Erdem | erdem.com |
| Alaïa | alaia.com |
| Ashley Williams | ashleywilliamslondon.com |
| Auralee | auralee.jp |
| Beyond Retro | beyondretro.com |
| Engineered Garments | engineeredgarments.com |
| Maharishi | maharishistore.com |
| size? | size.co.uk |
| Perks and Mini | perksandmini.com |
| Girls Don't Cry | verdyharajukuday (IG only) |
| Pop Trading Company | poptradingcompany.com |
| Rokit | rokit.co.uk |
| Shushu/Tong | shushutong.com |
| Wasted Youth | (Verdy brand, IG only) |
| NOCTA | nike.com |
| A.Presse | apresse.jp |
| Unknown London | unknownlondon.com |
| Maniere De Voir | manieredevoir.com |
| MKI Miyuki Zoku | mkistore.co.uk |

### Estimated Coverage

- ~30-35 brands will get favicon logos (the well-known ones)
- ~20 smaller/niche brands will keep the text fallback
- This covers all the major names users would recognize

