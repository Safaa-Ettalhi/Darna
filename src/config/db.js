import mongoose from 'mongoose';

class DatabaseConfig {
    async connect() {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('MongoDB connected successfully');
        } catch (error) {
            console.error('MongoDB connection error:', error.message);
            throw error;
        }
    }

    async disconnect() {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
    }
}

export default new DatabaseConfig();
