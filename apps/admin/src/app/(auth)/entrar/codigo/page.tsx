import { Suspense } from "react";
import { MfaCodeScreen } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <MfaCodeScreen />
    </Suspense>
  );
}
