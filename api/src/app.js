import express from 'express';
import { errorHandler, notFound } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);

app.use(notFound);
app.use(errorHandler);
