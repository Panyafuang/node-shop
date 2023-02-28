const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const errorController = require('./controllers/error');
const User = require('./models/user');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.styglyy.mongodb.net/${process.env.MONGO_DEFAULT_DB}`;

const app = express();

/** ใช้ session คุ่กับ mongoDB */
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf(); // ป้องกันการโจมตีแบบสร้างเว็บปลอมขึ้นมาเพื่อหลอก user ให้กรอกข้อมูลใน form, ตัวนี่จะช่วยป้องกันโดยการแนบ token เฉพาะมากับ form ทุกคร้ังที่ติดต่อ back-end

// const privateKey = fs.readFileSync('server.key'); // Block code below until read file success
// const certificate = fs.readFileSync('server.cert');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' } // Not overwrite existing file but continuously add them to the file
);

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(helmet()); // Protect requer headers
app.use(compression()); // compress file size to front-end but not image type
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  /** ถ้าเป็น regular function (ฟังชั่นทั่วไป) สามารถส่ง error ไปที่ express middleware ผ่าน throw error ได้ */
  // throw new Error('Sync Dummy');
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      /** ในพวก synchronous function เช่น promise, callback ถ้าจะส่ง error ไปที่ middleware express ต้องส่งผ่าน next() ใช้ throw ไม่ได้  */
      next(new Error(err));
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  // console.log("🚀 ~ file: app.js:103 ~ app.use ~ error", error)
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    // https
    //   .createServer({ key: privateKey, cert: certificate }, app)
    //   .listen(PORT)

    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
