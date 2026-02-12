/**
 * Transforms absolute URLs from the backend into relative URLs
 * to be handled by the Vite Proxy.
 * This fixes "Mixed Content" errors when the app is on HTTPS
 * and the backend returns HTTP URLs.
 */
export const getAssetUrl = (url: string): string => {
    if (!url) return '';

    // Check if it's a local upload from our backend
    if (url.includes('/uploads/')) {
        // Extract the part starting from /uploads/
        const relativePath = url.split('/uploads/')[1];
        if (relativePath) {
            return `/uploads/${relativePath}`;
        }
    }

    // Return original for external URLs or if parsing failed
    return url;
};
