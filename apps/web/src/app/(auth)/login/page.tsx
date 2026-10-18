import type { Metadata } from "next";
import { LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Entrar · Guf",
};

export default function LoginPage() {
  return <LoginForm />;
}
