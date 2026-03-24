"use client";

/**
 * Catches errors in the root layout itself.
 * Must render its own <html> and <body> since the layout may have crashed.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className="min-h-dvh antialiased"
        style={{ backgroundColor: "#0a0a0c", color: "#e8e4dc" }}
      >
        <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center select-none">
          <h1
            style={{
              fontFamily: "serif",
              fontWeight: 900,
              color: "#ff5277",
              fontSize: "clamp(3rem, 12vw, 7rem)",
              textShadow: "0 0 60px rgba(255,82,119,0.2)",
              lineHeight: 1,
              marginBottom: "0.5rem",
            }}
          >
            YOU DIED
          </h1>

          <p style={{ color: "rgba(232,228,220,0.6)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
            Something went seriously wrong.
          </p>
          <p style={{ color: "rgba(232,228,220,0.3)", fontSize: "0.6875rem", marginBottom: "2.5rem" }}>
            The Erdtree&apos;s grace has been lost
          </p>

          <button
            onClick={reset}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#d4af37",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: "0.75rem",
              background: "rgba(212,175,55,0.1)",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
