const CONSTS = require('./consts.js');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');


const User = mongoose.model(
    'User',
    new mongoose.Schema({
        uname: { type: String, required: true, unique: true },
        pwd: { type: String, required: true }
    })
);

const catchErrors = (fn) => (async (...args) => {
    try {
        await fn(...args);
    }
    catch (err) {
        console.error(err); // TODO More verbose?
        return args?.res.sendStatus(500);
    }
});

exports.addTokens = catchErrors((req, res) => {
    const { jwtPayload } = req;
    res.cookie(
        'at',
        jwt.sign(jwtPayload, CONSTS.AT_SECRET, { expiresIn: `${CONSTS.AT_TTL}s` }),
        {
            httpOnly: false,
            secure: true,
            sameSite: 'Strict',
            maxAge: Number(CONSTS.AT_TTL) * 1000 // Cookie self-destruction timer (browser directive)
        }
    );
    res.cookie(
        'rt',
        jwt.sign(jwtPayload, CONSTS.RT_SECRET, { expiresIn: `${CONSTS.RT_TTL}s` }),
        {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: Number(CONSTS.RT_TTL) * 1000
        }
    );
    return res.sendStatus(200);
});

exports.signUp = catchErrors(async (req, res) => {
    const { uname, pwd } = req.body;
    let user = await User.findOne({ uname });
    if (user) {
        return res.status(409).send({ msg: 'User already exists.' });
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
        return res.status(400).send({ msg: 'Password does not meet requirements.' });
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pwd, salt);
    user = new User({ uname: uname, pwd: hash });
    await user.save();
    return res.status(201).send({ msg: 'User creation succeeded.' });
});

exports.signIn = catchErrors(async (req, res, next) => {
    const { uname, pwd } = req.body;
    if (!(uname && pwd)) {
        return res.status(400).send({ msg :'Missing credentials.' });
    }
    const user = await User.findOne({ uname });
    if (!user) {
        return res.status(401).send({ msg :'Invalid credentials.' });
    }
    const pwdMatch = bcrypt.compareSync(pwd, user.pwd);
    if (!pwdMatch) {
        console.debug('***no pwdMatch***')
        return res.status(401).send({ msg: 'Invalid credentials.' });
    }
    req.jwtPayload = { uname: user.uname, id: user.id };
    next();
});

exports.refreshTokens = catchErrors(async (req, res, next) => {
    // If authenticated, get a new pair of access & refresh tokens (token rotation).
    const { rt } = req.cookies;
    if (!rt) {
        return res.status(400).send({ msg: 'Missing refresh token.' });
    }
    try {
        var { uname, id } = jwt.verify(rt, CONSTS.RT_SECRET);
    }
    catch (err) {
        return res.status(401).send({ msg: 'Token is invalid or expired.' })
    }
    req.jwtPayload = { uname, id };
    next();
});

exports.signOut = catchErrors(async (req, res) => {
    const { rt } = req.cookies;
    if (!rt) {
        return res.status(400).send({ msg: 'Missing refresh token, user is not signed in.' });
    }
    res.clearCookie('rt', { httpOnly: true, secure: true });
    return res.send({ msg: 'Sign out succeeded.' });
});

exports.verifyTokens = catchErrors((req, res) => {
    const { at, rt } = req.cookies;
    if (!(at && rt)) {
        return res.status(400).send({ msg: 'Missing refresh and/or access tokens.' });
    }
    var valid = {
        at: true,
        rt: true
    };
    try {
        jwt.verify(at, CONSTS.AT_SECRET);
    }
    catch (err) {
        console.error(err);
        valid.at = false;
    }
    try {
        jwt.verify(rt, CONSTS.RT_SECRET);
    }
    catch (err) {
        console.error(err);
        valid.rt = false;
    }
    return res.send(valid)
});