import { Shield, Lock, FileText, Users, Store, Package, Calendar, Mail, Clock, Image, ChevronRight, MessageSquare, Download } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const navGroups = [
  {
    label: "Security",
    icon: Shield,
    items: [
      { title: "Locked Accounts", value: "accounts", icon: Lock },
      { title: "Locked IPs", value: "ips", icon: Lock },
      { title: "Audit Log", value: "audit", icon: FileText },
    ],
  },
  {
    label: "Content",
    icon: Package,
    items: [
      { title: "Brands", value: "brands", icon: Users },
      { title: "Shops", value: "shops", icon: Store },
      { title: "Drops", value: "drops", icon: Package },
      { title: "Calendar", value: "calendar", icon: Calendar },
    ],
  },
  {
    label: "Communications",
    icon: MessageSquare,
    items: [
      { title: "Contact Messages", value: "contact-messages", icon: MessageSquare },
      { title: "Email Analytics", value: "analytics", icon: Mail },
      { title: "Scheduled Exports", value: "scheduled", icon: Clock },
    ],
  },
  {
    label: "Media",
    icon: Image,
    items: [
      { title: "Media Library", value: "media", icon: Image },
      { title: "AI Image Generator", value: "brand-images", icon: Image },
    ],
  },
  {
    label: "Data",
    icon: Download,
    items: [
      { title: "Data Exports", value: "data-exports", icon: Download },
    ],
  },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  // Determine which groups should be open by default
  const getDefaultOpenGroups = () => {
    const openGroups: string[] = [];
    navGroups.forEach((group) => {
      if (group.items.some((item) => item.value === activeTab)) {
        openGroups.push(group.label);
      }
    });
    return openGroups;
  };

  const [openGroups, setOpenGroups] = useState<string[]>(getDefaultOpenGroups());

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r">
        {navGroups.map((group) => {
          const isGroupOpen = openGroups.includes(group.label);
          const GroupIcon = group.icon;

          return (
            <Collapsible
              key={group.label}
              open={isGroupOpen}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <SidebarGroup>
                <CollapsibleTrigger className="w-full group/collapsible">
                  <SidebarGroupLabel className="flex items-center justify-between py-3 px-3 hover:bg-muted/50 rounded-md transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <GroupIcon className="h-4 w-4" />
                      {!isCollapsed && <span className="font-semibold">{group.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          isGroupOpen ? "rotate-90" : ""
                        }`}
                      />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = activeTab === item.value;

                        return (
                          <SidebarMenuItem key={item.value}>
                            <SidebarMenuButton
                              onClick={() => onTabChange(item.value)}
                              className={`cursor-pointer ${
                                isActive
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <ItemIcon className="h-4 w-4" />
                              {!isCollapsed && <span>{item.title}</span>}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
