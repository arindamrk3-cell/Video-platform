const bcrypt = require("bcryptjs");
const User = require("../users/user.model");

const {
    generateAccessToken,
    generateRefreshToken
} = require("../../utils/token");

const registerUser = async ({ username, email, password }) => {

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new Error("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
        username,
        email,
        passwordHash
    });

    return {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
    };
};


const loginUser = async ({ email, password }) => {

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!isPasswordCorrect) {
        throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
        throw new Error("Account is inactive");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    };
};


module.exports = {
    registerUser,
    loginUser
};