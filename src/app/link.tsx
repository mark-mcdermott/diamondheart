import type { ComponentProps } from "react";
import { Link as RouterLink, useInRouterContext } from "react-router";
import { isAppletPath } from "./paths";

type LinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

/**
 * `next/link`'s shape, so call sites changed only their import. Inside the
 * applet a link to another applet path is a client-side route change; a link
 * out to a public page, or any link rendered outside the router (the public
 * nav, an Astro page's island), is an ordinary navigation.
 */
export function Link({ href, ...props }: LinkProps) {
  const inRouter = useInRouterContext();
  if (inRouter && isAppletPath(href)) return <RouterLink to={href} {...props} />;
  return <a href={href} {...props} />;
}
