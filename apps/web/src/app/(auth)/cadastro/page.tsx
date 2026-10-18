import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Criar conta · Guf",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
