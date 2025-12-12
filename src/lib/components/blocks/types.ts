// Use a permissive type for icons that works with both Svelte 5 and legacy components (lucide-svelte)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = any;

// Dropdown link item (used inside dropdowns)
export interface DropdownLink {
	label: string;
	href?: string;
	icon?: IconComponent;
	separator?: boolean; // if true, render a separator line above this item
	testId?: string;
	class?: string;
	id?: string;
	data?: Record<string, string>;
	// For form-based actions like logout
	action?: string;
	method?: 'GET' | 'POST';
}

// Main nav link
export interface NavLink {
	label?: string;
	href?: string;
	icon?: IconComponent;
	iconSize?: 'sm' | 'md' | 'lg'; // sm: 16px, md: 20px (default), lg: 24px
	requiresAuth?: boolean; // only show when logged in
	requiresAdmin?: boolean; // only show for admins
	hideWhenAuth?: boolean; // hide when logged in (e.g., login/signup links)
	testId?: string;
	class?: string;
	id?: string;
	data?: Record<string, string>;
	// If provided, this link becomes a dropdown
	children?: DropdownLink[];
}

// Avatar configuration
export interface AvatarConfig {
	show?: boolean; // defaults to true when logged in
	links?: DropdownLink[];
}
