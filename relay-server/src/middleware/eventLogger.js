const sessionManager = require('../services/session.manager');

const eventLogger = (socket, next) => {
    // Intercept incoming events
    socket.onAny((eventName, ...args) => {
        // Log specific events relevant to session analysis
        if (eventName.startsWith('host:') || eventName === 'change_folder' || eventName === 'trigger_screamer') {
            sessionManager.logEvent(eventName, args[0]);
        }
    });
    next();
};

module.exports = eventLogger;
