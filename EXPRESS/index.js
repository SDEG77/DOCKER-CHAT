require('dotenv').config();

const mongoose = require('mongoose');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
const app = createApp();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => console.error('MongoDB connection error:', error));
