import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * O1 — Splash. Holds until auth state is known. No spinner: if it takes
 * longer than two seconds, the animation isn't the problem.
 * No tagline, no version number.
 */
export function Splash() {
  const navigate = useNavigate();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Fixed duration until Firebase auth exists.
    const fade = setTimeout(() => setFading(true), 1750);
    const go = setTimeout(() => navigate("/sign-in", { replace: true }), 2250);
    return () => {
      clearTimeout(fade);
      clearTimeout(go);
    };
  }, [navigate]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--color-base)] px-12 transition-opacity duration-500"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <div className="w-full max-w-[260px]">
        <Wordmark animate className="block h-auto w-full" />
      </div>
    </div>
  );
}
