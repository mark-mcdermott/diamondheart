/// <reference types="astro/client" />

/** What the client bundles may read: `PUBLIC_*`, stamped at build time. */
interface ImportMetaEnv {
  /** Where the API lives; empty on the web, absolute in the native bundle. */
  readonly PUBLIC_API_BASE?: string;
  /** "1" in the native bundle. */
  readonly PUBLIC_NATIVE?: string;
  readonly PUBLIC_VAPID_PUBLIC_KEY?: string;
}
