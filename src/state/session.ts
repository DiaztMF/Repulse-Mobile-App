import { createContext, useContext, useEffect } from "react";
import type { DeviceState } from "@/components/shell/Header";

/** Placeholder until the BLE layer lands. What matters now is that
 *  `isNight` has one owner, so the hide-chrome rule can't drift into
 *  individual screens. */
export type Session = {
  isNight: boolean;
  devices: DeviceState;
};

export const SessionContext = createContext<Session>({
  isNight: false,
  devices: "none",
});

export function useSession() {
  const s = useContext(SessionContext);

  // Flag lives on <html> so color tokens shift together.
  useEffect(() => {
    document.documentElement.dataset.night = String(s.isNight);
  }, [s.isNight]);

  return s;
}
