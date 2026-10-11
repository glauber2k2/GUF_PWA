import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/not-found/not-found-screen";

export const metadata: Metadata = {
  title: "Página não encontrada · guf",
  robots: { index: false, follow: false },
};

/** 404 do app (exportada como out/404.html no site estático). */
export default function NotFound() {
  return <NotFoundScreen />;
}
