"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Banner, Button } from "@/shared/components/ds";
import { useAuth } from "@/features/auth/providers/auth-provider";

/** Sai da conta; o guarda de rota leva para /login. */
export function SignOutButton() {
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const failure = await signOut();
    if (failure) {
      setError(failure.message);
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      {error && <Banner tone="danger">{error}</Banner>}
      <Button variant="secondary" icon={LogOut} loading={pending} onClick={handleClick}>
        Sair
      </Button>
    </div>
  );
}
