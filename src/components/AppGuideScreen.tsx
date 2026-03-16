/**
 * FLYAF App Guide Screen
 * ─────────────────────────────────────────────────────────────────────
 * Full annotated interactive tutorial. Accessible from More → "App Guide"
 * (or Settings, wherever makes sense in your nav structure).
 *
 * HOW TO INTEGRATE:
 *   1. Add to your router in App.tsx:
 *        <Route path="/guide" element={<AppGuideScreen />} />
 *
 *   2. Link from your More page:
 *        import { useNavigate } from 'react-router-dom';
 *        const navigate = useNavigate();
 *        <button onClick={() => navigate('/guide')}>App Guide</button>
 *
 *   3. Optionally link from onboarding completion:
 *        <button onClick={() => navigate('/guide')}>Read the full guide</button>
 *
 * DEPENDENCIES: react-router-dom (already in your package.json)
 *
 * NO OTHER DEPENDENCIES. The guide is self-contained HTML/CSS/JS
 * embedded inside a React shell. Zero extra packages needed.
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── The full guide HTML ──────────────────────────────────────────────────────
// This is the annotated interactive guide with phone mockups and callout dots.
// All CSS variables have been converted to hardcoded dark-theme values to match
// FLYAF's aesthetic (dark background, #e05040 accent).

const GUIDE_HTML = `
<style>
*{box-sizing:border-box;}
.g{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:4px 0;}
.tb{display:flex;gap:2px;background:#1a1a1a;padding:3px;border-radius:10px;margin-bottom:14px;}
.t{flex:1;padding:7px 2px;font-size:10px;font-weight:600;color:#555;background:none;border:none;border-radius:7px;cursor:pointer;letter-spacing:.04em;transition:all .15s;}
.t.on{background:#e05040;color:#fff;}
.pn{display:none;}
.pn.on{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;}

/* Phone frame */
.ph{width:248px;min-width:248px;border-radius:28px;border:2px solid #2a2a2a;background:#0c0c0c;overflow:hidden;position:relative;flex-shrink:0;}
.sb{height:22px;background:#000;display:flex;align-items:center;justify-content:space-between;padding:0 12px;}
.sbt{color:#fff;font-size:10px;font-weight:700;}
.sbr{color:#fff;font-size:8px;}
.bn{height:52px;display:flex;border-top:0.5px solid #222;}
.ni{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
.ni svg{width:16px;height:16px;}
.ni span{font-size:7px;font-weight:600;}
.ni.on svg,.ni.on span{color:#e05040;}
.ni:not(.on) svg,.ni:not(.on) span{color:#444;}
.ni.hot-on svg,.ni.hot-on span{color:#7c3aed!important;}

/* Callout dots */
.cd{position:absolute;z-index:30;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.85);pointer-events:none;}
.r{background:#e05040;}.b{background:#2563eb;}.gr{background:#16a34a;}
.a{background:#d97706;}.p{background:#7c3aed;}.c{background:#0891b2;}
.pi{background:#be185d;}.o{background:#c2410c;}

/* Legend */
.lg{flex:1;min-width:180px;}
.li{display:flex;gap:7px;margin-bottom:8px;font-size:13px;color:#e0e0e0;line-height:1.5;align-items:flex-start;}
.ln{width:19px;height:19px;min-width:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;margin-top:2px;}
.tp{border-left:3px solid #16a34a;padding:10px 12px;background:#111;border-radius:0 8px 8px 0;font-size:12px;color:#888;margin-top:12px;line-height:1.6;}
.tp strong{color:#e0e0e0;}
.lg h3{font-size:11px;font-weight:700;color:#555;margin:0 0 10px;letter-spacing:.06em;text-transform:uppercase;}
</style>

<div class="g">
<div class="tb">
  <button class="t on" onclick="sw('nb',this)">NEARBY</button>
  <button class="t" onclick="sw('rt',this)">ROUTE</button>
  <button class="t" onclick="sw('ix',this)">INDEX</button>
  <button class="t" onclick="sw('ht',this)">HOT</button>
  <button class="t" onclick="sw('mo',this)">MORE</button>
</div>

<!-- NEARBY -->
<div class="pn on" id="p-nb">
<div class="ph">
  <div class="sb"><span class="sbt">2:43</span><span class="sbr">4G ■■■</span></div>
  <div style="height:218px;background:#e8e2d6;position:relative;overflow:hidden;">
    <div style="position:absolute;left:0;right:0;top:52px;height:7px;background:#fff;opacity:.75;"></div>
    <div style="position:absolute;left:0;right:0;top:115px;height:7px;background:#fff;opacity:.75;"></div>
    <div style="position:absolute;left:0;right:0;top:175px;height:6px;background:#fff;opacity:.75;"></div>
    <div style="position:absolute;top:0;bottom:0;left:60px;width:7px;background:#fff;opacity:.75;"></div>
    <div style="position:absolute;top:0;bottom:0;left:140px;width:6px;background:#fff;opacity:.65;"></div>
    <div style="position:absolute;top:0;bottom:0;left:200px;width:6px;background:#fff;opacity:.65;"></div>
    <div style="position:absolute;top:20px;left:68px;width:62px;height:27px;background:#d4ccbf;border:1px solid #bfb8ac;border-radius:2px;"></div>
    <div style="position:absolute;top:65px;left:148px;width:46px;height:44px;background:#d4ccbf;border:1px solid #bfb8ac;border-radius:2px;"></div>
    <div style="position:absolute;top:18px;left:148px;width:48px;height:28px;background:#d4ccbf;border:1px solid #bfb8ac;border-radius:2px;"></div>
    <div style="position:absolute;top:130px;left:68px;width:64px;height:38px;background:#d4ccbf;border:1px solid #bfb8ac;border-radius:2px;"></div>
    <div style="position:absolute;top:128px;left:148px;width:44px;height:40px;background:#d4ccbf;border:1px solid #bfb8ac;border-radius:2px;"></div>
    <div style="position:absolute;top:9px;left:50%;transform:translateX(-54%);display:flex;gap:7px;align-items:center;">
      <div style="background:rgba(10,10,10,.88);border-radius:20px;padding:5px 11px;display:flex;align-items:center;gap:5px;">
        <span style="font-size:10px;color:#e05040;">📍</span>
        <span style="color:#fff;font-size:10px;font-weight:700;">London</span>
        <span style="color:#777;font-size:8px;">▼</span>
      </div>
      <div style="background:rgba(10,10,10,.88);border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#fff" stroke-width="1.5"><circle cx="10" cy="10" r="6"/><line x1="10" y1="1" x2="10" y2="5"/><line x1="10" y1="15" x2="10" y2="19"/><line x1="1" y1="10" x2="5" y2="10"/><line x1="15" y1="10" x2="19" y2="10"/></svg>
      </div>
    </div>
    <div style="position:absolute;top:44px;left:34px;width:36px;height:36px;border-radius:50%;background:#f0ede5;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#1a1a1a;">F</div>
    <div style="position:absolute;top:86px;left:4px;width:33px;height:33px;border-radius:50%;background:#111;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:5.5px;font-weight:800;color:#fff;text-align:center;line-height:1.15;">FRST<br>BVR</div>
    <div style="position:absolute;top:118px;left:16px;width:33px;height:33px;border-radius:50%;background:#e8e0d4;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:5.5px;font-weight:700;color:#222;text-align:center;line-height:1.2;">AIMÉ<br>LEON</div>
    <div style="position:absolute;top:58px;left:126px;width:34px;height:34px;border-radius:50%;background:#fff;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#000;font-style:italic;">R</div>
    <div style="position:absolute;top:132px;left:160px;width:36px;height:36px;border-radius:50%;background:#fff;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:7.5px;font-weight:600;color:#333;font-style:italic;letter-spacing:-.3px;">stüssy</div>
    <div style="position:absolute;top:158px;left:186px;width:38px;height:38px;border-radius:50%;background:#e8231a;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(232,35,26,.5);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:9px;font-weight:900;font-style:italic;letter-spacing:-.3px;">Sup</span></div>
  </div>
  <div style="background:#0c0c0c;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <svg viewBox="0 0 20 20" width="13" height="13" fill="#e05040"><path d="M10 2C6.686 2 4 4.686 4 8c0 5.25 6 10 6 10s6-4.75 6-10c0-3.314-2.686-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z"/></svg>
        <span style="color:#e05040;font-size:12px;font-weight:800;letter-spacing:.07em;">NEARBY</span>
        <span style="background:#e05040;color:#fff;font-size:10px;font-weight:800;padding:1px 8px;border-radius:12px;">17</span>
      </div>
      <span style="color:#666;font-size:17px;line-height:1;">✕</span>
    </div>
    <div style="background:#1c1c1c;border-radius:10px;margin:0 9px 5px;padding:10px 11px;">
      <div style="color:#fff;font-size:11px;font-weight:700;">Palace Skateboards London</div>
      <div style="color:#595959;font-size:9px;margin:2px 0 5px;">26 Brewer St, London W1F 0SW</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#e05040;font-size:10px;font-weight:600;">0m away</span>
        <div style="display:flex;gap:13px;align-items:center;">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="#777" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="10"/><circle cx="10" cy="13" r=".8" fill="#777"/></svg>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#777" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M8 3v14M3 8h14" opacity=".5"/><path d="M12 4l4 0 0 4"/><path d="M12 4l4 4"/></svg>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#777" stroke-width="1.5"><path d="M3 10L10 3l7 7"/><path d="M10 4v13"/></svg>
        </div>
      </div>
    </div>
    <div style="background:#1c1c1c;border-radius:10px;margin:0 9px 5px;padding:10px 11px;">
      <div style="color:#fff;font-size:11px;font-weight:700;">Machine-A</div>
      <div style="color:#595959;font-size:9px;margin:2px 0 5px;">13 Brewer St, London W1F 0RH</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#e05040;font-size:10px;font-weight:600;">50m away</span>
        <div style="display:flex;gap:13px;align-items:center;">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="#777" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="10"/><circle cx="10" cy="13" r=".8" fill="#777"/></svg>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#777" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M8 3v14M3 8h14" opacity=".5"/><path d="M12 4l4 0 0 4"/><path d="M12 4l4 4"/></svg>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#777" stroke-width="1.5"><path d="M3 10L10 3l7 7"/><path d="M10 4v13"/></svg>
        </div>
      </div>
    </div>
    <div style="background:#1c1c1c;border-radius:10px;margin:0 9px 6px;padding:10px 11px;">
      <div style="color:#fff;font-size:11px;font-weight:700;">Trading Desk</div>
      <div style="color:#595959;font-size:9px;margin:2px 0 5px;">7 Walker's Ct, London</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#e05040;font-size:10px;font-weight:600;">60m away</span>
        <div style="display:flex;gap:13px;align-items:center;">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="#777" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="10"/><circle cx="10" cy="13" r=".8" fill="#777"/></svg>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#777" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M8 3v14M3 8h14" opacity=".5"/><path d="M12 4l4 0 0 4"/><path d="M12 4l4 4"/></svg>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#777" stroke-width="1.5"><path d="M3 10L10 3l7 7"/><path d="M10 4v13"/></svg>
        </div>
      </div>
    </div>
  </div>
  <div class="bn" style="background:#0a0a0a;">
    <div class="ni on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/></svg><span>Nearby</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17s1-8 5-8 5 8 9 8 4-8 4-8"/></svg><span>Route</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg><span>Index</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6 6 3 10 5 14c1 2 3 3 7 8 4-5 6-6 7-8 2-4-1-8-7-12z"/></svg><span>Hot</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span></div>
  </div>
  <div class="cd r" style="top:12px;left:48px;">1</div>
  <div class="cd b" style="top:12px;right:8px;">2</div>
  <div class="cd gr" style="top:78px;left:32px;">3</div>
  <div class="cd a" style="top:248px;left:68px;">4</div>
  <div class="cd p" style="top:248px;right:8px;">5</div>
  <div class="cd c" style="top:316px;right:9px;">6</div>
</div>
<div class="lg">
  <h3>Nearby — the map</h3>
  <div class="li"><div class="ln r">1</div><div><strong>City selector</strong> — tap "London" to switch between cities: Paris, Tokyo, NYC and more. The map flies there instantly. Brand pins reload for the new city.</div></div>
  <div class="li"><div class="ln b">2</div><div><strong>Locate me</strong> — centres the map on your GPS position. Tap this if the map doesn't find you automatically on first load.</div></div>
  <div class="li"><div class="ln gr">3</div><div><strong>Brand pins</strong> — each circle shows the brand's actual logo. Tap any pin to slide open the shop info card at the bottom.</div></div>
  <div class="li"><div class="ln a">4</div><div><strong>NEARBY list + count</strong> — the number (17) shows shops within range. The list below is sorted nearest first. Tap any shop name to open its full detail page.</div></div>
  <div class="li"><div class="ln p">5</div><div><strong>✕ Close</strong> — dismisses the list and returns to the full map. Pins stay on screen.</div></div>
  <div class="li"><div class="ln c">6</div><div><strong>Row icons (per shop)</strong> — ⓘ opens the full shop detail page · ↗ opens the shop's website · ↑ launches single-stop navigation to that shop right now.</div></div>
  <div class="tp"><strong>Adding to your route:</strong> Tap a shop name (not the icons) to open its detail page. From there you'll find the "Add to Route" button that sends it to the Route tab.</div>
</div>
</div>

<!-- ROUTE -->
<div class="pn" id="p-rt">
<div class="ph">
  <div class="sb" style="background:#111;"><span class="sbt">2:48</span><span class="sbr">4G ⚡8</span></div>
  <div style="background:linear-gradient(135deg,#f5ede0,#ede0d8,#d8eae8,#e0e8f0);padding:10px 10px 8px;position:relative;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;">
      <div style="display:flex;align-items:center;gap:7px;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#c8a068" stroke-width="2.5"><path d="M3 17s1-8 5-8 5 8 9 8 4-8 4-8"/></svg>
        <span style="color:#c8a068;font-size:13px;font-weight:800;letter-spacing:.05em;">ROUTE</span>
        <span style="background:#c8a068;color:#fff;font-size:10px;font-weight:800;padding:1px 8px;border-radius:12px;">2</span>
      </div>
      <span style="color:#aaa;font-size:17px;line-height:1;">✕</span>
    </div>
    <div style="display:flex;gap:5px;margin-bottom:9px;">
      <button style="flex:1;padding:9px 3px;border-radius:9px;background:#1a1a1a;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#fff" stroke-width="1.5"><rect x="3" y="2" width="14" height="16" rx="2"/><rect x="6" y="2" width="8" height="5" rx="1"/><rect x="5" y="11" width="10" height="5" rx="1"/></svg>
        <span style="color:#fff;font-size:9px;font-weight:600;">Save</span>
      </button>
      <button style="flex:1;padding:9px 3px;border-radius:9px;background:#1a1a1a;border:none;display:flex;flex-direction:column;align-items:center;gap:2px;">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#fff" stroke-width="1.5"><rect x="5" y="2" width="10" height="14" rx="2"/><path d="M7 8l3-3 3 3M10 5v8"/></svg>
        <div style="display:flex;align-items:center;gap:2px;"><span style="color:#fff;font-size:9px;font-weight:600;">Print</span><span style="background:#e05040;color:#fff;font-size:6.5px;font-weight:800;padding:1px 4px;border-radius:3px;">PRO</span></div>
      </button>
      <button style="flex:1;padding:9px 3px;border-radius:9px;background:#1a1a1a;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#fff" stroke-width="1.5"><circle cx="15" cy="5" r="2"/><circle cx="5" cy="10" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 9l6-3M7 11l6 3"/></svg>
        <span style="color:#fff;font-size:9px;font-weight:600;">Share</span>
      </button>
    </div>
    <div style="background:rgba(255,255,255,.55);border-radius:10px;padding:9px 6px;display:flex;justify-content:space-around;margin-bottom:9px;">
      <div style="text-align:center;"><div style="color:#c8a068;font-size:17px;font-weight:800;">9.0km</div><div style="color:#999;font-size:8px;">Distance</div></div>
      <div style="width:.5px;background:#ddd;"></div>
      <div style="text-align:center;"><div style="color:#c8a068;font-size:17px;font-weight:800;">96min</div><div style="color:#999;font-size:8px;">Walking</div></div>
      <div style="width:.5px;background:#ddd;"></div>
      <div style="text-align:center;"><div style="color:#c8a068;font-size:17px;font-weight:800;">2</div><div style="color:#999;font-size:8px;">Stops</div></div>
    </div>
    <div style="background:#fde8e6;border-radius:10px;padding:9px 12px;margin-bottom:5px;display:flex;align-items:center;gap:10px;">
      <div style="width:28px;height:28px;border-radius:50%;background:#e05040;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#fff" stroke-width="2"><path d="M3 10L10 3l7 7"/><path d="M10 4v13"/></svg>
      </div>
      <span style="font-size:12px;font-weight:600;color:#1a1a1a;">Your Location</span>
    </div>
    <div style="background:rgba(255,255,255,.75);border-radius:10px;padding:9px 11px;margin-bottom:5px;display:flex;align-items:center;gap:7px;">
      <span style="color:#bbb;font-size:12px;letter-spacing:-1.5px;font-weight:600;">⋮⋮</span>
      <div style="width:22px;height:22px;border-radius:50%;background:#c8a068;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0;">1</div>
      <div style="flex:1;min-width:0;"><div style="font-size:10.5px;font-weight:700;color:#1a1a1a;">Dukes Cupboard Limited</div><div style="font-size:8.5px;color:#888;">28 Peter St, London</div></div>
      <span style="color:#ccc;font-size:15px;line-height:1;">✕</span>
    </div>
    <div style="background:rgba(255,255,255,.5);border-radius:10px;padding:9px 11px;margin-bottom:10px;display:flex;align-items:center;gap:7px;opacity:.7;">
      <span style="color:#bbb;font-size:12px;letter-spacing:-1.5px;font-weight:600;">⋮⋮</span>
      <div style="width:22px;height:22px;border-radius:50%;background:#c8a068;opacity:.65;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0;">2</div>
      <div style="flex:1;min-width:0;"><div style="font-size:10.5px;font-weight:700;color:#1a1a1a;">Supreme London</div><div style="font-size:8.5px;color:#888;">2-3 Peter St, London W1F 0AA</div></div>
      <span style="color:#ccc;font-size:15px;line-height:1;">✕</span>
    </div>
    <div style="background:#c8a068;border-radius:12px;padding:13px;text-align:center;margin-bottom:7px;cursor:pointer;">
      <span style="color:#fff;font-size:11.5px;font-weight:800;letter-spacing:.04em;">✈  START NAVIGATION</span>
    </div>
    <div style="text-align:center;padding:3px 0 2px;"><span style="color:#aaa;font-size:10px;">🗑  Clear Route</span></div>
  </div>
  <div class="bn" style="background:#0c0c0c;">
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/></svg><span>Nearby</span></div>
    <div class="ni on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17s1-8 5-8 5 8 9 8 4-8 4-8"/></svg><span>Route</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg><span>Index</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6 6 3 10 5 14c1 2 3 3 7 8 4-5 6-6 7-8 2-4-1-8-7-12z"/></svg><span>Hot</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span></div>
  </div>
  <div class="cd r" style="top:32px;left:14px;">1</div>
  <div class="cd b" style="top:32px;left:95px;">2</div>
  <div class="cd gr" style="top:32px;right:14px;">3</div>
  <div class="cd a" style="top:120px;left:14px;">4</div>
  <div class="cd p" style="top:190px;right:14px;">5</div>
  <div class="cd c" style="top:290px;left:14px;">6</div>
  <div class="cd o" style="top:328px;left:14px;">7</div>
</div>
<div class="lg">
  <h3>Route — plan your walk</h3>
  <div class="li"><div class="ln r">1</div><div><strong>Save</strong> — name and save this route (e.g. "Soho Saturday"). It reappears in More → My FLYAF every time you open the app, ready to reload.</div></div>
  <div class="li"><div class="ln b">2</div><div><strong>Print (PRO)</strong> — exports a printable PDF with a map overview, shop addresses, and opening hours. The lock icon means this is a Pro feature.</div></div>
  <div class="li"><div class="ln gr">3</div><div><strong>Share</strong> — generates a shareable link to this route. Anyone with the link can open it in FLYAF on their own phone.</div></div>
  <div class="li"><div class="ln a">4</div><div><strong>Route stats</strong> — total distance, walking time estimate, and stop count. These update live as you add or remove shops.</div></div>
  <div class="li"><div class="ln p">5</div><div><strong>Drag handles (⋮⋮)</strong> — hold and drag any stop up or down to reorder your route. Distance and time recalculate automatically.</div></div>
  <div class="li"><div class="ln c">6</div><div><strong>Start Navigation</strong> — opens Google Maps with every stop loaded in order. Walk the whole route hands-free without touching your phone again.</div></div>
  <div class="li"><div class="ln o">7</div><div><strong>Clear Route</strong> — removes all stops and starts a fresh route. A confirmation prompt appears first.</div></div>
  <div class="tp"><strong>The power move:</strong> Build tonight's route on a desktop (bigger screen, easier to plan), save it, then open the saved route on your phone tomorrow and just tap Start Navigation.</div>
</div>
</div>

<!-- INDEX -->
<div class="pn" id="p-ix">
<div class="ph">
  <div class="sb" style="background:#111;"><span class="sbt">2:49</span><span class="sbr">4G ⚡9</span></div>
  <div style="background:#111;min-height:460px;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 11px;">
      <div style="display:flex;align-items:center;gap:7px;">
        <span style="color:#fff;font-size:14px;font-weight:300;">←</span>
        <span style="color:#fff;font-size:12px;font-weight:800;letter-spacing:.04em;">GLOBAL INDEX</span>
      </div>
      <div style="background:#7c3aed;border-radius:20px;padding:5px 10px;display:flex;align-items:center;gap:4px;">
        <span style="font-size:10px;">📚</span>
        <span style="color:#fff;font-size:9.5px;font-weight:700;">Collections</span>
      </div>
    </div>
    <div style="display:flex;gap:7px;padding:0 11px 8px;">
      <div style="flex:1;background:#c8a068;border-radius:22px;padding:7px 4px;text-align:center;display:flex;align-items:center;justify-content:center;gap:4px;">
        <span style="font-size:9px;">👑</span><span style="color:#fff;font-size:9.5px;font-weight:800;letter-spacing:.03em;">ESTABLISHED</span>
      </div>
      <div style="flex:1;background:#1e1e1e;border-radius:22px;padding:7px 4px;text-align:center;display:flex;align-items:center;justify-content:center;gap:4px;">
        <span style="font-size:9px;">✦</span><span style="color:#777;font-size:9.5px;font-weight:700;letter-spacing:.03em;">NEW WAVE</span>
      </div>
    </div>
    <div style="display:flex;gap:5px;padding:0 11px 7px;">
      <div style="flex:1;background:#1c1c1c;border-radius:9px;padding:7px 9px;display:flex;align-items:center;gap:6px;">
        <span style="color:#555;font-size:11px;">🔍</span>
        <span style="color:#444;font-size:10px;">Search brands...</span>
      </div>
      <div style="background:#1c1c1c;border-radius:9px;width:34px;display:flex;align-items:center;justify-content:center;"><span style="color:#777;font-size:11px;">▼</span></div>
    </div>
    <div style="padding:0 11px 8px;">
      <div style="display:inline-flex;align-items:center;gap:4px;background:#222;border-radius:7px;padding:5px 10px;">
        <span style="color:#ccc;font-size:10px;font-weight:600;">All</span><span style="color:#666;font-size:9px;">▼</span>
      </div>
    </div>
    <div style="background:#1c1c1c;border-radius:11px;margin:0 9px 5px;padding:9px;display:flex;align-items:center;gap:9px;">
      <div style="width:40px;height:40px;border-radius:8px;background:#f5f5f5;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><span style="font-size:8px;font-weight:800;color:#000;">#FR2</span></div>
      <div style="flex:1;min-width:0;">
        <div style="color:#fff;font-size:10px;font-weight:700;margin-bottom:1px;">🇯🇵 #FR2</div>
        <div style="color:#595959;font-size:8.5px;margin-bottom:4px;">Japanese streetwear brand...</div>
        <div style="display:flex;gap:4px;">
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">↗ Web</span>
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">📷 Insta</span>
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">🏪 Shops</span>
        </div>
      </div>
      <span style="color:#444;font-size:18px;flex-shrink:0;">♡</span>
    </div>
    <div style="background:#1c1c1c;border-radius:11px;margin:0 9px 5px;padding:9px;display:flex;align-items:center;gap:9px;">
      <div style="width:40px;height:40px;border-radius:8px;background:#f0f0f0;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><span style="font-size:7px;font-weight:800;color:#333;text-align:center;line-height:1.3;">A<br>BAPE</span></div>
      <div style="flex:1;min-width:0;">
        <div style="color:#fff;font-size:10px;font-weight:700;margin-bottom:1px;">🇯🇵 A BATHING APE</div>
        <div style="color:#595959;font-size:8.5px;margin-bottom:4px;">Iconic Japanese streetwear...</div>
        <div style="display:flex;gap:4px;">
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">↗ Web</span>
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">📷 Insta</span>
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">🏪 Shops</span>
        </div>
      </div>
      <span style="color:#e05040;font-size:18px;flex-shrink:0;">♥</span>
    </div>
    <div style="background:#1c1c1c;border-radius:11px;margin:0 9px 5px;padding:9px;display:flex;align-items:center;gap:9px;">
      <div style="width:40px;height:40px;border-radius:8px;background:#e8e8e8;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><span style="font-size:7px;font-weight:700;color:#333;">ACW</span></div>
      <div style="flex:1;min-width:0;">
        <div style="color:#fff;font-size:10px;font-weight:700;margin-bottom:1px;">🇬🇧 A-COLD-WALL*</div>
        <div style="color:#595959;font-size:8.5px;margin-bottom:4px;">British brand by Samuel Ross...</div>
        <div style="display:flex;gap:4px;">
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">↗ Web</span>
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">📷 Insta</span>
          <span style="background:#222;color:#999;font-size:7.5px;padding:2px 6px;border-radius:4px;">🏪 Shops</span>
        </div>
      </div>
      <span style="color:#444;font-size:18px;flex-shrink:0;">♡</span>
    </div>
  </div>
  <div class="bn" style="background:#111;">
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/></svg><span>Nearby</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17s1-8 5-8 5 8 9 8 4-8 4-8"/></svg><span>Route</span></div>
    <div class="ni on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg><span>Index</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6 6 3 10 5 14c1 2 3 3 7 8 4-5 6-6 7-8 2-4-1-8-7-12z"/></svg><span>Hot</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span></div>
  </div>
  <div class="cd r" style="top:20px;right:9px;">1</div>
  <div class="cd b" style="top:60px;left:14px;">2</div>
  <div class="cd gr" style="top:98px;left:14px;">3</div>
  <div class="cd a" style="top:126px;left:14px;">4</div>
  <div class="cd p" style="top:195px;right:9px;">5</div>
  <div class="cd c" style="top:248px;left:60px;">6</div>
</div>
<div class="lg">
  <h3>Index — brand directory</h3>
  <div class="li"><div class="ln r">1</div><div><strong>Collections</strong> — curated themed groups: "Japanese Streetwear", "London Underground Labels", "Brands Under 5K Followers". A great way to discover brands you'd never find by searching.</div></div>
  <div class="li"><div class="ln b">2</div><div><strong>Established / New Wave</strong> — toggle between heritage brands with decades of history and emerging labels that are rising right now.</div></div>
  <div class="li"><div class="ln gr">3</div><div><strong>Search bar</strong> — type any brand name, country, or style to filter instantly. The ▼ button opens sorting options: A–Z, most shops, newest added.</div></div>
  <div class="li"><div class="ln a">4</div><div><strong>Category filter (All ▼)</strong> — narrow to a specific style: Sneakers, Techwear, Gorpcore, Workwear, Japanese, Women-Led, and more.</div></div>
  <div class="li"><div class="ln p">5</div><div><strong>Heart ♡ / ♥</strong> — filled red means saved. Tap to add a brand to your watchlist in My FLYAF. You'll see their new drops there first.</div></div>
  <div class="li"><div class="ln c">6</div><div><strong>Web / Insta / Shops pills</strong> — tap Web for the brand's site, Insta for their profile, Shops to see their pins filtered on the map.</div></div>
  <div class="tp"><strong>Full brand page:</strong> Tap the card itself (not the pills) to open the brand profile — full description, country of origin, stockists, affiliated shops, and upcoming drops.</div>
</div>
</div>

<!-- HOT -->
<div class="pn" id="p-ht">
<div class="ph">
  <div class="sb" style="background:#000;"><span class="sbt">2:51</span><span class="sbr">4G ⚡9</span></div>
  <div style="background:#000;min-height:480px;position:relative;">
    <div style="display:flex;align-items:center;gap:7px;padding:9px 11px 7px;">
      <span style="color:#fff;font-size:14px;font-weight:300;">←</span>
      <span style="font-size:14px;">🔥</span>
      <span style="color:#fff;font-size:13px;font-weight:800;letter-spacing:.05em;">HOT</span>
    </div>
    <div style="padding:0 10px 8px;">
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:7px;">
        <span style="font-size:11px;">🔥</span>
        <span style="color:#fff;font-size:9.5px;font-weight:800;letter-spacing:.06em;">TRENDING THIS WEEK</span>
      </div>
      <div style="display:flex;gap:5px;height:82px;">
        <div style="flex:1;border-radius:9px;background:#282520;position:relative;overflow:hidden;">
          <div style="position:absolute;inset:0;background:linear-gradient(160deg,#3a3428,#1e1a14);"></div>
          <div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:24px;height:36px;background:rgba(80,70,60,.6);border-radius:4px 4px 0 0;"></div>
          <div style="position:absolute;bottom:6px;left:6px;display:flex;align-items:center;gap:2px;"><span style="font-size:10px;">🔥</span><span style="color:#fff;font-size:9px;font-weight:700;">1</span></div>
        </div>
        <div style="flex:1;border-radius:9px;background:#202428;position:relative;overflow:hidden;">
          <div style="position:absolute;inset:0;background:linear-gradient(160deg,#282e32,#141618);"></div>
          <div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:28px;height:40px;background:rgba(60,70,80,.6);border-radius:4px 4px 0 0;"></div>
          <div style="position:absolute;bottom:6px;left:6px;display:flex;align-items:center;gap:2px;"><span style="font-size:10px;">🔥</span><span style="color:#fff;font-size:9px;font-weight:700;">1</span></div>
        </div>
      </div>
    </div>
    <div style="padding:0 10px 9px;display:flex;gap:7px;">
      <div style="background:#1a1a1a;border:.5px solid #333;border-radius:20px;padding:6px 13px;display:flex;align-items:center;gap:4px;">
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="#fff" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="6" y1="12" x2="10" y2="12"/></svg>
        <span style="color:#fff;font-size:10px;font-weight:600;">Filter</span>
      </div>
      <div style="background:#1a1a1a;border:.5px solid #333;border-radius:20px;padding:6px 13px;display:flex;align-items:center;gap:4px;">
        <span style="font-size:10px;">🔥</span>
        <span style="color:#fff;font-size:10px;font-weight:600;">Trending</span>
      </div>
    </div>
    <div style="display:flex;gap:5px;padding:0 10px;margin-bottom:5px;">
      <div style="flex:1;height:118px;border-radius:8px;overflow:hidden;position:relative;background:#282218;">
        <div style="position:absolute;inset:0;background:linear-gradient(150deg,#3a3020,#181408);"></div>
        <div style="position:absolute;bottom:22px;left:50%;transform:translateX(-50%);width:30px;height:50px;background:rgba(90,75,55,.55);border-radius:5px 5px 0 0;"></div>
        <div style="position:absolute;bottom:6px;left:6px;"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="#aaa" stroke-width="1.5"><path d="M1 8C1 4 3 2 8 2s7 2 7 6-3 6-7 6S1 12 1 8z"/></svg></div>
        <div style="position:absolute;bottom:6px;right:6px;display:flex;align-items:center;gap:3px;">
          <div style="width:14px;height:14px;border-radius:50%;background:#4a4a4a;display:flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:700;">A</div>
          <span style="color:#ccc;font-size:8px;">Atlas Rems</span>
        </div>
      </div>
      <div style="flex:1;height:118px;border-radius:8px;overflow:hidden;position:relative;background:#1c2024;">
        <div style="position:absolute;inset:0;background:linear-gradient(150deg,#242c32,#0e1014);"></div>
        <div style="position:absolute;bottom:22px;left:50%;transform:translateX(-50%);width:32px;height:52px;background:rgba(60,70,80,.55);border-radius:5px 5px 0 0;"></div>
        <div style="position:absolute;bottom:6px;left:6px;display:flex;align-items:center;gap:2px;"><span style="font-size:11px;">🔥</span><span style="color:#fff;font-size:9px;font-weight:700;">1</span></div>
        <div style="position:absolute;bottom:6px;right:6px;display:flex;align-items:center;gap:3px;">
          <div style="width:14px;height:14px;border-radius:50%;background:#4a4a4a;display:flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:700;">A</div>
          <span style="color:#ccc;font-size:8px;">Atlas Rems</span>
        </div>
      </div>
    </div>
    <div style="padding:0 10px;">
      <div style="width:47%;height:52px;border-radius:8px;overflow:hidden;position:relative;background:#262018;"><div style="position:absolute;inset:0;background:linear-gradient(150deg,#342c1e,#14100a);"></div></div>
    </div>
    <div style="position:absolute;bottom:56px;right:11px;width:38px;height:38px;border-radius:50%;background:#e05040;box-shadow:0 3px 10px rgba(224,80,64,.6);display:flex;align-items:center;justify-content:center;">
      <span style="color:#fff;font-size:22px;font-weight:300;line-height:1;">+</span>
    </div>
  </div>
  <div class="bn" style="background:#000;">
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/></svg><span>Nearby</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17s1-8 5-8 5 8 9 8 4-8 4-8"/></svg><span>Route</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg><span>Index</span></div>
    <div class="ni hot-on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6 6 3 10 5 14c1 2 3 3 7 8 4-5 6-6 7-8 2-4-1-8-7-12z"/></svg><span>Hot</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span></div>
  </div>
  <div class="cd r" style="top:52px;left:14px;">1</div>
  <div class="cd b" style="top:156px;left:22px;">2</div>
  <div class="cd gr" style="top:156px;left:108px;">3</div>
  <div class="cd a" style="top:270px;right:10px;">4</div>
  <div class="cd p" style="bottom:56px;right:9px;">5</div>
</div>
<div class="lg">
  <h3>Hot — the community lookbook</h3>
  <div class="li"><div class="ln r">1</div><div><strong>Trending This Week</strong> — the highest fire-reacted fits of the last 7 days. Scroll right to see up to 5. The community, not an algorithm, decides what's trending.</div></div>
  <div class="li"><div class="ln b">2</div><div><strong>Filter</strong> — narrow the feed by style tag: techwear, gorpcore, vintage, workwear, minimalist. Or filter to show only people you follow.</div></div>
  <div class="li"><div class="ln gr">3</div><div><strong>Trending toggle</strong> — switch between newest posts first and ranked by fire count. Both feeds are entirely community-posted, no editorial curation.</div></div>
  <div class="li"><div class="ln a">4</div><div><strong>🔥 fire + username</strong> — tap the flame to react. No likes, no comments — just fire or silence. Tap the username or avatar to follow them and see their future posts.</div></div>
  <div class="li"><div class="ln p">5</div><div><strong>+ Upload</strong> — tap to post your fit. Select a photo from your camera roll. No caption, no hashtags, no tagging required — just post it.</div></div>
  <div class="tp"><strong>The philosophy:</strong> HOT has no comments, no DMs, no text. Streetwear culture is image-driven — your fit speaks for itself. If someone wants to connect, your Instagram and TikTok are on every post automatically.</div>
</div>
</div>

<!-- MORE -->
<div class="pn" id="p-mo">
<div class="ph">
  <div class="sb"><span class="sbt">3:36</span><span class="sbr">4G ⚡32</span></div>
  <div style="background:#0a0e0e;min-height:460px;position:relative;overflow:hidden;">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 25% 55%,rgba(0,55,75,.5) 0%,transparent 55%),radial-gradient(ellipse at 75% 25%,rgba(45,0,65,.35) 0%,transparent 50%);pointer-events:none;"></div>
    <div style="position:relative;padding:14px 13px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
        <div>
          <div style="color:#fff;font-size:24px;font-weight:900;letter-spacing:.01em;line-height:1;">MORE</div>
          <div style="color:#666;font-size:9px;margin-top:2px;">Settings, favourites &amp; more</div>
        </div>
        <div style="font-size:17px;font-weight:900;font-style:italic;line-height:1;background:linear-gradient(90deg,#e84020,#e8a020,#e04020);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;padding-top:4px;">flyaf</div>
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:.5px solid rgba(255,255,255,.07);">
        <div style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#ddd" stroke-width="1.5"><path d="M10 16s-7-5.5-7-9a5 5 0 0110 0c0 3.5-3 7-3 9z" opacity=".5"/><path d="M10 16S3 10.5 3 7a7 7 0 0114 0c0 3.5-3 7-3 9z"/></svg></div>
        <div style="flex:1;"><div style="color:#fff;font-size:11px;font-weight:700;">My FLYAF</div><div style="color:#555;font-size:8.5px;line-height:1.4;">Favourites, saved shops &amp; brands</div></div>
        <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:2px 8px;flex-shrink:0;"><span style="color:#ccc;font-size:8px;font-weight:600;">Sign In</span></div>
        <span style="color:#444;font-size:13px;">›</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:.5px solid rgba(255,255,255,.07);">
        <div style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#ddd" stroke-width="1.5"><circle cx="10" cy="7" r="4"/><path d="M2 18c0-4 3.5-7 8-7s8 3 8 7"/></svg></div>
        <div style="flex:1;"><div style="color:#fff;font-size:11px;font-weight:700;">Profile</div><div style="color:#555;font-size:8.5px;">Account settings &amp; preferences</div></div>
        <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:2px 8px;flex-shrink:0;"><span style="color:#ccc;font-size:8px;font-weight:600;">Sign In</span></div>
        <span style="color:#444;font-size:13px;">›</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:.5px solid rgba(255,255,255,.07);">
        <div style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#ddd" stroke-width="1.5"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 7l8 5 8-5"/></svg></div>
        <div style="flex:1;"><div style="color:#fff;font-size:11px;font-weight:700;">Contact</div><div style="color:#555;font-size:8.5px;">Get in touch, submit a brand</div></div>
        <span style="color:#444;font-size:13px;">›</span>
      </div>
      <div style="display:flex;align-items:center;gap:9px;padding:11px 0;border-bottom:.5px solid rgba(255,255,255,.07);">
        <div style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#ddd" stroke-width="1.5"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/></svg></div>
        <div style="flex:1;"><div style="color:#fff;font-size:11px;font-weight:700;">Settings</div><div style="color:#555;font-size:8.5px;">Location, units &amp; language</div></div>
        <span style="color:#444;font-size:13px;">›</span>
      </div>
      <div style="padding-top:13px;">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:8px;">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="#aaa" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><path d="M2 10h16M10 2a12 12 0 010 16M10 2a12 12 0 000 16"/></svg>
          <span style="color:#fff;font-size:11.5px;font-weight:700;">Language</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <div style="background:#e05040;border-radius:22px;padding:5px 12px;display:flex;align-items:center;gap:4px;"><span style="font-size:11px;">🇬🇧</span><span style="color:#fff;font-size:9.5px;font-weight:700;">English</span></div>
          <div style="background:rgba(255,255,255,.1);border-radius:22px;padding:5px 12px;display:flex;align-items:center;gap:4px;"><span style="font-size:11px;">🇫🇷</span><span style="color:#bbb;font-size:9.5px;">Français</span></div>
          <div style="background:rgba(255,255,255,.1);border-radius:22px;padding:5px 12px;display:flex;align-items:center;gap:4px;"><span style="font-size:11px;">🇨🇳</span><span style="color:#bbb;font-size:9.5px;">中文</span></div>
        </div>
      </div>
    </div>
  </div>
  <div class="bn" style="background:#0a0e0e;border-top-color:#1a1a1a;">
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/></svg><span>Nearby</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17s1-8 5-8 5 8 9 8 4-8 4-8"/></svg><span>Route</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg><span>Index</span></div>
    <div class="ni"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6 6 3 10 5 14c1 2 3 3 7 8 4-5 6-6 7-8 2-4-1-8-7-12z"/></svg><span>Hot</span></div>
    <div class="ni on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span></div>
  </div>
  <div class="cd r" style="top:54px;left:14px;">1</div>
  <div class="cd b" style="top:54px;right:9px;">2</div>
  <div class="cd gr" style="top:184px;left:14px;">3</div>
  <div class="cd a" style="top:318px;left:14px;">4</div>
  <div class="cd p" style="top:350px;left:14px;">5</div>
</div>
<div class="lg">
  <h3>More — settings hub</h3>
  <div class="li"><div class="ln r">1</div><div><strong>My FLYAF</strong> — your personal space: saved routes, favourited brands, favourited shops. Everything you've hearted anywhere in the app collects here.</div></div>
  <div class="li"><div class="ln b">2</div><div><strong>Sign In badge</strong> — My FLYAF, Profile, and Notifications require a free account. Tap Sign In — takes under 30 seconds with Apple, Google, or email.</div></div>
  <div class="li"><div class="ln gr">3</div><div><strong>Contact</strong> — message the FLYAF team directly. Also where to submit a brand you think should be in the Index. No sign-in needed.</div></div>
  <div class="li"><div class="ln a">4</div><div><strong>Language section</strong> — scroll right to see all 8 languages. Tap any pill to switch the entire app instantly. Also accessible via Settings → Language.</div></div>
  <div class="li"><div class="ln p">5</div><div><strong>Active language (red pill)</strong> — currently selected language. Tap any other language pill to switch. Your choice is saved and remembered across sessions.</div></div>
  <div class="tp"><strong>First time?</strong> Switch your language here before exploring anything else — all menus, descriptions, and labels will be in your language from that point on.</div>
</div>
</div>

</div>

<script>
function sw(name,btn){
  document.querySelectorAll('.pn').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.t').forEach(function(b){b.classList.remove('on');});
  document.getElementById('p-'+name).classList.add('on');
  btn.classList.add('on');
}
</script>
`;

// ─── Component ────────────────────────────────────────────────────────────────

const AppGuideScreen: React.FC = () => {
  const navigate = useNavigate();

  // Inject the guide's script after the HTML mounts
  useEffect(() => {
    // The sw() function is defined inside GUIDE_HTML's <script> tag.
    // Because we use dangerouslySetInnerHTML, inline <script> tags don't
    // execute automatically. We extract and eval the script manually.
    const container = document.getElementById('flyaf-guide-content');
    if (!container) return;
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
      document.body.removeChild(newScript);
    });
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 8,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 18,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Go back"
        >
          ←
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
            App Guide
          </div>
          <div style={{ color: '#555', fontSize: 11, marginTop: 1 }}>
            How every section works
          </div>
        </div>

        {/* Version tag — update this when guide content changes */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 6,
            padding: '3px 8px',
            color: '#444',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          v1.0
        </div>
      </div>

      {/* ── Intro strip ── */}
      <div
        style={{
          background: 'rgba(224,80,64,0.08)',
          borderBottom: '0.5px solid rgba(224,80,64,0.15)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>👆</span>
        <span style={{ color: '#aaa', fontSize: 12, lineHeight: 1.4 }}>
          Tap the tabs below to explore each section of the app.
        </span>
      </div>

      {/* ── Guide content ── */}
      <div
        style={{ padding: '16px 16px 40px', flex: 1 }}
        id="flyaf-guide-content"
        dangerouslySetInnerHTML={{ __html: GUIDE_HTML }}
      />

      {/* ── Footer ── */}
      <div
        style={{
          padding: '16px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#333', fontSize: 11 }}>
          Something missing or wrong? →{' '}
          <button
            onClick={() => navigate('/contact')}
            style={{
              background: 'none',
              border: 'none',
              color: '#e05040',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Contact us
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppGuideScreen;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD "APP GUIDE" TO YOUR MORE PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * In your More page component, add a new menu row before Contact:
 *
 *   <div onClick={() => navigate('/guide')} style={{...rowStyle}}>
 *     <div style={{...iconBoxStyle}}>
 *       <BookOpenIcon />
 *     </div>
 *     <div style={{flex:1}}>
 *       <div style={{color:'#fff', fontSize:11, fontWeight:700}}>App Guide</div>
 *       <div style={{color:'#555', fontSize:8.5}}>How every section works</div>
 *     </div>
 *     <span style={{color:'#444', fontSize:13}}>›</span>
 *   </div>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UPDATE PROCESS (when the app UI changes)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Open the GUIDE_HTML string above.
 * 2. Find the relevant section (<!-- NEARBY -->, <!-- ROUTE -->, etc.).
 * 3. Update the HTML mockup and/or the legend text.
 * 4. Bump the version tag in the header: v1.0 → v1.1.
 *
 * No package changes, no rebuild of separate assets. One file to maintain.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
