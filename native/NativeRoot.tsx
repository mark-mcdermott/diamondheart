import { useEffect, useState } from "react";
import { AppRoot } from "@/app/AppRoot";
import { setUnauthorizedHandler } from "@/app/api";
import { RootIslands } from "@/components/islands/root-islands";
import { Login } from "@/components/islands/login";
import { Signup } from "@/components/islands/signup";
import { Skeleton } from "@/components/ui/skeleton";
import { clearToken, loadToken } from "@/lib/session-token";

/**
 * The bundled applet's root (docs/PORT-PLAN.md, Decision 9). There are no
 * public pages here: with a stored bearer token the applet mounts on memory
 * history; without one the sign-in screen shows, and a successful sign-in
 * stores the token and reloads into the applet.
 */
type State = "loading" | "signed-out" | "signed-in";

export function NativeRoot() {
  const [state, setState] = useState<State>("loading");
  const [screen, setScreen] = useState<"login" | "signup">("login");

  useEffect(() => {
    void loadToken().then((token) => setState(token ? "signed-in" : "signed-out"));
    setUnauthorizedHandler(() => {
      void clearToken().then(() => setState("signed-out"));
    });
  }, []);

  return (
    <>
      {state === "loading" && (
        <div className="min-h-screen px-4 py-6" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-7 w-40 rounded-lg mb-8" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      )}
      {state === "signed-out" && (
        <div className="flex min-h-screen flex-col">
          {screen === "login" ? <Login /> : <Signup />}
          <p className="pb-8 text-center text-sm text-muted-foreground">
            {screen === "login" ? (
              <>
                New here?{" "}
                <button type="button" className="text-primary font-medium" onClick={() => setScreen("signup")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" className="text-primary font-medium" onClick={() => setScreen("login")}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      )}
      {state === "signed-in" && (
        <AppRoot
          router="memory"
          onSignedOut={() => {
            void clearToken().then(() => setState("signed-out"));
          }}
        />
      )}
      <RootIslands />
    </>
  );
}
