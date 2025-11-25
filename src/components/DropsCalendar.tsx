import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Drop = Tables<'drops'>;
type Brand = Tables<'brands'>;

interface DropWithBrand extends Drop {
  brand?: Brand;
}

export function DropsCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [drops, setDrops] = useState<DropWithBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDrops, setSelectedDrops] = useState<DropWithBrand[]>([]);

  useEffect(() => {
    fetchDrops();
  }, [currentMonth]);

  const fetchDrops = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('drops')
        .select(`
          *,
          brand:brands(*)
        `)
        .gte('release_date', monthStart.toISOString())
        .lte('release_date', monthEnd.toISOString())
        .order('release_date');

      if (error) throw error;

      setDrops(data || []);
    } catch (error: any) {
      console.error('Error fetching drops:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load drops",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDropsForDate = (date: Date) => {
    return drops.filter(drop => 
      isSameDay(new Date(drop.release_date), date)
    );
  };

  const handleDateClick = (date: Date) => {
    const dropsOnDate = getDropsForDate(date);
    if (dropsOnDate.length > 0) {
      setSelectedDate(date);
      setSelectedDrops(dropsOnDate);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-primary/10 text-primary border-primary/20',
      live: 'bg-green-500/10 text-green-600 border-green-500/20',
      ended: 'bg-muted text-muted-foreground border-border',
    };
    return colors[status] || colors.upcoming;
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Drops Calendar</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[200px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Week day headers */}
              {weekDays.map(day => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, idx) => {
                const dropsOnDay = getDropsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-2 border rounded-lg transition-colors ${
                      isCurrentMonth 
                        ? 'bg-background hover:bg-muted/50 cursor-pointer' 
                        : 'bg-muted/30 text-muted-foreground'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => isCurrentMonth && handleDateClick(day)}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dropsOnDay.slice(0, 3).map((drop) => (
                        <div
                          key={drop.id}
                          className={`text-xs px-2 py-1 rounded border ${getStatusColor(drop.status || 'upcoming')} truncate`}
                          title={drop.title}
                        >
                          {drop.title}
                        </div>
                      ))}
                      {dropsOnDay.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dropsOnDay.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/10 border border-primary/20"></div>
              <span className="text-xs">Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/10 border border-green-500/20"></div>
              <span className="text-xs">Live</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted border border-border"></div>
              <span className="text-xs">Ended</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Details Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Drops on {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDrops.map((drop) => (
              <Card key={drop.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{drop.title}</h3>
                        <Badge variant={
                          drop.status === 'live' ? 'default' : 
                          drop.status === 'ended' ? 'secondary' : 
                          'outline'
                        }>
                          {drop.status}
                        </Badge>
                        {drop.is_featured && <Badge variant="secondary">Featured</Badge>}
                        {drop.is_pro_exclusive && <Badge>Pro</Badge>}
                      </div>
                      {drop.brand && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Brand: {drop.brand.name}
                        </p>
                      )}
                      {drop.description && (
                        <p className="text-sm text-muted-foreground">
                          {drop.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>{format(new Date(drop.release_date), 'h:mm a')}</span>
                        {drop.discount_code && (
                          <Badge variant="outline" className="font-mono">
                            {drop.discount_code}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {drop.image_url && (
                      <img
                        src={drop.image_url}
                        alt={drop.title}
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
