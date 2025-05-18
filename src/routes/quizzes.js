const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Validation middleware
const validateQuiz = [
    body('title').isLength({ min: 3 }),
    body('description').optional(),
    body('time_limit').isInt({ min: 1 }),
    body('questions').isArray().notEmpty()
];

// Get all quizzes (admin view)
router.get('/admin', auth, adminAuth, async (req, res) => {
    try {
        const [quizzes] = await pool.query(`
            SELECT q.*, u.username as creator_name, 
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
            FROM quizzes q
            JOIN users u ON q.created_by = u.id
            ORDER BY q.created_at DESC
        `);
        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching admin quizzes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all quizzes (public view)
router.get('/', async (req, res) => {
    try {
        const [quizzes] = await pool.query(`
            SELECT q.*, u.username as creator_name 
            FROM quizzes q
            JOIN users u ON q.created_by = u.id
            ORDER BY q.created_at DESC
        `);
        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single quiz with questions
router.get('/:id', async (req, res) => {
    try {
        const [quizzes] = await pool.query(`
            SELECT q.*, u.username as creator_name 
            FROM quizzes q
            JOIN users u ON q.created_by = u.id
            WHERE q.id = ?
        `, [req.params.id]);

        if (quizzes.length === 0) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        const [questions] = await pool.query(
            'SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC',
            [req.params.id]
        );

        // Transform questions to match frontend expectations
        const transformedQuestions = questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            option_A: q.option_a,
            option_B: q.option_b,
            option_C: q.option_c,
            option_D: q.option_d,
            correct_answer: q.correct_answer
        }));

        res.json({
            ...quizzes[0],
            questions: transformedQuestions
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new quiz (admin only)
router.post('/', auth, adminAuth, validateQuiz, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, time_limit, questions } = req.body;
        console.log('Request body:', req.body); // Debug log
        console.log('Session user:', req.session.user); // Debug log
        
        if (!req.session.user || !req.session.user.id) {
            return res.status(400).json({ message: 'User not authenticated' });
        }

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert quiz
            const [quizResult] = await connection.query(
                'INSERT INTO quizzes (title, description, time_limit, created_by) VALUES (?, ?, ?, ?)',
                [title, description, time_limit, req.session.user.id]
            );

            const quizId = quizResult.insertId;

            // Insert questions
            for (const question of questions) {
                await connection.query(
                    `INSERT INTO questions 
                    (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        quizId,
                        question.question_text,
                        question.option_A,
                        question.option_B,
                        question.option_C,
                        question.option_D,
                        question.correct_answer
                    ]
                );
            }

            await connection.commit();
            res.status(201).json({ message: 'Quiz created successfully', quizId });
        } catch (error) {
            await connection.rollback();
            console.error('Database error:', error); // Debug log
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update quiz (admin only)
router.put('/:id', auth, adminAuth, validateQuiz, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, time_limit, questions } = req.body;
        const quizId = req.params.id;

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Update quiz
            await connection.query(
                'UPDATE quizzes SET title = ?, description = ?, time_limit = ? WHERE id = ?',
                [title, description, time_limit, quizId]
            );

            // Delete existing questions
            await connection.query('DELETE FROM questions WHERE quiz_id = ?', [quizId]);

            // Insert new questions
            for (const question of questions) {
                await connection.query(
                    `INSERT INTO questions 
                    (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        quizId,
                        question.question_text,
                        question.option_A,
                        question.option_B,
                        question.option_C,
                        question.option_D,
                        question.correct_answer
                    ]
                );
            }

            await connection.commit();
            res.json({ message: 'Quiz updated successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete quiz (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const quizId = req.params.id;

        // Delete quiz (cascade will handle questions)
        await pool.query('DELETE FROM quizzes WHERE id = ?', [quizId]);
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 