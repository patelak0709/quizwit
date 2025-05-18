# Quiz Application

A modern web-based quiz application built with Node.js, Express, MySQL, and vanilla JavaScript.

## Features

- User authentication (Sign up/Login)
- Create and manage quizzes
- Take quizzes with timer
- View results and scores
- Responsive design

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=quiz_app
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```
4. Set up the MySQL database:
   - Create a database named `quiz_app`
   - Import the database schema from `database/schema.sql`

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
quiz-app/
├── public/          # Static files (HTML, CSS, JS)
├── src/             # Backend source code
│   ├── config/      # Configuration files
│   ├── controllers/ # Route controllers
│   ├── models/      # Database models
│   ├── routes/      # API routes
│   └── middleware/  # Custom middleware
├── database/        # Database scripts
└── .env            # Environment variables
``` 