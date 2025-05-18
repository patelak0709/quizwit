// DOM Elements
const homeLink = document.getElementById('home-link');
const quizzesLink = document.getElementById('quizzes-link');
const resultsLink = document.getElementById('results-link');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const startQuizBtn = document.getElementById('start-quiz-btn');
const authModal = document.getElementById('auth-modal');
const closeModal = document.querySelector('.close-modal');
const authForm = document.getElementById('auth-form');
const modalTitle = document.getElementById('modal-title');
const submitAuth = document.getElementById('submit-auth');
const usernameField = document.getElementById('username-field');

// Admin Panel Functionality
const adminLink = document.getElementById('admin-link');
const adminSection = document.getElementById('admin-section');
const createQuizBtn = document.getElementById('create-quiz-btn');
const quizFormContainer = document.querySelector('.quiz-form-container');
const quizForm = document.getElementById('quiz-form');
const addQuestionBtn = document.getElementById('add-question-btn');
const questionsContainer = document.getElementById('questions-container');
const adminQuizzesContainer = document.getElementById('admin-quizzes-container');

// State
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let timer = null;
let timeLeft = 0;
let userAnswers = [];

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateAuthUI(true);
        } else {
            updateAuthUI(false);
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        updateAuthUI(false);
    }
});

// Event Listeners
homeLink.addEventListener('click', () => showSection('home-section'));
quizzesLink.addEventListener('click', () => {
    if (!currentUser) {
        showAuthModal(false);
        return;
    }
    showSection('quizzes-section');
});
resultsLink.addEventListener('click', () => {
    if (!currentUser) {
        showAuthModal(false);
        return;
    }
    showSection('results-section');
});
loginBtn.addEventListener('click', () => showAuthModal(false));
signupBtn.addEventListener('click', () => showAuthModal(true));
closeModal.addEventListener('click', () => hideAuthModal());
startQuizBtn.addEventListener('click', () => {
    if (!currentUser) {
        showAuthModal(false);
        return;
    }
    showSection('quizzes-section');
});

// Admin Panel Event Listeners
adminLink.addEventListener('click', async (e) => {
    e.preventDefault();
    showSection('admin-section');
    await loadAdminQuizzes();
});

// Functions
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.getElementById(sectionId).classList.add('active-section');
    
    if (sectionId === 'quizzes-section') {
        loadQuizzes();
    } else if (sectionId === 'results-section') {
        loadResults();
    }
}

function showAuthModal(isSignup = false) {
    if (!authModal || !modalTitle || !usernameField || !submitAuth) {
        console.error('Required modal elements not found');
        return;
    }

    modalTitle.textContent = isSignup ? 'Sign Up' : 'Log In';
    usernameField.style.display = isSignup ? 'block' : 'none';
    submitAuth.textContent = isSignup ? 'Sign Up' : 'Log In';
    authModal.style.display = 'block';

    // Reset form and clear validation
    authForm.reset();
    authForm.querySelectorAll('input').forEach(input => {
        input.setCustomValidity('');
    });
}

function hideAuthModal() {
    if (authModal) {
        authModal.style.display = 'none';
    }
}

async function loadQuizzes() {
    try {
        const response = await fetch('/api/quizzes');
        const quizzes = await response.json();
        const container = document.getElementById('quizzes-container');
        container.innerHTML = '';

        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-card';
            quizCard.innerHTML = `
                <h3>${quiz.title}</h3>
                <p>${quiz.description}</p>
                <p>Time Limit: ${quiz.time_limit} minutes</p>
                <button class="btn btn-primary" onclick="startQuiz(${quiz.id})">Start Quiz</button>
            `;
            container.appendChild(quizCard);
        });
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

