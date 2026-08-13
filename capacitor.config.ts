import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "id.repulse.app",
  appName: "RePulse",
  webDir: "dist",
  android: {
    // No light theme — this app is used in a dark room.
    backgroundColor: "#100D0A",
  },
};

export default config;
