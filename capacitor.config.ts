import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "id.repulse.app",
  appName: "RePulse",
  webDir: "dist",
  android: {
    // No light theme — this app is used in a dark room.
    backgroundColor: "#100D0A",
  },
  plugins: {
    FirebaseAuthentication: {
      // The native side hands back a Google ID token and stops there; the
      // JS SDK still owns the session. Anything else would leave two
      // notions of "who is signed in" — one native, one in the WebView —
      // and every Firestore read in this app belongs to the second.
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
};

export default config;