async function startQuiz(quizId) {
    try {
        console.log('Starting quiz with ID:', quizId); // Debug log
        
        const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load quiz');
        }
        
        const quizData = await response.json();
        console.log('Quiz data loaded:', quizData); // Debug log
        
        if (!quizData.questions || quizData.questions.length === 0) {
            throw new Error('Quiz has no questions');
        }
        
        // Initialize quiz state
        currentQuiz = quizData;
        currentQuestionIndex = 0;
        userAnswers = new Array(quizData.questions.length).fill(null);
        timeLeft = quizData.time_limit * 60;
        
        // Switch to quiz section
        showSection('quiz-section');
        
        // Update quiz title
        document.getElementById('display-quiz-title').textContent = quizData.title;
        
        // Initialize navigation buttons
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');
        
        if (nextBtn) {
            nextBtn.textContent = 'Next';
            nextBtn.disabled = false;
            nextBtn.onclick = () => {
                if (currentQuestionIndex < currentQuiz.questions.length - 1) {
                    currentQuestionIndex++;
                    loadQuestion();
                } else {
                    submitQuiz();
                }
            };
        }
        
        if (prevBtn) {
            prevBtn.disabled = true;
            prevBtn.onclick = () => {
                if (currentQuestionIndex > 0) {
                    currentQuestionIndex--;
                    loadQuestion();
                }
            };
        }
        
        // Start timer and load first question
        startTimer();
        loadQuestion();
    } catch (error) {
        console.error('Error starting quiz:', error);
        showMessage('error', error.message || 'Failed to start quiz');
    }
}

function loadQuestion() {
    console.log('Loading question:', currentQuestionIndex); // Debug log
    
    if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
        console.error('No questions available');
        return;
    }

    const question = currentQuiz.questions[currentQuestionIndex];
    if (!question) {
        console.error('Question not found at index:', currentQuestionIndex);
        return;
    }

    // Update question text
    const questionText = document.getElementById('question-text');
    if (questionText) {
        questionText.textContent = question.question_text;
    }
    
    // Update options
    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        
        ['A', 'B', 'C', 'D'].forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            const optionKey = `option_${option}`;
            optionDiv.textContent = question[optionKey];
            
            if (userAnswers[currentQuestionIndex] === option) {
                optionDiv.classList.add('selected');
            }
            
            optionDiv.onclick = () => selectOption(option);
            optionsContainer.appendChild(optionDiv);
        });
    }
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
    }
    
    if (nextBtn) {
        const isLastQuestion = currentQuestionIndex === currentQuiz.questions.length - 1;
        nextBtn.textContent = isLastQuestion ? 'Submit' : 'Next';
        nextBtn.dataset.state = isLastQuestion ? 'submit' : 'next';
    }
    
    // Update question counter
    const questionCounter = document.getElementById('question-counter');
    if (questionCounter) {
        questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
    }
}

function selectOption(option) {
    if (!currentQuiz || currentQuestionIndex < 0 || currentQuestionIndex >= currentQuiz.questions.length) {
        console.error('Invalid quiz state');
        return;
    }
    
    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selectedOption = Array.from(options).find(opt => opt.textContent === currentQuiz.questions[currentQuestionIndex][`option_${option}`]);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    userAnswers[currentQuestionIndex] = option;
}

async function submitQuiz() {
    try {
        if (!currentQuiz) {
            throw new Error('No active quiz');
        }

        const score = calculateScore();
        const response = await fetch('/api/results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                quiz_id: currentQuiz.id,
                score: score,
                total_questions: currentQuiz.questions.length,
                time_taken: currentQuiz.time_limit * 60 - timeLeft
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit quiz');
        }

        const result = await response.json();
        console.log('Quiz submitted successfully:', result);
        
        // Show results section
        showSection('results-section');
        await loadResults();
    } catch (error) {
        console.error('Error submitting quiz:', error);
        showMessage('error', error.message || 'Failed to submit quiz');
    }
}

function calculateScore() {
    return currentQuiz.questions.reduce((score, question, index) => {
        return score + (userAnswers[index] === question.correct_answer ? 1 : 0);
    }, 0);
}

