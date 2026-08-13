import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { Placeholder } from "@/screens/Placeholder";
import { KitchenSink } from "@/screens/KitchenSink";
import { Splash } from "@/screens/onboarding/Splash";
import { Login } from "@/screens/onboarding/Login";
import { Permissions } from "@/screens/onboarding/Permissions";
import { Wordmark } from "./components/brand/Wordmark";

/**
 * Every screen gets its route up front, even unbuilt ones — adding
 * routes later means rearranging navigation later.
 * Screen codes (O1, M1, V2, ...) match the spec.
 */
export const router = createBrowserRouter([
  // Onboarding — outside the shell, no tab bar
  { path: "/", element: <Splash /> },
  { path: "/brand", element: <Wordmark /> },
  { path: "/masuk", element: <Login /> },
  { path: "/izin", element: <Permissions /> },
  { path: "/izin/autostart", element: <Placeholder code="O4" name="Izin autostart" /> },
  { path: "/panduan", element: <Placeholder code="O5" name="Panduan pasang" /> },
  { path: "/pasang/gelang", element: <Placeholder code="O6" name="Pairing gelang" /> },
  { path: "/pasang/bedside", element: <Placeholder code="O7" name="Pairing bedside" /> },
  { path: "/kalibrasi", element: <Placeholder code="O8" name="Kalibrasi baseline" /> },
  { path: "/kontak", element: <Placeholder code="O9 · D3" name="Kontak darurat" /> },
  { path: "/siap", element: <Placeholder code="O10" name="Siap" /> },

  // Three tabs — inside the shell
  {
    element: <AppShell />,
    children: [
      { path: "/malam", element: <Placeholder code="M1" name="Beranda" /> },
      { path: "/malam/sesi", element: <Placeholder code="M2" name="Sesi aktif" /> },

      { path: "/vital", element: <Navigate to="/vital/nadi" replace /> },
      { path: "/vital/tidur", element: <Placeholder code="V1" name="Skor Tidur" /> },
      { path: "/vital/nadi", element: <Placeholder code="V2" name="Nadi" /> },
      { path: "/vital/napas", element: <Placeholder code="V3" name="Napas" /> },
      { path: "/vital/gerak", element: <Placeholder code="V4" name="Gerak & posisi" /> },
      { path: "/vital/kamar", element: <Placeholder code="V5" name="Kamar" /> },

      { path: "/sehat", element: <Placeholder code="S1" name="Riwayat" /> },
      { path: "/sehat/malam/:tanggal", element: <Placeholder code="S2" name="Detail malam" /> },
      { path: "/sehat/napas", element: <Placeholder code="S3" name="Tren napas" /> },
      { path: "/sehat/wawasan", element: <Placeholder code="S4" name="Wawasan intervensi" /> },

      { path: "/atur", element: <Placeholder code="D1" name="Pengaturan" /> },
      { path: "/perangkat", element: <Placeholder code="D2" name="Perangkat & baterai" /> },
      { path: "/panel-uji", element: <Placeholder code="D4" name="Panel uji" /> },
      { path: "/keluarga", element: <Placeholder code="D5" name="Keluarga — kelola" /> },
      { path: "/ekspor", element: <Placeholder code="D6" name="Ekspor" /> },
      { path: "/ekg", element: <Placeholder code="D7" name="Rekam EKG" /> },

      // Token check page. Drop before shipping.
      { path: "/kitchen-sink", element: <KitchenSink /> },
    ],
  },

  // Outside navigation — takes over the screen
  { path: "/alert", element: <Placeholder code="X1" name="ALERT" /> },
  { path: "/sos", element: <Placeholder code="X2" name="SOS" /> },
  { path: "/keluarga/lihat", element: <Placeholder code="X4" name="Keluarga — viewer" /> },
  { path: "/darurat/dipantau", element: <Placeholder code="X5" name="Darurat orang dipantau" /> },

  { path: "*", element: <Navigate to="/malam" replace /> },
]);
