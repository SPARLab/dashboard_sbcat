import React, { Suspense, lazy } from "react";

// Lazy-load the SafetyApp component  
const SafetyApp = lazy(() => import("../../../ui/safety-app/SafetyApp"));

export default function Safety() {
  return (
    <Suspense fallback={<div>Loading safety dashboard...</div>}>
      <SafetyApp />
    </Suspense>
  );
}
