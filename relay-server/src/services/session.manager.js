class SessionManager {
    constructor() {
        if (!SessionManager.instance) {
            this.state = {
                currentPhase: 'neutral', // neutral, low, medium, high
                pacingSpeed: 1.0, // Multiplier (0.5x to 2.0x)
                imageIndex: 0,
                startTime: Date.now(),
                activeViewers: 0,
                currentMedia: null, // { url, type, ... }
                breathingRate: { inhale: 4, exhale: 4, hold: 0 },
                activeLayers: {},
                // Playlist Management (In-Memory)
                playlist: [], // Array of IDs in order
                playlistMap: {}, // Map ID -> Asset Data for quick lookup
            };
            SessionManager.instance = this;
        }
        return SessionManager.instance;
    }

    getState() {
        return this.state;
    }

    updatePacing(speed) {
        // Validate speed range (0.1 to 5.0)
        const safeSpeed = Math.max(0.1, Math.min(5.0, Number(speed) || 1.0));
        this.state.pacingSpeed = safeSpeed;
        return this.state.pacingSpeed;
    }

    setPhase(phase) {
        const validPhases = ['neutral', 'low', 'medium', 'high', 'peak'];
        if (validPhases.includes(phase)) {
            this.state.currentPhase = phase;
        }
        return this.state.currentPhase;
        // --- INDUCTION LAYERS & EFFECTS ---

        toggleLayer(layer, isActive) {
            // Validation: Verify layer name if needed
            const validLayers = ['spiral', 'flashback', 'breathing', 'ghost']; // Added ghost
            if (validLayers.includes(layer)) {
                this.state.activeLayers[layer] = !!isActive;
                console.log(`[SessionManager] Layer '${layer}' set to ${isActive}`);
            }
            return this.state.activeLayers;
        }

        setBreathingRate(rate) {
            // Validate structure { inhale, exhale, hold }
            if (rate && typeof rate.inhale === 'number') {
                this.state.breathingRate = {
                    inhale: Math.max(0, rate.inhale),
                    exhale: Math.max(0, rate.exhale),
                    hold: Math.max(0, rate.hold || 0)
                };
            }
            return this.state.breathingRate;
        }

        // --- PLAYLIST MANAGEMENT ---

        setPlaylist(assets) {
            // assets: Array of asset objects
            // We store the order of IDs and a map for details
            this.state.playlist = assets.map(a => a.id);
            this.state.playlistMap = assets.reduce((acc, asset) => {
                acc[asset.id] = asset;
                return acc;
            }, {});
            console.log(`[SessionManager] Playlist set with ${this.state.playlist.length} items.`);
            return this.state.playlist;
        }

        reorderPlaylist(newOrderIds) {
            // Validation: Verify all IDs exist in our map (optional but safer)
            // For speed, we might just trust the host, or filter.
            const validIds = newOrderIds.filter(id => this.state.playlistMap[id]);

            if (validIds.length > 0) {
                this.state.playlist = validIds;
                console.log(`[SessionManager] Playlist reordered. New count: ${this.state.playlist.length}`);
            }
            return this.state.playlist;
        }

        getNextAsset(currentAssetId) {
            if (!this.state.playlist.length) return null;

            const currentIndex = this.state.playlist.indexOf(currentAssetId);
            // If not found (-1), start at 0. If found, next one.
            // Loop back to start if at end? usually yes for ambient/looping phases.
            let nextIndex = (currentIndex + 1) % this.state.playlist.length;

            const nextId = this.state.playlist[nextIndex];
            return this.state.playlistMap[nextId];
        }


        setCurrentMedia(media) {
            this.state.currentMedia = {
                ...media,
                timestamp: Date.now()
            };
            return this.state.currentMedia;
        }

        // Called when a viewer connects/disconnects
        updateViewerCount(count) {
            this.state.activeViewers = count;
        }

        updateHeartbeat(data) {
            this.state.lastHeartbeat = {
                timestamp: Date.now(),
                ...data
            };
            // optional: log if needed, or just keep latest state
        }

        getLastHeartbeat() {
            return this.state.lastHeartbeat || null;
        }

        // Internal helper to log important state changes
        logEvent(eventType, details) {
            console.log(`[SESSION-LOG] ${new Date().toISOString()} | ${eventType} |`, details);
            // Future: Save to DB
        }
    }

    const instance = new SessionManager();
Object.freeze(instance);

module.exports = instance;