async function loadResults() {
    try {
        const response = await fetch('/api/results');
        const results = await response.json();
        const container = document.getElementById('results-list');
        container.innerHTML = '';

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <h3>${result.quiz_title}</h3>
                <p>Score: ${result.score}/${result.total_questions}</p>
                <p>Time Taken: ${Math.floor(result.time_taken / 60)}:${(result.time_taken % 60).toString().padStart(2, '0')}</p>
                <p>Completed: ${new Date(result.completed_at).toLocaleDateString()}</p>
            `;
            container.appendChild(resultItem);
        });
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

// Authentication
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const isSignup = modalTitle.textContent === 'Sign Up';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = isSignup ? document.getElementById('username').value : null;
    
    // Clear any previous validation messages
    authForm.querySelectorAll('input').forEach(input => {
        input.setCustomValidity('');
    });

    // Validate form
    if (!email || !password) {
        showMessage('error', 'Please fill in all required fields');
        return;
    }

    if (isSignup && !username) {
        showMessage('error', 'Please provide a username');
        return;
    }
    
    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    const data = isSignup ? { email, password, username } : { email, password };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Authentication failed';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (result.user) {
            currentUser = result.user;
            updateAuthUI(true);
            hideAuthModal();
            showMessage('success', `Welcome, ${currentUser.username}!`);
            authForm.reset();
        } else {
            showMessage('error', result.message || 'Authentication failed');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showMessage('error', error.message || 'An error occurred during authentication');
    }
});

async function updateAuthUI(isAuthenticated) {
    const authLinks = document.querySelectorAll('.auth-link');
    const userLinks = document.querySelectorAll('.user-link');
    
    authLinks.forEach(link => {
        link.style.display = isAuthenticated ? 'none' : 'block';
    });
    
    userLinks.forEach(link => {
        link.style.display = isAuthenticated ? 'block' : 'none';
    });
    
    if (isAuthenticated) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/check`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Auth check response:', data);
                document.getElementById('username-display').textContent = data.user.username;
                updateAdminUI(data.user.is_admin);
            } else {
                currentUser = null;
                updateAuthUI(false);
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            currentUser = null;
            updateAuthUI(false);
        }
    }
}

async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = null;
            updateAuthUI(false);
            showMessage('success', 'Logged out successfully');
        } else {
            showMessage('error', 'Failed to logout');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('error', 'Failed to logout');
    }
}

// Show message to user
function showMessage(type, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Admin Panel Functionality
function updateAdminUI(isAdmin) {
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.style.display = isAdmin ? 'block' : 'none';
    }
}

// Create quiz button click handler
createQuizBtn.addEventListener('click', () => {
    quizFormContainer.style.display = 'block';
    questionsContainer.innerHTML = '';
    addQuestion();
});

// Add question button click handler
addQuestionBtn.addEventListener('click', addQuestion);

function addQuestion() {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    const questionNumber = questionsContainer.children.length + 1;
    
    questionDiv.innerHTML = `
        <div class="question-header">
            <h4>Question ${questionNumber}</h4>
            <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()">Remove</button>
        </div>
        <div class="form-group">
            <label>Question Text</label>
            <input type="text" name="question_text" class="form-control" required>
        </div>
        <div class="options-container">
            <div class="form-group">
                <label>Option A</label>
                <input type="text" name="option_A" class="form-control" required>
                <input type="radio" name="correct_answer_q${questionNumber}" value="A" required>
            </div>
            <div class="form-group">
                <label>Option B</label>
                <input type="text" name="option_B" class="form-control" required>
                <input type="radio" name="correct_answer_q${questionNumber}" value="B" required>
            </div>
            <div class="form-group">
                <label>Option C</label>
                <input type="text" name="option_C" class="form-control" required>
                <input type="radio" name="correct_answer_q${questionNumber}" value="C" required>
            </div>
            <div class="form-group">
                <label>Option D</label>
                <input type="text" name="option_D" class="form-control" required>
                <input type="radio" name="correct_answer_q${questionNumber}" value="D" required>
            </div>
        </div>
    `;
    
    questionsContainer.appendChild(questionDiv);
}

