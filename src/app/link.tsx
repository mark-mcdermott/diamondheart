import type { ComponentProps } from "react";
import { Link as RouterLink, useInRouterContext } from "react-router";
import { API_BASE } from "./api";
import { isAppletPath } from "./paths";
import { NATIVE } from "./platform";

type LinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

/**
 * An `href` link with one rule for the whole applet. Inside the
 * applet a link to another applet path is a client-side route change; a link
 * out to a public page, or any link rendered outside the router (the public
 * nav, an Astro page's island), is an ordinary navigation.
 */
export function Link({ href, ...props }: LinkProps) {
  const inRouter = useInRouterContext();
  if (inRouter && isAppletPath(href)) return <RouterLink to={href} {...props} />;
  // The bundle has no public pages: a link out opens the site in the browser.
  if (NATIVE && href.startsWith("/")) return <a href={`${API_BASE}${href}`} target="_blank" rel="noreferrer" {...props} />;
  return <a href={href} {...props} />;
}
