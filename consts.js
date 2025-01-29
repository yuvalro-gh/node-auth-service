const dotenv = require('dotenv')


dotenv.config();

const {
    APP_PORT,
    MONGO_HOST_ADDRESS,
    MONGO_PORT,
    MONGO_APP_DB,
    MONGO_CONNECTION_TIMEOUT,
    RT_TTL,
    AT_TTL,
    RT_SECRET,
    AT_SECRET
} = process.env;

module.exports = {
    APP_PORT,
    MONGO_HOST_ADDRESS,
    MONGO_PORT,
    MONGO_APP_DB,
    MONGO_CONNECTION_TIMEOUT,
    RT_TTL,
    AT_TTL,
    RT_SECRET,
    AT_SECRET,
    DEV_ORIGIN: 'http://localhost:5173'
};