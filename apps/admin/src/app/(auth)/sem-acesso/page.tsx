import { Suspense } from "react";
import { NoAccessScreen } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <NoAccessScreen />
    </Suspense>
  );
}
