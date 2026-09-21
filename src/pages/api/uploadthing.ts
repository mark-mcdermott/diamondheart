import type { APIRoute } from "astro";
import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "@/lib/uploadthing";

export const prerender = false;

const handle = createRouteHandler({ router: uploadRouter });

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
