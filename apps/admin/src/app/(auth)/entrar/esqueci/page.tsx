import { Suspense } from "react";
import { ForgotPasswordScreen } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <ForgotPasswordScreen />
    </Suspense>
  );
}
