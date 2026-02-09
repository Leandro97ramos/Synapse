const express = require('express');
const cors = require('cors');
const bubblesRoutes = require('./routes/bubbles.routes');
const terrorRoutes = require('./routes/terror.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const modulesRoutes = require('./routes/modules.routes');
app.use('/api/bubbles', bubblesRoutes); // Keep for backward compatibility if needed, or deprecate
app.use('/api/terror', terrorRoutes);
app.use('/api/modules', modulesRoutes);

app.get('/', (req, res) => {
    res.send('Synapse Relay Server Running');
});

module.exports = app;
