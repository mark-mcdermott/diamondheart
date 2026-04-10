import type { NavLink } from "@/components/blocks/nav";

export const defaultNavLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", requiresAuth: true },
  { label: "About", href: "/about", hideWhenAuth: true },
];
