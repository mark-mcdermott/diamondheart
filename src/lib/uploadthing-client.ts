import { generateReactHelpers } from "@uploadthing/react";
import { API_BASE } from "@/app/api";
import { siteUrl } from "@/app/platform";
import type { OurFileRouter } from "@/lib/uploadthing";

/**
 * The upload route lives on the site. Left relative, the bundle would ask its
 * own origin for it and parse the applet's HTML as JSON (Decision 9).
 */
export const { useUploadThing } = generateReactHelpers<OurFileRouter>({ url: siteUrl("/api/uploadthing", API_BASE) });
