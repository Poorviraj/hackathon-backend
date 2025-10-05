const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
dotenv.config();

exports.auth = async(req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({ 
            msg: "No token, authorization denied" 
        })
    };

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({
            success: false,
            msg: "Invalid token"
        });
    }

}

exports.isAgent = (req,res,next) => {
    try{

        if(req.user.role !== "agent"){
            return res.status(400).json({
                success: false,
                message: 'This is the protected route for Agent only'
            })
        }
        next();
    } catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Agent role cannot be verified, please try again later'
        })
    }
}


exports.isAdmin = (req,res,next) => {
    try{

        if(req.user.role !== "admin"){
            return res.status(400).json({
                success: false,
                message: 'This is the protected route for admin only'
            })
        }
        next();
    } catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'admin role cannot be verified, please try again later'
        })
    }
}
