import 'dotenv/config';
import app, { connectDb } from './src/app.js';

const PORT = process.env.PORT || 5000;

async function start() {
    try {
        await connectDb();
        app.listen(PORT, () => console.log(`Server running on ${PORT}`));
    } catch (err) {
        console.error('Startup failed:', err?.message || err);
        process.exit(1);
    }
}

start();
