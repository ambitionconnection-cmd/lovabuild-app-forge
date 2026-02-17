import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
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
  userLocation: { lat: number; lng: number } | null
) => {
  if (stops.length === 0) {
    toast.error('No stops to save');
    return;
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Save to Supabase
    const routeName = `Route - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const { error } = await supabase.from('saved_routes').insert({
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
    } else {
      toast.success(`Route saved as "${routeName}"`);
    }
  } else {
    // Save to localStorage for non-logged-in users
    const savedRoutes = JSON.parse(localStorage.getItem('heardrop_saved_routes') || '[]');
    const routeName = `Route - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    savedRoutes.push({
      id: crypto.randomUUID(),
      name: routeName,
      stops: stops.map(s => ({
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.city,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('heardrop_saved_routes', JSON.stringify(savedRoutes));
    toast.success(`Route saved as "${routeName}"`, {
      description: 'Sign in to sync routes across devices',
    });
  }
};

// ==================== PRINT ====================
export const printRoute = (
  stops: RouteStop[],
  userLocation: { lat: number; lng: number } | null
) => {
  if (stops.length === 0) {
    toast.error('No stops to print');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(3, 3, 4);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(173, 58, 73); // #AD3A49
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('HEARDROP', 15, 20);
  doc.setTextColor(195, 201, 201); // #C3C9C9
  doc.setFontSize(10);
  doc.text('Never miss a drop again.', 15, 28);

  // Route title
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Your Route — ${dateStr}`, 15, 48);

  // Stops count
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${stops.length} stop${stops.length > 1 ? 's' : ''}`, 15, 55);

  // Stops list
  let y = 68;
  stops.forEach((stop, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Stop number circle
    doc.setFillColor(196, 149, 106); // #C4956A
    doc.circle(22, y - 2, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}`, 22, y - 1, { align: 'center' });

    // Shop name
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(stop.name || 'Unknown Shop', 32, y);

    // Address
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const address = [stop.address, stop.city].filter(Boolean).join(', ');
    doc.text(address || 'No address', 32, y + 6);

    // Divider line
    y += 14;
    doc.setDrawColor(220, 220, 220);
    doc.line(32, y, pageWidth - 15, y);
    y += 10;
  });

  // Footer
  y += 5;
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text('Route powered by HEARDROP — heardrop.app', 15, y);
  doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, 15, y + 5);

  // Open in new tab
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
  toast.success('Route PDF generated');
};

// ==================== SHARE ====================
export const shareRoute = async (
  stops: RouteStop[],
  userLocation: { lat: number; lng: number } | null
) => {
  if (stops.length === 0) {
    toast.error('No stops to share');
    return;
  }

  const stopNames = stops.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
  const shareText = `My HEARDROP Route:\n${stopNames}\n\nPlan your streetwear trip at heardrop.app`;

  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My HEARDROP Route',
        text: shareText,
        url: 'https://heardrop.app',
      });
      return;
    } catch (e) {
      // User cancelled or share failed — fall through to clipboard
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(shareText);
    toast.success('Route copied to clipboard');
  } catch {
    toast.error('Could not share route');
  }
};