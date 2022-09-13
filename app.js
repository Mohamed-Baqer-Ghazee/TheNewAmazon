const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("express-session");
require('dotenv').config();
const bcrypt = require("bcrypt");
const methodOverride = require('method-override')
const initializePassport = require('./passport-config')
initializePassport(passport);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const mynumber = process.env.TWILIO_PHONE_NUMBER;
const client = require('twilio')(accountSid, authToken);
const saltRounds = 10;

const app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));
app.use(session({
    secret: process.env.Secret,
    resave: false,
    saveUninitialized: false,
}))
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'))

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "newamazone"
  });
  
let otp;
let number;
let name;
let upassword;

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html")
    // console.log("db created");
});

app.get("/getdata", (req, res) => {

    db.query(
        'SELECT * FROM products WHERE 1',
        function (err, results, fields) {
            // console.log(results);
            res.send(results);
        }
    );

});

app.post("/search",(req,res)=>{
    let item=req.body.item_name;
    console.log(item);
    console.log(item);
    console.log(item);
    res.redirect("/search/"+item);
})

app.get("/search/:item",(req,res)=>{
    res.sendFile(__dirname+"/views/searchResults.html")
})

app.get("/search/:item/get",(req,res)=>{
    // console.log(req.params);
    let item = req.params.item;
    // console.log(item);
    db.query(
        "SELECT * FROM products WHERE product_name LIKE'%"+item+"%' OR product_discription LIKE '%"+item+"%'",
        function (err, results, fields) {
            if(err)throw err;
            if(results!=null)res.send(results);
            else res.send(null);
        }
    );
})

app.get("/register", (req, res) => {
    res.sendFile(__dirname + "/views/register.html")
    // console.log("db created");
});
app.post("/register", async(req, res) => {
    let data = req.body;
    sendOTP(data);

});

app.post("/register/verifynumber", async (req, res) => {
    let data = req.body;
    // console.log(req.body);
    if (data.otp_code == otp) {
        // console.log("hahsing");
        res.redirect("/login");
        storeUser();
        
    } else {
        res.redirect("/register/verifynumber");
    }

});

app.get("/login",checkNotAuthenticated, (req, res) => {
    res.sendFile(__dirname+"/views/login.html")
});
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));


app.post('/logout', function(req, res, next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

// app.post("/login", async (req, res) => {
//     console.log(req.body);
//     passport.authenticate('local', {
//         successRedirect: '/',
//         failureRedirect: '/login'
//     });
//     let number = "+964" + req.body.phone_number.substring(1);
//     let password = req.body.password;
//     userLogIn(number,password);
    
// });

app.get("/product/:product_id",(req,res)=>{
    res.sendFile(__dirname+"/views/product.html");
});

app.get("/product/:product_id/getdata",(req,res)=>{
    
    db.query(
        "SELECT * FROM products WHERE product_id ='"+req.params.product_id+"'",
        function (err, results, fields) {
            console.log(results);
            res.send(results);
        }
    );
})

app.get("/addproduct",checkAuthenticated, (req, res) => {
    let id = req.session.passport.user;
    let sql ="SELECT is_seller FROM users WHERE user_id='"+id+"'";
    db.query(sql,(err,result)=>{
        if(err)throw err
        // console.log(result[0].is_seller);
        if(result[0].is_seller===1)
        {
            res.sendFile(__dirname + "/views/newProduct.html")
        }else {console.log("sorry u r not allowd");}
    })

});

app.post("/addproduct",checkAuthenticated, (req, res) => {
    let data = req.body;
    let id = req.session.passport.user;
    let sql ="SELECT sotre_name FROM users WHERE user_id='"+id+"'";
    db.query(sql,(err,result)=>{
        if(err)throw err
        console.log(result[0]);
        res.redirect("/");
        addProduct(data,id,result[0]);
    })
});


app.listen(3000, () => {
    console.log("server started on 3000");
});

async function sendOTP(data){
    otp = Math.floor(Math.random() * 999999);
    number = data.phone_number;
    name = data.full_name;
    upassword = data.password;
    number = "+964" + number.substring(1);
    await client.messages
        .create({
            body: 'Your code is: ' + otp,
            from: mynumber,
            to: number
        })
        .then(message => console.log(message.sid));
}

async function storeUser(){
    await bcrypt.hash(upassword, saltRounds, function (err, hash) {
        // Store hash in your password DB.
        let post = {
            user_name: name,
            phone_number: number,
            user_hash: hash
        };
        // console.log(hash);
        let sql = "INSERT INTO users SET ?";
        db.query(sql, post, (err, dbresult) => {
            if (err) throw err;
            // console.log(dbresult);
        });
    })
}

async function addProduct(data,store_id,store_name){
    let post = {
        store_id:store_id,
        store_name:store_name,
        product_name: data.product_name,
        imgUrl: data.image_url,
        category_id: data.category,
        product_discription: data.discription,
        product_price: data.price
    };
    let sql = "INSERT INTO products SET ?";
    let query = db.query(sql, post, (err, result) => {
        if (err) throw err;
        // console.log(result);
    });
}

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
  
    res.redirect('/login')
  }
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
  }
  
  function getStoreName(id){
    let store_name;
    db.query("SELECT store_name FROM stores WHERE store_id ='"+id+"'",(err,result)=>{
        if (err) throw err;
        return result;
    })
  }
// async function userLogIn(number, password){
//     let sql = "SELECT user_hash FROM users WHERE phone_number = '" + number + "'";
//     let query = await db.query(sql, (dberr, dbresult) => {
//         if (dberr) throw dberr;

//         // console.log(dbresult);
//         bcrypt.compare(password, dbresult[0].user_hash, function (err, result) {
//             // result == true
//             return result;
//         });
//     });
// }
