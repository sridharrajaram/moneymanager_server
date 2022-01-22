const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const cors = require('cors');

const mongoose = require('mongoose');
const PORT = process.env.PORT || 5000;
const URI = process.env.MONGO_URL;



const expenseRouter = require('./router/expense');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

mongoose.connect(URI, {
    useNewUrlParser: true
});

const connection = mongoose.connection;
connection.once('open', ()=> {
    console.log('db connected successfully');
});

app.use('/expense',expenseRouter);

app.listen(PORT,()=>{
    console.log(`app is running on port ${PORT}`);
});