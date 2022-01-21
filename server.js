const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const cors = require('cors');
const {MongoClient} = require("mongodb");
const mongoose = require('mongoose');
const PORT = process.env.PORT || 5000;
const URI = process.env.MONGO_URL;

const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

//creating mongodb connection
async function createConnection() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    return client;
  }

//check email registered or not
app.post("/data", async (request, response) => {
    const { email } = request.body;
    const client = await createConnection();
    const user = await client.db("moneymanager").collection("passwords").find({ email: email }).toArray();
    if (user.length > 0) {
      response.send({ message: "This email is not available. Try another" });
    } else {
      response.send({ message: "This email is available" });
    }
  })

//main page
app.get("/", async (request, response) => {
    response.send("Welcome to Money Manager APIs... Thanks-->Sridhar here");
  })
  
  //sending email for forgot password
  app.post("/users/forgot", async (request, response) => {
    const { email } = request.body;
    const currentTime = new Date();
    const expireTime = new Date(currentTime.getTime() + 5 * 60000);
    const client = await createConnection();
    const user = await client.db("moneymanager").collection("passwords").find({ email: email }).toArray();
    if (user.length > 0) {
      const token = jwt.sign({ email: email }, process.env.MY_SECRET_KEY);
      await client.db("moneymanager").collection("passwords").updateOne({ email: email },
        {
          $set:
            { token: token, expireTime: expireTime }
        });
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
          clientId: process.env.OAUTH_CLIENTID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN
        }
      });
      let mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: 'Requested Password Reset Link from "Money Manager Application',
        html:
        '<a href = "https://sridharrajaram-moneymanager-client.netlify.app/retrieveAccount/' + email + '/' + token + '"> Reset Password Link</a>'
      };
      transporter.sendMail(mailOptions, async function (err, data) {
        if (err) {
          response.send("Error " + err);
        } else {
          response.send({ message: "Email sent successfully" });
        }
      });
    }
    else {
      response.send({ message: "This email is not registered" });
    }
  })
  
  //retrieve Account
  app.get("/retrieveAccount/:email/:token", async (request, response) => {
    const currentTime = new Date();
    const { email, token } = request.params;
    const client = await createConnection();
    const user = await client.db("moneymanager").collection("passwords").find({ email: email }).toArray();
    if (user.length > 0) {
      const tokenInDB = user[0].token;
      if (token == tokenInDB) {
        if (currentTime > user[0].expireTime) {
          response.send({ message: "link expired" })
        } else {
          response.send({ message: "retrieve account" });
        }
  
      } else {
        response.send({ message: "invalid authentication" });
      }
    }
    else {
      response.send({ message: "Invalid account" });
    }
  })
  
  //reset password
  app.put("/resetPassword/:email/:token", async (request, response) => {
    const currentTime = new Date();
    const { email, token } = request.params;
    const { newPassword } = request.body;
    const client = await createConnection();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const user = await client.db("moneymanager").collection("passwords").find({ email: email, token: token }).toArray();
    if (!user[0]) {
      response.send({ message: "invalid url" });
    } else {
      const expireTime = user[0].expireTime;
      if (currentTime > expireTime) {
        response.send({ message: "link expired" });
      } else {
        const result = await client.db("moneymanager").collection("passwords").updateOne({
          email: email,
          token: token
        },
          {
            $set: {
              password: hashedPassword
            },
            $unset: {
              token: "",
              expireTime: ""
            }
          });
        response.send({ message: "password updated" });
      }
    }
  })
  
  //user signup api
  app.post("/users/SignUp", async (request, response) => {
    const { email, password, firstName, lastName } = request.body;
    const token = jwt.sign({ email: email }, process.env.MY_SECRET_KEY);
    const url = `https://sridharrajaram-moneymanager-client.netlify.app/activateAccount/${email}/${token}`;
    const client = await createConnection();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await client.db("moneymanager").collection("inactive").insertOne({
      email: email, password: hashedPassword, firstName: firstName, lastName: lastName, token: token
    });
  
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
      }
    });
  
    let mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Account activation link generated from "Money Manager Web Application"',
      html:
        `<a href =  "${url}">Click this link to activate the account </a>`
    };
  
    transporter.sendMail(mailOptions, async function (err, data) {
      if (err) {
        response.send("Error " + err);
      } else {
        response.send({ message: 'Activation link is sent to the mail. Please click the link to complete the registration' });
      }
    });
  
  })
  
  //activate account
  app.put("/activateAccount/:email/:token", async (request, response) => {
      const { email, token } = request.params;
      const client = await createConnection();
      const user = await client.db("moneymanager").collection("inactive").find({ email: email, token: token }).toArray();
      if (user.length > 0) {
        await client.db("moneymanager").collection("passwords").insertOne({
          email: user[0].email, password: user[0].password, firstName: user[0].firstName, lastName: user[0].lastName
        });
        await client.db("moneymanager").collection("inactive").deleteMany({ email: email, token: token })
        response.send({ message: 'activate account' });
      } else {
        response.send({ message: 'invalid url' });
      }
    
  })
  
  //user login api
  app.post("/users/Login", async (request, response) => {
    const { email, password } = request.body;
    const token = jwt.sign({ email: email }, process.env.MY_SECRET_KEY);
    const client = await createConnection();
    const user = await client.db("moneymanager").collection("passwords").find({ email: email }).toArray();
    if (user.length > 0) {
      const passwordstoredindb = user[0].password;
      const loginFormPassword = password;
      const ispasswordmatch = await bcrypt.compare(loginFormPassword, passwordstoredindb);
      if (ispasswordmatch) {
        response.send({ message: "successful login!!!", token:token });
      } else {
        response.send({ message: "invalid login" });
      }
    } else {
      response.send({ message: "invalid login" });
    }
  })

app.listen(PORT,()=>{
    console.log(`app is running on port ${PORT}`);
});