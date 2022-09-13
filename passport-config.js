const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt');
const { reject } = require('lodash');
const mysql = require("mysql2");


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "newamazone"
});

async function getUserByEmail(email){
    console.log("getemail");
    let sql="SELECT * FROM users WHERE email='"+email+"'";
    const res = db.promise().query(sql,(err,result)=>{
    if(err) throw err;
    console.log(result);
    return result[0];
    })
}


function getUserById(id){
  console.log("getid");
  let sql="SELECT * FROM users WHERE id='"+id+"'";
  db.query(sql,(err,result)=>{
    if(err) throw err;
    // console.log(result);
    return result[0];
  })
}

async function initialize(passport) {
  const authenticateUser = async (phone_number, password, done) => {
    var user;
    // const user = await getUserByEmail(email);
    phone_number="+964"+phone_number.substring(1);
    let sql="SELECT * FROM users WHERE phone_number='"+phone_number+"'";
    console.log(sql);
    db.promise().query(sql)
      .then(([rows,fields])=>{
        console.log(rows[0]);
        user=rows[0];
        if (user == null) {
          // console.log(user);
          return done(null, false, { message: 'No user with that phone_number' })
        }
        try {
          console.log("password: ");
          console.log(password);
          console.log("user.password: ");
          console.log(user);
          bcrypt.compare(password,user.user_hash)
          .then(match=>{
            if (match){
              console.log("password correct");
            return done(null, user)
            }else {
              console.log("password not correct");
              return done(null, false, { message: 'Password incorrect' })
            }
          })
          .catch(err=>console.log(err))
        } catch (e) {
          return done(e)
        }
      })
      .catch(console.log);
    }
  passport.use(new LocalStrategy({ usernameField: 'phone_number' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.user_id))
  passport.deserializeUser((id, done) => {
    return done(null, user=>{
      let sql="SELECT * FROM users WHERE user_id='"+id+"'";
  db.promise().query(sql,(err,result)=>{
    if(err) throw err;
    // console.log(result);
    return result[0];
  })
    })
  })
}

module.exports = initialize