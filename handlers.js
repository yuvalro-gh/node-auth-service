const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');


dotenv.config();

const User = mongoose.model(
    'User',
    new mongoose.Schema({
        uname: { type: String, required: true, unique: true },
        pwd: { type: String, required: true }
    })
);

const gen_and_attach_tokens = (res, payload) => {
    const at = jwt.sign(
        payload,
        process.env.AT_SECRET,
        { expiresIn: `${process.env.AT_TTL}s` }
    );
    const rt = jwt.sign(
        payload,
        process.env.RT_SECRET,
        { expiresIn: `${process.env.RT_TTL}s` }
    );
    // Send refresh token in response cookie for added security;
    // Access token in response body.
    res.cookie('rt', rt, {
            httpOnly: true,
            secure: false,
            sameSite: 'Strict',
            maxAge: Number(process.env.RT_TTL) * 1000,
        }
    );
    res.json({ at });
}

const handle_internal_errors = (fn) => (async (req, res, next) => {
    try {
        await fn(req, res ,next);
    }
    catch (err) {
        console.error(err); // TODO More verbose?
        return res.status(500).send('Internal server error.\n')
    }
})

/*
curl -i \
POST "http://$APP_HOST_ADDRESS:$APP_PORT/sign-up" \
-H "Content-Type: application/json" \
-d '{"uname":"'"$TEST_UNAME"'","pwd":"'"$TEST_PWD"'"}'
*/
exports.sign_up = handle_internal_errors(async (req, res) => {
    const { uname, pwd } = req.body;
    let user = await User.findOne({ uname });
    if (user) {
        return res.status(409).send('User already exists.\n');
    }
    // Password validation, optional.
    if (![
            // Must not include the user name    
            !pwd.toLowerCase().includes(uname.toLowerCase()),
            // Must be at least 8 characters long
            pwd.length >= 8, 
            // Must be at most 32 charaters long
            pwd.length <= 32,
            // Must use only these characters
            /^[a-zA-Z0-9!@#$%^&*()_+=-]*$/.test(pwd),
            // Must contain at least 1 character from each group
            /[A-Z]/.test(pwd),
            /[a-z]/.test(pwd),
            /[0-9]/.test(pwd),
            /[!@#$%^&*()_+=-]/.test(pwd),
        ].every(i => i === true)) {
        return res.status(400).send('Password does not meet requirements.\n');
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pwd, salt);
    user = new User({ uname: uname, pwd: hash });
    await user.save();
    return res.status(201).send('User created successfully.\n');
});

/*
curl -i \
POST "http://${APP_HOST_ADDRESS}:${APP_PORT}/sign-in" \
-H "Content-Type: application/json" \
-d '{"uname":"'"${TEST_UNAME}"'","pwd":"'"${TEST_PWD}"'"}'
*/
exports.sign_in = handle_internal_errors(async (req, res) => {
    const { uname, pwd } = req.body;
    const user = await User.findOne({ uname });
    if (!user) {
        return res.status(401).send('Invalid credentials.\n');
    }
    const pwd_match = bcrypt.compareSync(pwd, user.pwd);
    if (!pwd_match) {
        return res.status(401).send('Invalid credentials.\n');
    }
    gen_and_attach_tokens(res, { name: user.uname, id: user.id });
});

/*
curl -i \
-X POST http://${APP_HOST_ADDRESS}:${APP_PORT}/refresh \
--cookie "rt=${TEST_RT}"
*/
exports.refresh = handle_internal_errors(async (req, res) => {
    // If authenticated, get a new pair of access & refresh tokens (token rotation).
    const rt = req?.cookies?.rt;
    if (!rt) {
        return res.status(400).send('Missing refresh token.\n')
    }
    try {
        var { name, id } = jwt.verify(rt, process.env.RT_SECRET);
    }
    catch (err) {
        console.error(err);
        return res.status(401).send("Attached refresh token is invalid or expired.\n")
    }
    gen_and_attach_tokens(res, { name, id });
});

/*
curl -i \
-X POST http://${APP_HOST_ADDRESS}:${APP_PORT}/sign-out \
--cookie "rt=${TEST_RT}"
*/
exports.sign_out = handle_internal_errors(async (req, res) => {
    res.clearCookie('rt', { httpOnly: true, secure: true });
    return res.status(200).send('Sign out succeeded.');
});

/*
curl \
-X POST http://${APP_HOST_ADDRESS}:${APP_PORT}/verify \
--cookie "rt=${TEST_RT}"
*/
exports.verify = handle_internal_errors(async (req, res) => {
    const rt = req?.cookies?.rt;
    if (!rt) {
        return res.status(400).send('Missing refresh token.\n');
    }
    try {
        jwt.verify(rt, process.env.RT_SECRET);
        return res.send("Token is valid.\n");
    }
    catch (err) {
        console.error(err);
        return res.send("Token is invalid.\n");
    }
});