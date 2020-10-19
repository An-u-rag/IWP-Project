const express = require('express');
const router = express.Router();
const User = require('../models/User')
const bcrypt = require('bcryptjs')
const passport = require('passport')
const auth = require('../config/auth')

// All Users GET Route
router.get('/', async(req, res) => {
    try {
        const searchOptions = {}
        if (req.query.username !== null && req.query.username !== '') {
            searchOptions.username = new RegExp(req.query.username, 'i')
        }
        const users = await User.find(searchOptions)
        res.render('users/index', {
            users: users.map(user => user.toJSON()),
            searchOptions: req.query
        })
    } catch {
        res.redirect('/')
    }
})

// Signup/Register GET Route
router.get('/new', auth.checkNotAuthenticated, (req, res) => {
    res.render('users/new', { user: new User() })
})

// Create User/Sign-Up POST Route
router.post('/new', auth.checkNotAuthenticated, async(req, res) => {
    const { username, email, firstName, lastName, password, cpassword } = req.body
    let errors = []
        // Check Required fields
    if (!username || !email || !firstName || !password || !cpassword) {
        errors.push({ msg: 'Please fill in all fields!' })
    }
    // Check Password match
    if (password !== cpassword) {
        errors.push({ msg: 'Passwords Don\'t Match!' })
    }
    // Check Password Strength
    let passwd = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/
    if (!password.match(passwd)) {
        errors.push({ msg: "Password must be between 6-20 characters and contain atleast 1 Uppercase, 1 Lowercase and 1 Number" })
    }

    const newUser = new User({
        username,
        email,
        firstName,
        lastName,
        password
    })

    if (errors.length > 0) {
        // Validation Doesn't Pass
        res.render('users/new', {
            user: newUser.toJSON(),
            errorMessage: errors
        })
    } else {
        // Validation Passes
        // Check if user already exists
        User.findOne({ email: email })
            .then(async user => {
                if (user) {
                    //User Exists
                    errors.push({ msg: 'Email is already registered' })
                    res.render('users/new', {
                        user: user.toJSON(),
                        errorMessage: errors
                    })
                } else {
                    // Hash Password
                    bcrypt.genSalt(10, (err, salt) =>
                        bcrypt.hash(newUser.password, salt, (err, hash) => {
                            if (err) throw err
                            newUser.password = hash
                            newUser.save()
                                .then(user => {
                                    req.flash('success_msg', 'You are now Registered and can Login')
                                    res.redirect("/users/login")
                                })
                                .catch(err => console.log(err))
                        }))


                    // try {
                    //     const user = await newUser.save()
                    //         // res.redirect(`users/${newUser.id}`)
                    //     res.redirect('/users')
                    // } catch {
                    //     res.render('users/new', {
                    //         user: newUser.toJSON(),
                    //         errorMessage: 'Error creating User'
                    //     })
                    // }
                }
            })
    }
})

// Login GET Route
router.get('/login', auth.checkNotAuthenticated, (req, res) => {
    res.render('users/login')
})

// Login POST Route
router.post('/login', auth.checkNotAuthenticated, (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next)
})

// Logout DELETE Request
router.delete('/logout', auth.checkAuthenticated, (req, res) => {
    req.logOut()
    req.flash('success_msg', 'You have been Successfully Logged Out!')
    res.redirect('/users/login')
})


module.exports = router;