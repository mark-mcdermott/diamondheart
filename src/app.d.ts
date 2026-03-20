// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import('lucia').User | null;
			session: import('lucia').Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				DATABASE_URL?: string;
				R2_AVATARS?: import('$lib/server/backup').R2Bucket;
				R2_BACKUPS?: import('$lib/server/backup').R2Bucket;
				R2_PUBLIC_URL?: string;
				STRIPE_SECRET_KEY?: string;
				STRIPE_WEBHOOK_SECRET?: string;
				USDA_API_KEY?: string;
				PRINTFUL_API_KEY?: string;
				BACKUP_SECRET?: string;
			};
		}
	}
}

export {};
