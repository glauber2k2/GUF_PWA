import { Suspense } from "react";
import { FirstAccessScreen } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <FirstAccessScreen />
    </Suspense>
  );
}
