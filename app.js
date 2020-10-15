// Environment variables require
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

// Require Express
const express = require('express')
    // Init express
const app = express()
    // Require Handlebars
const exphbs = require('express-handlebars')
const fs = require('fs')
const users = require('./Users')
const posts = require('./Posts')
const path = require('path')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const methodOverride = require('method-override')

// Mongo DB
const mongoose = require('mongoose')
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to Mongoose'))


// Init of Login Passport
const intiliazePassport = require('./passport-config')
intiliazePassport(
    passport,
    username => users.find(user => user.username === username),
    id => users.find(user => user.id === id)
)


// Middleware for Handlebars templates
app.engine('handlebars', exphbs({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars')
    // Body Parser Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
    // Setting a Static Folder for accessing all the static files like css/js/images
app.use(express.static(__dirname + '/public'));

app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


// --------------- ROUTES ----------------- //

// HomePage Route
app.get('/', (req, res) => res.render('home'))

// Login success
app.get('/signupdone', checkAuthenticated, (req, res) => {
    res.render('signupdone', {
        userid: req.user.id
    })
})

// Dashboard of User
app.get('/dashboard', checkAuthenticated, (req, res) => {
    const found = users.some(user => user.id === req.user.id);

    if (found) {
        users.forEach(user => {
            if (user.id === req.user.id) {
                usersusername = req.user.username;
                userthreads = req.user.threads;
            }
        });
        const upvoteArray = [];
        posts.forEach(post => {
            upvoteArray.push(post.upvotes);
        });
        upvoteArray.sort((a, b) => b - a);

        const hotposts = [];
        upvoteArray.forEach(upvote => {
            posts.forEach(post => {
                if (upvote === post.upvotes) {
                    hotposts.push(post.title);
                }
            })
        });

        res.render('dashboard', {
            usersusername,
            userthreads,
            hotposts,
        });
    } else {
        res.status(404).render('404');
    }
});

//Routes For Unlogged pages
app.use('/', require('./routes/index'));

//Routes for user pages
//app.use('/dashboard', checkAuthenticated, require('./routes/users'));

// Route For Login
app.get('/login', checkNotAuthenticated, (req, res) => res.render('login'))

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/signupdone',
    failureRedirect: '/login',
    failureFlash: true
}))

// Route for Sign up
app.get('/sign-up', checkNotAuthenticated, (req, res) => res.render('signup'))

app.post('/sign-up', checkNotAuthenticated, async(req, res) => {
    try {
        const hashedPass = await bcrypt.hash(req.body.password, 10)
        const newUser = {
            id: Math.floor(Math.random() * 10000),
            username: req.body.username,
            password: hashedPass,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            threads: []
        }

        // if (!newUser.username || !newUser.email || !newUser.password || !newUser.firstname || !newUser.lastname || !req.body.cpassword) {
        //     return res.status(400).json({ msg: 'Please fill all the fields' });
        // }
        users.push(newUser);
        //res.json(users);
        // res.render('signupdone', {
        //     userid: newUser.id
        // });
        res.redirect('/login')
    } catch (err) {
        console.log(err)
        res.redirect('/sign-up')
    }
})

// Logout Request
app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

//Route for Sign-Up and Login API
app.use('/api/users', require('./routes/api/users'));

//Check Authentication
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}
//Check NOT Authentication
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect(307, '/dashboard')
    }
    next()
}

// Define Port
const PORT = process.env.PORT || 5000;

// Listen for PORT
app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));