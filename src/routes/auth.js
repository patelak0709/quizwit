const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// Validation middleware
const validateSignup = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('username').isLength({ min: 3 })
];

const validateLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
];

// Check if user is logged in
router.get('/check', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Get fresh user data from database
        const [users] = await pool.query(
            'SELECT id, username, email, is_admin FROM users WHERE id = ?',
            [req.session.user.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Signup route
router.post('/signup', validateSignup, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { email, password, username } = req.body;

        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                message: 'User already exists with this email or username' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
            [email, hashedPassword, username]
        );

        // Get the newly created user with admin status
        const [newUser] = await pool.query(
            'SELECT id, username, email, is_admin FROM users WHERE id = ?',
            [result.insertId]
        );

        // Set session
        req.session.user = {
            id: newUser[0].id,
            username: newUser[0].username,
            email: newUser[0].email,
            is_admin: newUser[0].is_admin
        };

        // Save session
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session error' });
            }
            res.status(201).json({ 
                message: 'User created successfully',
                user: newUser[0]
            });
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login route
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { email, password } = req.body;

        // Get user from database
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Get fresh user data including admin status
        const [freshUser] = await pool.query(
            'SELECT id, username, email, is_admin FROM users WHERE id = ?',
            [user.id]
        );

        // Set session
        req.session.user = {
            id: freshUser[0].id,
            username: freshUser[0].username,
            email: freshUser[0].email,
            is_admin: freshUser[0].is_admin
        };

        // Save session
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session error' });
            }
            res.json({ 
                message: 'Login successful',
                user: freshUser[0]
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

module.exports = router; 