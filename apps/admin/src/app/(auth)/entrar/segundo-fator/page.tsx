import { Suspense } from "react";
import { MfaSetupScreen } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <MfaSetupScreen />
    </Suspense>
  );
}
