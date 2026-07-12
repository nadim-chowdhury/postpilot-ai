import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  ListChecks,
  Activity,
  Settings,
  Globe,
  LineChart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navConfig: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Pages",
        href: "/pages",
        icon: Globe,
      },
      {
        label: "Content",
        href: "/content",
        icon: FileText,
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: LineChart,
      },
      {
        label: "Queue",
        href: "/queue",
        icon: ListChecks,
      },
      {
        label: "Activity",
        href: "/activity",
        icon: Activity,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
