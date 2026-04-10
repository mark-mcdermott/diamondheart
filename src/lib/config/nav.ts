import type { NavLink } from "@/components/blocks/nav";

export const defaultNavLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", requiresAuth: true },
  { label: "Meditate", href: "/meditate", requiresAuth: true },
  { label: "Food", href: "/food", requiresAuth: true },
  { label: "Tracking", href: "/tracking", requiresAuth: true },
  { label: "Medical", href: "/medical", requiresAuth: true },
  { label: "Entertainment", href: "/entertainment", requiresAuth: true },
  { label: "About", href: "/about", hideWhenAuth: true },
];
