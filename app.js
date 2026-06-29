var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const sequelize = require("./config/database");
const User = require("./models/User");
const Doctor = require("./models/Doctor");
const Patient = require("./models/Patient");
const Appointment = require("./models/Appointment");
const Payment = require("./models/Payment");
// const Prescription = require("./models/Prescription");
require("./models");



var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var adminRouter = require('./routes/admin/adminRoute');
 const cors = require("cors");

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRouter);// catch 404 and forward to error handler

app.use(function(req, res, next) {
  next(createError(404));
});
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Database Connected Successfully");
  })
  .catch((error) => {
    console.error("❌ Database Connection Failed:", error);
  });
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("✅ Tables Synced");
  })
  .catch(console.error);
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
