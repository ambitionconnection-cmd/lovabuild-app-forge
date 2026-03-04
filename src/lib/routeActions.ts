import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface RouteStop {
  id: string | null;
  name: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ==================== SAVE ====================
export const saveRoute = async (
  stops: RouteStop[],
  userLocation: { lat: number; lng: number } | null,
  isPro?: boolean
): Promise<'saved' | 'limit_reached' | 'error' | 'sign_in_required'> => {
  if (stops.length === 0) {
    toast.error('No stops to save');
    return 'error';
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check route limit for free users
    if (!isPro) {
      const { count } = await supabase
        .from('saved_routes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if ((count ?? 0) >= 2) {
        return 'limit_reached';
      }
    }

    // Save to Supabase
    const routeName = `Route - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const { error } = await (supabase.from('saved_routes') as any).insert({
      user_id: user.id,
      name: routeName,
      stops: stops.map(s => ({
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.city,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
    });

    if (error) {
      console.error('Save error:', error);
      toast.error('Failed to save route');
      return 'error';
    } else {
      toast.success(`Route saved as "${routeName}"`);
      return 'saved';
    }
  } else {
    // User not signed in — require sign-in
    return 'sign_in_required';
  }
};

// ==================== HELPERS ====================
const haversineDistance = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatWalkTime = (km: number): string => {
  const mins = Math.round(km / 0.08); // ~5 km/h walking
  if (mins < 60) return `${mins} min walk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min walk` : `${h}h walk`;
};

const formatDriveTime = (km: number): string => {
  const mins = Math.round(km / 0.5); // ~30 km/h city driving
  if (mins < 60) return `${mins} min drive`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min drive` : `${h}h drive`;
};

// ==================== PRINT ====================
export const printRoute = async (
  stops: RouteStop[],
  userLocation: { lat: number; lng: number } | null
) => {
  if (stops.length === 0) {
    toast.error('No stops to print');
    return;
  }

  toast.info('Generating your route PDF…');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // ── Header ──
  doc.setFillColor(3, 3, 4);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(173, 58, 73); // #AD3A49
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('FLYAF', margin, 18);
  doc.setTextColor(195, 201, 201);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Never miss a drop. Never miss a shop.', margin, 26);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(dateStr, margin, 33);

  let y = 46;

  // ── Static Map ──
  const validStops = stops.filter(s => s.latitude && s.longitude);
  if (validStops.length > 0) {
    try {
      const token = 'pk.eyJ1IjoiY2hyaXMtY2FybG9zIiwiYSI6ImNtaWM3MDhpbTBxbHMyanM2ZXdscjZndGoifQ.OhI-E76ufbnm3pQdVzalNQ';
      const pins = validStops
        .map((s, i) => `pin-s-${i + 1}+C4956A(${s.longitude},${s.latitude})`)
        .join(',');

      // Add user location pin if available
      const userPin = userLocation
        ? `pin-s-star+00BCD4(${userLocation.lng},${userLocation.lat}),`
        : '';

      // Auto-fit bounding box
      const allLats = validStops.map(s => s.latitude!);
      const allLngs = validStops.map(s => s.longitude!);
      if (userLocation) {
        allLats.push(userLocation.lat);
        allLngs.push(userLocation.lng);
      }
      const pad = 0.01;
      const bbox = [
        Math.min(...allLngs) - pad,
        Math.min(...allLats) - pad,
        Math.max(...allLngs) + pad,
        Math.max(...allLats) + pad,
      ].join(',');

      const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${userPin}${pins}/[${bbox}]/560x260@2x?access_token=${token}&logo=false&attribution=false`;

      const img = await fetch(mapUrl)
        .then(r => r.blob())
        .then(blob => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      const mapHeight = 55;
      doc.addImage(img, 'PNG', margin, y, contentWidth, mapHeight);

      // Map border
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, mapHeight, 2, 2, 'S');
      y += mapHeight + 6;
    } catch (e) {
      console.warn('Map image failed, skipping:', e);
    }
  }

  // ── Route Summary Card ──
  let totalDistance = 0;
  const legDistances: number[] = [];

  // Calculate from user location to first stop
  if (userLocation && validStops.length > 0) {
    const d = haversineDistance(
      userLocation.lat, userLocation.lng,
      validStops[0].latitude!, validStops[0].longitude!
    );
    legDistances.push(d);
    totalDistance += d;
  }

  // Calculate between consecutive stops
  for (let i = 0; i < validStops.length - 1; i++) {
    const d = haversineDistance(
      validStops[i].latitude!, validStops[i].longitude!,
      validStops[i + 1].latitude!, validStops[i + 1].longitude!
    );
    legDistances.push(d);
    totalDistance += d;
  }

  // Summary box
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(196, 149, 106); // #C4956A
  doc.text(`${stops.length} STOP${stops.length > 1 ? 'S' : ''}`, margin + 6, y + 8);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text(`•  ${totalDistance.toFixed(1)} km total`, margin + 40, y + 8);
  doc.text(`•  ${formatWalkTime(totalDistance)}`, margin + 80, y + 8);
  doc.text(`•  ${formatDriveTime(totalDistance)}`, margin + 120, y + 8);

  // Cities covered
  const cities = [...new Set(stops.map(s => s.city).filter(Boolean))];
  if (cities.length > 0) {
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Cities: ${cities.join(', ')}`, margin + 6, y + 14);
  }
  y += 24;

  // ── Starting Point ──
  if (userLocation) {
    doc.setFillColor(0, 188, 212, 0.15);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, 'F');
    doc.setFillColor(0, 188, 212);
    doc.circle(margin + 6, y + 5, 2.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('★', margin + 5, y + 6.5);
    doc.setTextColor(0, 188, 212);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Your Location (Start)', margin + 14, y + 6.5);
    y += 14;
  }

  // ── Stops List ──
  let legIndex = 0;
  stops.forEach((stop, index) => {
    // Page break check
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    // Leg distance connector
    const hasLeg = userLocation ? legIndex < legDistances.length : index > 0 && legIndex < legDistances.length;
    if (hasLeg) {
      const legDist = legDistances[legIndex];
      // Dotted line
      doc.setDrawColor(80, 80, 80);
      doc.setLineDashPattern([1, 1.5], 0);
      doc.line(margin + 6, y - 2, margin + 6, y + 3);
      doc.setLineDashPattern([], 0);
      // Leg info
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text(`↓ ${legDist.toFixed(1)} km · ${formatWalkTime(legDist)}`, margin + 14, y + 1);
      y += 6;
      legIndex++;
    }

    // Stop card background
    doc.setFillColor(22, 22, 24);
    doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'F');

    // Stop number circle
    doc.setFillColor(196, 149, 106);
    doc.circle(margin + 6, y + 8, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}`, margin + 6, y + 9.5, { align: 'center' });

    // Shop name
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const name = stop.name || 'Unknown Shop';
    doc.text(name.length > 35 ? name.substring(0, 35) + '…' : name, margin + 14, y + 7);

    // Address
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const address = [stop.address, stop.city].filter(Boolean).join(', ');
    doc.text(address || 'No address available', margin + 14, y + 12.5);

    y += 20;
  });

  // ── Create shared route for QR code ──
  let shareUrl = `${window.location.origin}`;
  try {
    const code = generateCode();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from('shared_routes') as any).insert({
      code,
      stops: stops.map(s => ({
        id: s.id, name: s.name, address: s.address,
        city: s.city, latitude: s.latitude, longitude: s.longitude,
      })),
      created_by: user?.id || null,
    });
    if (!error) {
      shareUrl = `${window.location.origin}/route/${code}`;
    }
  } catch (e) {
    console.warn('Could not create share link for QR:', e);
  }

  // ── QR Code + Tips Side by Side ──
  if (y > 230) { doc.addPage(); y = 20; }
  y += 4;

  const qrSize = 30;
  const tipsWidth = contentWidth - qrSize - 10;

  // Tips box (left side)
  doc.setFillColor(196, 149, 106, 0.1);
  doc.roundedRect(margin, y, tipsWidth, 34, 2, 2, 'F');
  doc.setTextColor(196, 149, 106);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('💡 Route Tips', margin + 6, y + 7);
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('• Check opening hours before visiting', margin + 6, y + 14);
  doc.text('• Walking distances are straight-line estimates', margin + 6, y + 19);
  doc.text('• Scan the QR code to open this route', margin + 6, y + 24);
  doc.text('  on your phone with live navigation', margin + 6, y + 29);

  // QR code (right side)
  try {
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 300,
      margin: 1,
      color: { dark: '#C4956A', light: '#16161800' },
    });
    const qrX = margin + tipsWidth + 6;
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(6);
    doc.text('Scan to open route', qrX + qrSize / 2, y + qrSize + 4, { align: 'center' });
  } catch (e) {
    console.warn('QR generation failed:', e);
  }

  y += 40;

  // ── Footer ──
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setDrawColor(50, 50, 50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('Route powered by FLYAF — flyaf.app', margin, y);
  doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, margin, y + 4);
  doc.setTextColor(196, 149, 106);
  doc.text('flyaf.app', pageWidth - margin - 15, y);

  // Open in new tab
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
  toast.success('Route PDF generated');
};

// ==================== SHARE ====================

/** Generate a random 8-char alphanumeric code */
const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const shareRoute = async (
  stops: RouteStop[],
  userLocation: { lat: number; lng: number } | null
) => {
  if (stops.length === 0) {
    toast.error('No stops to share');
    return;
  }

  // Save to shared_routes table and get a short code
  const code = generateCode();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await (supabase.from('shared_routes') as any).insert({
    code,
    stops: stops.map(s => ({
      id: s.id,
      name: s.name,
      address: s.address,
      city: s.city,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    created_by: user?.id || null,
  });

  if (error) {
    console.error('Share error:', error);
    // Fallback to text share
    const stopNames = stops.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
    const shareText = `My FLYAF Route:\n${stopNames}\n\nPlan your streetwear trip at flyaf.app`;
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Route copied to clipboard');
    } catch {
      toast.error('Could not share route');
    }
    return;
  }

  const shareUrl = `${window.location.origin}/route/${code}`;
  const stopNames = stops.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
  const shareText = `My FLYAF Route:\n${stopNames}\n\nFollow the route: ${shareUrl}`;

  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My FLYAF Route',
        text: shareText,
        url: shareUrl,
      });
      return;
    } catch (e) {
      // User cancelled or share failed — fall through to clipboard
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Shareable link copied!');
  } catch {
    toast.error('Could not share route');
  }
};