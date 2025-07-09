# Project Management System for Engineering Students

A comprehensive system for managing and tracking the final projects of engineering students. This application facilitates the entire project lifecycle, from proposal to completion, involving students, mentors, and department heads.

## 🚀 Tech Stack

-   **Frontend:** [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
-   **UI Library:** [Material-UI (MUI)](https://mui.com/)
-   **Backend:** [Express.js](https://expressjs.com/)
-   **Database:** [MongoDB](https://www.mongodb.com/)
-   **Authentication:** [JSON Web Tokens (JWT)](https://jwt.io/)

## ✨ Features

-   **User Roles:** Distinct roles and permissions for Students, Mentors, and Department Heads.
-   **Authentication:** Secure login system using JWT.
-   **Project Workflow:** Manage projects from the initial proposal to the final submission.
-   **Task Management:** Mentors can add notes and action items for each meeting.
-   **Oversight & Control:** Department heads can oversee all projects, manage users, and approve proposals.
-   **Document Handling:** Upload and view all project-related documents.
-   **Real-time Tracking:** Keep track of project progress, schedules, and deadlines.

## 🏁 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (which includes npm)
-   [MongoDB](https://www.mongodb.com/try/download/community) installed and running.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Setup the Server:**
    ```bash
    # Navigate to the server directory
    cd server

    # Install dependencies
    npm install
    ```

3.  **Setup the Client:**
    ```bash
    # Navigate to the client directory from the root folder
    cd client

    # Install dependencies
    npm install
    ```

### Environment Variables

The server requires a `.env` file to store sensitive information.

1.  Create a `.env` file in the `/server` directory.
2.  Add the following variables:

    ```env
    # .env
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_super_secret_jwt_key
    PORT=5000
    ```

### Running the Application

1.  **Start the Server:**
    ```bash
    # In the /server directory
    npm start
    ```
    The server will be running on `http://localhost:5000` (or the port you specified).

2.  **Start the Client:**
    ```bash
    # In the /client directory
    npm run dev
    ```
    The React development server will start, and you can view the application in your browser, usually at `http://localhost:5173`.
