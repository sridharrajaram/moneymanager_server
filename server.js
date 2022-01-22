const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const cors = require('cors');

const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 5000;
const DBURL = process.env.MONGO_URL;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get("/expense", async function (req, res) {

    // mongodb Database concept introduced
    try {
        //connect the database
        let client = await mongoClient.connect(DBURL) //since it is returning the promise, we are puting in try catch async

        //select the db
        let db = client.db("moneymanager")

        //select the collection and perform the action
        let data = await db.collection("expenses").find().toArray() //since it is returning the promise we put await, what see is cursor pointer, so toArray

        //close the database
        await client.close();

        res.json(data) //reply with data

    } catch (error) {
        res.status(500).json({
            message: "something went wrong"
        })
    }

})

app.post("/expense/addExpense", async function (req, res) {

    // mongodb Database concept introduced
    try {
        //connect the database
        let client = await mongoClient.connect(DBURL) //since it is returning the promise, we are puting in try catch async

        //select the db
        let db = client.db("moneymanager")

        //select the collection and perform the action
        //req.body.userid = req.userid;
        let data = await db.collection("expenses").insertOne(req.body) //since it is returning the promise we put await

        //close the database
        await client.close();

        res.json({
            message: "Expense added sucessfully"
        })
    } catch (error) {
        res.status(500).json({
            message: "something went wrong"
        })
    }

})

app.listen(PORT,()=>{
    console.log(`app is running on port ${PORT}`);
});