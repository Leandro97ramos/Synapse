export const getFileType = (url: string, mimeType?: string): 'image' | 'video' | 'audio' | 'gif' | 'unknown' => {
    const lowerUrl = url.toLowerCase();

    // 1. Check for GIF explicitly
    if (lowerUrl.endsWith('.gif') || mimeType === 'image/gif') return 'gif';

    // 2. Check for Video
    if (
        (mimeType && mimeType.startsWith('video/')) ||
        lowerUrl.endsWith('.mp4') ||
        lowerUrl.endsWith('.webm') ||
        lowerUrl.endsWith('.mov')
    ) {
        return 'video';
    }

    // 3. Check for Audio
    if (
        (mimeType && mimeType.startsWith('audio/')) ||
        lowerUrl.endsWith('.mp3') ||
        lowerUrl.endsWith('.wav') ||
        lowerUrl.endsWith('.ogg')
    ) {
        return 'audio';
    }

    // 4. Check for Image (default fallback for visuals if not video/gif)
    if (
        (mimeType && mimeType.startsWith('image/')) ||
        lowerUrl.endsWith('.jpg') ||
        lowerUrl.endsWith('.jpeg') ||
        lowerUrl.endsWith('.png') ||
        lowerUrl.endsWith('.webp') ||
        lowerUrl.endsWith('.svg')
    ) {
        return 'image';
    }

    return 'unknown';
};
