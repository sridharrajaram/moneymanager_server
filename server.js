const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();

const cors = require("cors");

const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 5000;
const DBURL = process.env.MONGO_URL;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function authenticate(req, res, next) {
  try {
    //console.log(req.headers.authorization);
    //check if token is present
    // if present, check whether it is valid token
    if (req.headers.authorization) {
      jwt.verify(
        req.headers.authorization,
        process.env.JWT_SECRET,
        function (err, decoded) {
          if (err) {
            res.status(401).json({
              message: "UnAuthorized",
            });
          } else {
            //console.log(decoded);
            req.userid = decoded.id;
            next();
          }
        }
      );
    } else {
      res.status(404).json({
        message: "No Token Present",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Issue",
    });
  }
}

app.post("/register", async function (req, res) {
  //console.log(req.body);
  try {
    //connect the database
    let client = await mongoClient.connect(DBURL); //since it is returning the promise, we are puting in try catch async

    //select the db
    let db = client.db("moneymanager");

    //select the collection and perform the action
    delete req.body.confirmpassword;

    //Hashing the password before storing in database
    var salt = bcrypt.genSaltSync(10); //tearing in pieces
    var hash = bcrypt.hashSync(req.body.password, salt); //mixing with secret key
    req.body.password = hash; // newgenerated to password

    let data = await db.collection("users").insertOne(req.body); //since it is returning the promise we put await

    //close the database
    await client.close();

    res.json({
      message: "User registered sucessfully",
      id: data._id,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "something went wrong",
    });
  }
});

app.post("/login", async function (req, res) {
  try {
    //connect the database
    let client = await mongoClient.connect(DBURL); //since it is returning the promise, we are puting in try catch async

    //select the db
    let db = client.db("moneymanager");

    //find the user with his email address
    let user = await db
      .collection("users")
      .findOne({ emailAddress: req.body.emailAddress });

    if (user) {
      //Hash the incoming password
      //compare the password with user's password
      let matchPwd = bcrypt.compareSync(req.body.password, user.password);
      if (matchPwd) {
        // Generate JWT token and shared to react APP
        let token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        //console.log(token);
        res.json({
          message: true,
          token,
        });
      } else {
        res.status(400).json({
          message: "email address / password does not match",
        });
      }
    } else {
      res.status(400).json({
        message: "email address / password does not match",
      });
    }

    //close the database
    await client.close();
  } catch (error) {
    res.status(500).json({
      message: "something went wrong",
    });
  }
});

app.get("/expense",[authenticate], async function (req, res) {
    // mongodb Database concept introduced
    try {
      //connect the database
      let client = await mongoClient.connect(DBURL); //since it is returning the promise, we are puting in try catch async
  
      //select the db
      let db = client.db("moneymanager");
  
      //select the collection and perform the action
      let data = await db.collection("expenses").find({userid:req.userid}).toArray(); //since it is returning the promise we put await, what see is cursor pointer, so toArray
  
      //close the database
      await client.close();
  
      res.json(data); //reply with data
    } catch (error) {
      res.status(500).json({
        message: "something went wrong",
      });
    }
  });
  
  app.post("/expense/addExpense",[authenticate], async function (req, res) {
    // mongodb Database concept introduced
    try {
      //connect the database
      let client = await mongoClient.connect(DBURL); //since it is returning the promise, we are puting in try catch async
  
      //select the db
      let db = client.db("moneymanager");
  
      //select the collection and perform the action
      req.body.userid = req.userid;
      let data = await db.collection("expenses").insertOne(req.body); //since it is returning the promise we put await
  
      //close the database
      await client.close();
  
      res.json({
        message: "Expense added sucessfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "something went wrong",
      });
    }
  });

app.listen(PORT, () => {
  console.log(`app is running on port ${PORT}`);
});
