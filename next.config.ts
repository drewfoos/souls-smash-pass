import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // ACCEPTED RISKS documented below:
      // unsafe-inline: required by Next.js for inline scripts/styles
      // unsafe-eval: required by Firebase Realtime Database SDK internals
      // *.firebaseio.com: Firebase RTDB long-polling injects <script> tags as fallback
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.googleapis.com https://accounts.google.com https://*.firebaseio.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // data: needed for Next.js image placeholders; blob: for canvas operations
      // Restricted to known image CDNs + Google profile photos (no open https:)
      "img-src 'self' data: blob: https://*.googleusercontent.com https://static.wikia.nocookie.net",
      "font-src 'self' data: https://fonts.gstatic.com",
      // wss:// is required for Firebase's WebSocket transport (preferred over long-polling).
      // https:// covers REST + long-polling fallback.
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firebase.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com",
      "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;