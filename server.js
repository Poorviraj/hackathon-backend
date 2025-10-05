const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const authRoute = require('./routes/auth');
const ticketRoute = require('./routes/ticket');
require("./cron/checkSlaDirect");

dotenv.config();
db();

const app = express();
const PORT = process.env.PORT || 4000;


app.use(helmet());


app.use(cors({
    origin: 'http://localhost:5173', // your frontend URL
    credentials: true
}));


app.use(express.json());


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per IP
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);


app.use("/api/v1/auth", authRoute);
app.use("/api/v1/tickets", ticketRoute);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
