const User = require("./user.model");

const getMe = async (req, res) => {

    try {

        const user = await User.findById(req.user.userId)
            .select("-passwordHash");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    getMe
};