import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { FileSpreadsheet, FileJson, Filter } from 'lucide-react';
import { format } from 'date-fns';

export interface ExportFilters {
  startDate: string;
  endDate: string;
  eventType: string;
  userEmail: string;
}

interface AuditLogExportFiltersProps {
  onExport: (format: 'csv' | 'json', filters: ExportFilters) => void;
}

const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'login_success', label: 'Login Success' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'account_locked', label: 'Account Locked' },
  { value: 'ip_locked', label: 'IP Locked' },
  { value: 'admin_unlock_account', label: 'Admin Unlock Account' },
  { value: 'admin_unlock_ip', label: 'Admin Unlock IP' },
];

export const AuditLogExportFilters = ({ onExport }: AuditLogExportFiltersProps) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    startDate: '',
    endDate: '',
    eventType: 'all',
    userEmail: '',
  });

  const handleExport = (format: 'csv' | 'json') => {
    onExport(format, filters);
    setOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      eventType: 'all',
      userEmail: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Export with Filters
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Audit Logs</DialogTitle>
          <DialogDescription>
            Apply filters to export specific security events
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select
              value={filters.eventType}
              onValueChange={(value) => setFilters({ ...filters, eventType: value })}
            >
              <SelectTrigger id="eventType">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder="Filter by email..."
              value={filters.userEmail}
              onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="w-full sm:w-auto"
          >
            Reset Filters
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              className="flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={() => handleExport('json')}
              className="flex-1 sm:flex-none"
            >
              <FileJson className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
