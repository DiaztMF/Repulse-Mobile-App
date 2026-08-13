import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { reached } from "@/firebase/onboarding";

/**
 * Records the onboarding step the user actually landed on, so a return
 * visit resumes instead of restarting.
 *
 * It sits on the routes rather than inside each screen: every onboarding
 * screen has one to three forward paths, and putting the write next to
 * each of them is twenty call sites that all have to be remembered again
 * the next time a step is added.
 */
export function OnboardingProgress() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (user) void reached(user.uid, pathname);
  }, [user, pathname]);

  return <Outlet />;
}
