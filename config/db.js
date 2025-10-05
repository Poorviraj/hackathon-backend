

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const db  = async()=> {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('mongoDB is connected successfully');
    } catch(e){
        console.log('error ocurred while connection with mongoDB', e);
        process.exit(1);
    }
}

module.exports = db;