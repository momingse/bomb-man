import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import SequelizeStore from 'connect-session-sequelize';
import dotenv from 'dotenv';
import { httpLogger } from './logger.js';

// Import database configuration
import sequelize from './config/db.js';

// Import routes
import authRoute from './routes/auth.js';

// Import models
import './models/User.js';

dotenv.config();

const app = express();

app.use(httpLogger);

const SessionStore = SequelizeStore(session.Store);
const store = new SessionStore({
  db: sequelize,
});

app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Routes
app.use('/auth', authRoute);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('API is running');
});

const startServer = async () => {
  try {
    await sequelize.sync();
    await store.sync();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

startServer();