// Handle quiz form submission
quizForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form elements
    const titleInput = document.getElementById('input-quiz-title');
    const descriptionInput = document.getElementById('input-quiz-description');
    const timeLimitInput = document.getElementById('input-quiz-time-limit');
    
    // Validate form elements exist
    if (!titleInput || !descriptionInput || !timeLimitInput) {
        showMessage('error', 'Form elements not found. Please refresh the page and try again.');
        return;
    }
    
    const quizData = {
        title: titleInput.value,
        description: descriptionInput.value,
        time_limit: parseInt(timeLimitInput.value),
        questions: []
    };
    
    // Collect all questions
    const questionItems = questionsContainer.querySelectorAll('.question-item');
    if (questionItems.length === 0) {
        showMessage('error', 'Please add at least one question');
        return;
    }
    
    // Validate each question
    let isValid = true;
    questionItems.forEach((item, index) => {
        const questionText = item.querySelector('[name="question_text"]');
        const optionA = item.querySelector('[name="option_A"]');
        const optionB = item.querySelector('[name="option_B"]');
        const optionC = item.querySelector('[name="option_C"]');
        const optionD = item.querySelector('[name="option_D"]');
        const correctAnswer = item.querySelector(`input[name="correct_answer_q${index + 1}"]:checked`);
        
        if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            isValid = false;
            return;
        }
        
        quizData.questions.push({
            question_text: questionText.value,
            option_A: optionA.value,
            option_B: optionB.value,
            option_C: optionC.value,
            option_D: optionD.value,
            correct_answer: correctAnswer.value
        });
    });
    
    if (!isValid) {
        showMessage('error', 'Please fill in all question fields and select a correct answer for each question');
        return;
    }
    
    try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(quizData)
        });
        
        if (response.ok) {
            showMessage('success', 'Quiz created successfully!');
            quizForm.reset();
            questionsContainer.innerHTML = '';
            quizFormContainer.style.display = 'none';
            await loadAdminQuizzes();
        } else {
            const error = await response.json();
            console.error('Quiz creation error:', error);
            showMessage('error', error.message || 'Failed to create quiz');
        }
    } catch (error) {
        console.error('Error creating quiz:', error);
        showMessage('error', error.message || 'Failed to create quiz');
    }
});

// Load admin quizzes
async function loadAdminQuizzes() {
    try {
        const response = await fetch('/api/quizzes/admin', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const quizzes = await response.json();
            displayAdminQuizzes(quizzes);
        } else {
            showMessage('error', 'Failed to load quizzes');
        }
    } catch (error) {
        console.error('Error loading admin quizzes:', error);
        showMessage('error', 'Failed to load quizzes');
    }
}

// Display admin quizzes
function displayAdminQuizzes(quizzes) {
    adminQuizzesContainer.innerHTML = '';
    
    quizzes.forEach(quiz => {
        const quizCard = document.createElement('div');
        quizCard.className = 'admin-quiz-card';
        quizCard.innerHTML = `
            <div class="quiz-info">
                <h4>${quiz.title}</h4>
                <p>${quiz.description}</p>
                <p>Time Limit: ${quiz.time_limit} minutes</p>
                <p>Questions: ${quiz.question_count}</p>
            </div>
            <div class="quiz-actions">
                <button class="btn btn-outline" onclick="editQuiz(${quiz.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteQuiz(${quiz.id})">Delete</button>
            </div>
        `;
        adminQuizzesContainer.appendChild(quizCard);
    });
}

// Edit quiz
async function editQuiz(quizId) {
    try {
        const response = await fetch(`/api/quizzes/${quizId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const quiz = await response.json();
            // Populate form with quiz data
            document.getElementById('quiz-title').value = quiz.title;
            document.getElementById('quiz-description').value = quiz.description;
            document.getElementById('quiz-time-limit').value = quiz.time_limit;
            
            // Clear and populate questions
            questionsContainer.innerHTML = '';
            quiz.questions.forEach((question, index) => {
                addQuestion();
                const lastQuestion = questionsContainer.lastElementChild;
                lastQuestion.querySelector('[name="question_text"]').value = question.question_text;
                lastQuestion.querySelector('[name="option_A"]').value = question.option_a;
                lastQuestion.querySelector('[name="option_B"]').value = question.option_b;
                lastQuestion.querySelector('[name="option_C"]').value = question.option_c;
                lastQuestion.querySelector('[name="option_D"]').value = question.option_d;
                lastQuestion.querySelector(`input[name="correct_answer_q${index + 1}"][value="${question.correct_answer}"]`).checked = true;
            });
            
            quizFormContainer.style.display = 'block';
            window.scrollTo(0, 0);
        }
    } catch (error) {
        console.error('Error loading quiz:', error);
        showMessage('error', 'Failed to load quiz');
    }
}

// Delete quiz
async function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
        const response = await fetch(`/api/quizzes/${quizId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showMessage('success', 'Quiz deleted successfully');
            await loadAdminQuizzes();
        } else {
            showMessage('error', 'Failed to delete quiz');
        }
    } catch (error) {
        console.error('Error deleting quiz:', error);
        showMessage('error', 'Failed to delete quiz');
    }
}

function startTimer() {
    if (timer) clearInterval(timer);
    
    timer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('timer').textContent = 
            `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            submitQuiz();
        }
    }, 1000);
} 