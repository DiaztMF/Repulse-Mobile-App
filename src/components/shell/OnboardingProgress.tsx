import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { reached } from "@/firebase/onboarding";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export function OnboardingProgress() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (user) void reached(user.uid, pathname);
  }, [user, pathname]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}
