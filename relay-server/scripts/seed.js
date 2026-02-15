const db = require('../src/config/db.config');
const MediaAsset = require('../src/models/MediaAsset');
const UserSetting = require('../src/models/UserSetting');

async function seed() {
    try {
        console.log('Seeding database...');

        // 1. User Settings
        console.log('Seeding User Settings...');
        // Assuming User ID 1 exists (Guest user)
        await UserSetting.save(1, {
            ipd: 64,
            vOffset: 0,
            scale: 1.0,
            brightness: 80
        });

        // 2. Media Assets
        console.log('Seeding Media Assets...');

        const assets = [
            {
                name: 'Bambi Forest',
                type: 'image',
                url: 'https://images.unsplash.com/photo-1448375240586-dfd8f3793306?auto=format&fit=crop&w=1920&q=80',
                category: 'bambi',
                metadata: { curvature: 0.2 }
            },
            {
                name: 'Bambi Stream',
                type: 'image',
                url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1920&q=80',
                category: 'bambi',
                metadata: { curvature: 0.1 }
            },
            {
                name: 'Funny Cat',
                type: 'gif',
                url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
                category: 'funny',
                metadata: { loop: true }
            },
            {
                name: 'Dancing Dog',
                type: 'gif',
                url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif',
                category: 'funny',
                metadata: { loop: true }
            },
            {
                name: 'Ocean Waves',
                type: 'video',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Placeholder video
                category: 'relax',
                metadata: { volume: 0.5 }
            }
        ];

        for (const asset of assets) {
            await MediaAsset.create(asset);
            console.log(`Created asset: ${asset.name}`);
        }

        console.log('Seeding complete!');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
