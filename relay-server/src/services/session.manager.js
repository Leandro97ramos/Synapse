class SessionManager {
    constructor() {
        if (!SessionManager.instance) {
            this.state = {
                currentPhase: 'neutral', // neutral, low, medium, high
                pacingSpeed: 1.0, // Multiplier (0.5x to 2.0x)
                imageIndex: 0,
                startTime: Date.now(),
                activeViewers: 0
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
