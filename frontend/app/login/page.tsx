import { Suspense } from "react";
import LoginForm from "./LoginForm";

// useSearchParams() (used inside LoginForm to read ?next=) requires a
// Suspense boundary in the App Router, or Next.js fails static
// generation for this route. Splitting the client component out and
// wrapping it here rather than making this whole file "use client".
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
