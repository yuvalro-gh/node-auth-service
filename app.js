const handlers = require('./handlers.js')
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookie_parser = require('cookie-parser');


dotenv.config();

// Set up MongoDB connection
const mongo_uri = `mongodb://${process.env.MONGO_HOST_ADDRESS}:${process.env.MONGO_PORT}/${process.env.MONGO_DB_NAME}`
mongoose
    .connect(
        mongo_uri,
        { serverSelectionTimeoutMS: process.env.MONGO_CONNECTION_ATTEMPT_TIMEOUT }
    )
    .then(() => {
        console.log(`Connection to MongoDB established (${mongo_uri}).`);
    })
    .catch((err) => {
        console.error(`Connection to MongoDB failed (${mongo_uri}).`);
        throw err;
    });

// Set up Express app
const express_uri = `http://${process.env.APP_HOST_ADDRESS}:${process.env.APP_PORT}`
const app = express();
app.use(cookie_parser())
app.use(express.json());
app.post('/sign-up', handlers.sign_up);
app.post('/sign-in', handlers.sign_in);
app.post('/refresh', handlers.refresh);
app.post('/sign-out', handlers.sign_out);
app.post('/verify', handlers.verify);
app.listen(process.env.APP_PORT);
console.log(`Express app is up and running (${express_uri}).`);
