const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const dotenv = require('dotenv');
dotenv.config();


exports.Signup = async (req, res) => {
    try {

        const {name, email, password, role} = req.body;
        if(!name && !email && !password && !role){
            return res.status(500).json({
                success: false,
                message: "all fields are required"
            });
        }
        let findUser = await User.findOne({email: email});

        if(findUser){
            return res.status(500).json({
                success: false,
                message: "User already exist"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        if(!user){
            return res.status(500).json({
                success: false,
                message: "Unable to create user"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User created successfully",
            user
        })

    } catch(error){
        return res.status(400).json({
            success: false,
            error: error.message,
            message: "Server error at Signup"
        })
    }
} 



exports.Login = async (req, res) => {
    try {
        const { email, password} = req.body;

        // Validation: Check if both email and password were provided
        // Use a 400 status code for bad requests (missing input)
        if(!email || !password ){
            return res.status(400).json({ // Changed status to 400
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user by email
        let user = await User.findOne({email: email});

        if(!user){
            return res.status(401).json({ // Changed status to 401 Unauthorized
                success: false,
                message: "Invalid credentials: User did not exist"
            });
        }

        // Check password match
        const checkPassword = await bcrypt.compare(password, user.password);
        if(!checkPassword) {
            return res.status(401).json({ // Changed status to 401 Unauthorized
                success: false,
                message: "Invalid credentials: Password did not match"
            });
        }

        // 1. Prepare the payload for the JWT
        const payload = {
            user: {
                id: user._id,
                role: user.role
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, 
            {
                expiresIn: "1d"
            }
        );

        // 2. ADD THE USER OBJECT TO THE RESPONSE BODY
        // This is what the frontend needs for AuthContext and redirection!
        return res.status(200).json({
            success: true,
            message: "User Logged in successfully",
            token,
            user: { // <-- ADDED THIS BLOCK
                id: user._id,
                role: user.role
            }
        })

    } catch(error){
        // Use 500 status code for internal server errors
        return res.status(500).json({ // Changed status to 500
            success: false,
            error: error.message,
            message: "Server error at Login"
        })
    }
}
