const pool = require('../config/database');

module.exports = async (req, res, next) => {
    try {
        // Debug log
        console.log('Session data:', req.session);
        
        // Check if session exists and has user data
        if (!req.session || !req.session.user || !req.session.user.id) {
            console.log('No session or user data found');
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Get user details from database
        const [users] = await pool.query(
            'SELECT id, username, email, is_admin FROM users WHERE id = ?',
            [req.session.user.id]
        );

        if (users.length === 0) {
            console.log('User not found in database');
            req.session.destroy();
            return res.status(401).json({ message: 'User not found' });
        }

        // Update session user with fresh data
        const userData = {
            id: users[0].id,
            username: users[0].username,
            email: users[0].email,
            is_admin: users[0].is_admin
        };

        // Update both req.user and session
        req.user = userData;
        req.session.user = userData;
        
        // Save the session
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).json({ message: 'Session error' });
            }
            next();
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
}; 