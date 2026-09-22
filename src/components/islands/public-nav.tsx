import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { Nav } from "@/components/blocks/nav";
import { defaultNavLinks } from "@/lib/config/nav";
import { $user, loadUser } from "@/stores/user";

/** The marketing nav, with the avatar of whoever is signed in read through the user store. */
export function PublicNav() {
  const user = useStore($user);
  useEffect(() => {
    void loadUser();
  }, []);

  return <Nav logo="💎💜" links={defaultNavLinks} user={user} showThemeToggle />;
}
