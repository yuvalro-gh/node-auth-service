const handlers = require('./handlers.js')
const CONSTS = require('./consts.js')
const mongoose = require('mongoose')
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');


// Set up Express app
const app = express();
app.use(morgan('dev'));
app.use(cookieParser())
app.use(express.json());
app.use(cors({ origin: CONSTS.DEV_ORIGIN, credentials: true })) // TODO Remove on production.
/*
curl -i \
POST "http://$APP_HOST_ADDRESS:$APP_PORT/sign-up" \
-H "Content-Type: application/json" \
-d '{"uname":"'"$TEST_UNAME"'","pwd":"'"$TEST_PWD"'"}'
*/
app.post('/sign-up', handlers.signUp);
/*
curl -i \
POST "http://${APP_HOST_ADDRESS}:${APP_PORT}/sign-in" \
-H "Content-Type: application/json" \
-d '{"uname":"'"${TEST_UNAME}"'","pwd":"'"${TEST_PWD}"'"}'
*/
app.post('/sign-in', handlers.signIn, handlers.addTokens);
/*
curl -i \
-X POST http://${APP_HOST_ADDRESS}:${APP_PORT}/refresh \
--cookie "rt=${TEST_RT}"
*/
app.post('/refresh-tokens', handlers.refreshTokens, handlers.addTokens);
/*
curl -i \
-X POST http://${APP_HOST_ADDRESS}:${APP_PORT}/sign-out \
--cookie "rt=${TEST_RT}"
*/
app.post('/sign-out', handlers.signOut);
/*
curl \
-X POST http://${APP_HOST_ADDRESS}:${APP_PORT}/verify-tokens \
--cookie "rt=${TEST_RT}"
*/
app.post('/verify-tokens', handlers.verifyTokens);
app.listen(CONSTS.APP_PORT);
console.log(`Express app is up and running (port ${CONSTS.APP_PORT}).`);

// Establish connection to MongoDB instance
const uri = `mongodb://${CONSTS.MONGO_HOST_ADDRESS}:${CONSTS.MONGO_PORT}/${CONSTS.MONGO_APP_DB}`
const opts = { serverSelectionTimeoutMS: CONSTS.MONGO_CONNECTION_TIMEOUT }
mongoose
    .connect(uri, opts)
    .then(() => {
        console.log(`Connection to MongoDB established (${uri}).`);
    })
    .catch((err) => {
        console.error(`Connection to MongoDB failed (${uri}).`);
        throw err;
    });