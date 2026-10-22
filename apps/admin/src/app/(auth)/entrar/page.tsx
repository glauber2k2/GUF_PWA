import { Suspense } from "react";
import { LoginScreen } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
