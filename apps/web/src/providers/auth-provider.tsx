"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut as apiSignOut, type AuthError, type Session, type User } from "@guf/api";
import { getSupabaseClient } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  /** true até o Supabase informar a sessão inicial (inclui a troca do ?code= do PKCE). */
  isLoading: boolean;
  signOut: () => Promise<AuthError | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    // INITIAL_SESSION chega primeiro (após ler o armazenamento e trocar o ?code= do PKCE).
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      // Privacidade: não deixar dados de um usuário no cache para o próximo.
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = useCallback(async () => {
    const { error } = await apiSignOut(getSupabaseClient());
    return error;
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user: session?.user ?? null, session, isLoading, signOut }),
    [session, isLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Usuário logado, sessão e estado de carregamento. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
