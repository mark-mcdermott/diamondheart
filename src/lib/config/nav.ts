import type { NavLink } from "@/components/blocks/nav";

export const defaultNavLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", requiresAuth: true },
  { label: "Meditate", href: "/meditate", requiresAuth: true },
  { label: "Habits", href: "/habits", requiresAuth: true },
  { label: "Merch", href: "/merch", requiresAuth: true },
  { label: "About", href: "/about" },
];
