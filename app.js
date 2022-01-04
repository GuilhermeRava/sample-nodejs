var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");

var indexRouter = require("./routes/index");
// var usersRouter = require('./routes/users');

var app = express();

app.use(cors());

console.log("process.env :", JSON.stringify(process.env));

const useLocalDb = process.env.USE_LOCAL_DB;

const Pool = require("pg").Pool;
const pool = new Pool({
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOSTNAME,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: Boolean(useLocalDb) && false,
  },
});

let createDB = true;

if (createDB) {
  createDB = false;

  pool.query(
    `CREATE TABLE users (
      ID SERIAL PRIMARY KEY,
      name VARCHAR(30),
      email VARCHAR(30)
    );`,
    (error, res) => {
      if (error) {
        console.log("error in creating table users", error);
        return;
      }
      console.log("created table users");
    }
  );
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// TUTORIAL: https://blog.logrocket.com/nodejs-expressjs-postgresql-crud-rest-api-example/
// ADDING DB TO DIGITAL OCEAN TUTORIAL: https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/
// app.use('/', indexRouter);

const getUsers = (request, response) => {
  pool.query("SELECT * FROM users ORDER BY id ASC", (error, results) => {
    if (error) {
      response.status(500).json(error);
      console.log("error in getUsers", error);
      return;
    }
    response.status(200).json(results.rows);
  });
};
app.get("/users", getUsers);

const createUser = (request, response) => {
  const { name, email } = request.body;
  console.log(
    "create user request from ",
    request.socket.remoteAddress,
    " name: ",
    name,
    " email: ",
    email
  );

  pool.query(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
    [name, email],
    (error, result) => {
      if (error) {
        response.status(500).json(error);
        console.log("error in createUser", error);
        return;
      }
      response
        .status(201)
        .send(
          `User added with ID: ${
            result.insertId ||
            (result &&
              result.rows &&
              result.rows.length > 0 &&
              (result.rows[0].id || result.rows[0].ID))
          }`
        );
    }
  );
};
app.post("/users", createUser);

app.delete("/users", (req, res) => {
  pool.query("TRUNCATE users;", (error, result) => {
    if (error) {
      res.status(500).json(error);
      console.log("error in truncating users table", error);
      return;
    }
    res.status(201).send("truncated users table");
  });
});
// app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
