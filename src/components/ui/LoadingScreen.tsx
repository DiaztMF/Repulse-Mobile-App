import { BrandSpinner } from "@/components/brand/BrandSpinner";

/**
 * Reusable smooth loading screen component using BrandSpinner.
 */
export function LoadingScreen({ text }: { text?: string }) {
  return <BrandSpinner size="fullscreen" label={text} />;
}
