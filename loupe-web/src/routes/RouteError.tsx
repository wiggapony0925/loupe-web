import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ErrorState } from "@/components/ErrorBoundary/ErrorBoundary";

/**
 * Router `errorElement` — branded recovery for any route load/render error
 * (including lazy-chunk fetch failures after a deploy). Reuses the shared
 * `ErrorState`; a 404-shaped route error gets a "not found" message.
 */
export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorState
        title="Page not found"
        message="That page doesn't exist or has moved."
      />
    );
  }

  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : null;

  return <ErrorState detail={detail} />;
}
