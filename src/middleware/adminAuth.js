const pool = require('../config/database');

module.exports = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Get user from database
        const [users] = await pool.query(
            'SELECT is_admin FROM users WHERE id = ?',
            [req.session.user.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check if user is admin
        if (!users[0].is_admin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 