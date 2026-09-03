// These are real end-to-end tests against the live Spring Boot backend and
// Postgres — there is no mocked API layer. Failing fast here with a clear
// message beats every test in the suite failing on its first navigation
// with a cryptic "ECONNREFUSED" from inside a Route Handler.
export default async function globalSetup(): Promise<void> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  // There's no Actuator dependency in this backend, so there's no
  // /actuator/health to poll — /products is a real, always-mounted endpoint
  // that requires auth, so an unauthenticated GET reliably 401s once Spring
  // Security's filter chain is actually up. Any response at all (even 401)
  // is proof the backend is reachable; only a network-level failure (the
  // fetch itself rejecting) means it isn't running.
  try {
    await fetch(`${backendUrl}/products`);
  } catch (err) {
    throw new Error(
      `Backend not reachable at ${backendUrl}. These e2e tests need the real backend and Postgres running ` +
        `first (see backend/README.md for the quickstart). Original error: ${err}`,
    );
  }
}
