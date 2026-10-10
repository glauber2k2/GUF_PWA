"use client";

import { Logo } from "@/components/ds";
import { useAuth } from "@/providers/auth-provider";
import { SignOutButton } from "./sign-out-button";

export function HomePlaceholder() {
  const { user } = useAuth();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo size="md" />
      <h1 className="m-0 text-[22px] leading-7 font-semibold">Você entrou</h1>
      <p className="m-0 text-sm text-fg-secondary">{user?.email}</p>
      <SignOutButton />
    </main>
  );
}
