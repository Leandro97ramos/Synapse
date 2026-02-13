const express = require('express');
const cors = require('cors');
const path = require('path');
const bubblesRoutes = require('./routes/bubbles.routes');
//const terrorRoutes = require('./routes/terror.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const modulesRoutes = require('./routes/modules.routes');
const foldersRoutes = require('./routes/folders.routes');
const assetsRoutes = require('./routes/assets.routes');
const profilesRoutes = require('./routes/profiles.routes');

app.use('/api/bubbles', bubblesRoutes); // Keep for backward compatibility if needed, or deprecate
app.use('/api/modules', modulesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/profiles', profilesRoutes);

app.get('/', (req, res) => {
    res.send('Synapse Relay Server Running');
});

module.exports = app;
