const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Get user's results
router.get('/', auth, async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const [results] = await pool.query(
            'SELECT r.*, q.title as quiz_title FROM results r JOIN quizzes q ON r.quiz_id = q.id WHERE r.user_id = ? ORDER BY r.completed_at DESC',
            [req.session.user.id]
        );
        res.json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Submit quiz result
router.post('/', auth, async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { quiz_id, score, total_questions, time_taken } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO results (user_id, quiz_id, score, total_questions, time_taken) VALUES (?, ?, ?, ?, ?)',
            [req.session.user.id, quiz_id, score, total_questions, time_taken]
        );
        
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error submitting result:', error);
        res.status(500).json({ error: 'Failed to submit result' });
    }
});

// Get quiz statistics
router.get('/stats/:quizId', auth, async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const userId = req.user.id;

        // Verify quiz ownership
        const [quizzes] = await pool.query(
            'SELECT * FROM quizzes WHERE id = ? AND created_by = ?',
            [quizId, userId]
        );

        if (quizzes.length === 0) {
            return res.status(403).json({ message: 'Not authorized to view these statistics' });
        }

        // Get quiz statistics
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_attempts,
                AVG(score) as average_score,
                MIN(score) as lowest_score,
                MAX(score) as highest_score,
                AVG(time_taken) as average_time
            FROM results
            WHERE quiz_id = ?
        `, [quizId]);

        // Get recent attempts
        const [recentAttempts] = await pool.query(`
            SELECT r.*, u.username
            FROM results r
            JOIN users u ON r.user_id = u.id
            WHERE r.quiz_id = ?
            ORDER BY r.completed_at DESC
            LIMIT 10
        `, [quizId]);

        res.json({
            statistics: stats[0],
            recentAttempts
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 