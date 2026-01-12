// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {}, // Required for Next.js 16+ to work with next-pwa webpack config
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    runtimeCaching: [
        {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "google-fonts",
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
            },
        },
        {
            urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "static-font-assets",
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
                },
            },
        },
        {
            urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "static-image-assets",
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
            },
        },
        {
            urlPattern: /\/_next\/static.+\.js$/i,
            handler: "CacheFirst",
            options: {
                cacheName: "next-static-js-assets",
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
            },
        },
        {
            urlPattern: /\.(?:css|js)$/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "static-assets",
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
            },
        },
        {
            urlPattern: ({ url }) => {
                const isSameOrigin = self.origin === url.origin;
                if (!isSameOrigin) return false;
                const pathname = url.pathname;
                // Exclude API routes from caching
                if (pathname.startsWith("/api/")) return false;
                return true;
            },
            handler: "NetworkFirst",
            options: {
                cacheName: "pages",
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
                networkTimeoutSeconds: 10,
            },
        },
    ],
});

module.exports = withPWA(nextConfig);
