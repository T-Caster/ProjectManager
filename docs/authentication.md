# Authentication System

This document provides a detailed explanation of the authentication system, covering both the server-side implementation and the client-side integration.

## 1. JWT Authentication

### What is JWT?

JSON Web Token (JWT) is an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object. This information can be verified and trusted because it is digitally signed.

In this project, JWT is used to authenticate users. When a user logs in, the server generates a JWT containing the user's ID and sends it to the client. The client then includes this token in the header of every subsequent request to protected routes. The server validates the token to ensure that the request is coming from an authenticated user.

### Implementation

The server uses the `jsonwebtoken` library to create and verify JWTs.

-   **Token Generation**: When a user successfully logs in, a token is generated using `jwt.sign()`. The token is signed with a secret key stored in the environment variables (`process.env.JWT_SECRET`) and is set to expire in one day (`1d`).

    ```javascript
    // server/routes/authRouter.js
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    ```

-   **Token Verification**: The `authMiddleware` on the server verifies the token on protected routes. It extracts the token from the `Authorization` header, and if the token is valid, the decoded payload (containing the user's ID) is attached to the `req` object as `req.user`.

    ```javascript
    // server/middleware/authMiddleware.js
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    ```

## 2. Database Model

The `User` model defines the schema for user documents in the MongoDB database.

### `server/models/User.js`

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  idNumber: { type: String, unique: true, maxLength: 9, minLength: 9 },
  phoneNumber: { type: String },
  role: { type: String, enum: ['student', 'mentor', 'hod'], default: 'student' },
  password: String,
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Project status
  isInProject: { type: Boolean, default: false },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

  // System fields
  recoveryCode: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: 'uploads/default.png' },
});
```

### User Fields

-   `fullName`: The user's full name.
-   `email`: The user's email address (must be unique).
-   `idNumber`: The user's ID number (must be a unique 9-digit string).
-   `phoneNumber`: The user's phone number.
-   `role`: The user's role in the system. It can be `student`, `mentor`, or `hod`. The default role is `student`.
-   `password`: The user's hashed password.
-   `mentor`: A reference to another `User` document, representing the student's assigned mentor.
-   `isInProject`: A boolean indicating if the user is currently part of a project.
-   `project`: A reference to the `Project` document the user is associated with.
-   `recoveryCode`, `resetPasswordToken`, `resetPasswordExpires`: Fields used for the password reset functionality.
-   `profilePic`: The path to the user's profile picture.

The schema also includes a `toJSON` transform that removes the `password` hash from the JSON output and prepends the server URL to the `profilePic` path.

## 3. Signup and Login Logic

### Signup

1.  **Client-Side (`client/src/pages/RegisterPage.jsx`)**:
    -   The user fills out a registration form with their full name, email, ID number, phone number, and password. They can also optionally upload a profile picture.
    -   The form includes client-side validation to ensure all fields are correctly filled out.
    -   On submission, the `handleSubmit` function creates a `FormData` object containing the user's details and the profile picture file (if provided).
    -   It then calls the `register` function from `authService.js`.

2.  **API Service (`client/src/services/authService.js`)**:
    -   The `register` function sends a `POST` request to the `/auth/register` endpoint with the `FormData`. The `Content-Type` is set to `multipart/form-data` to handle the file upload.

3.  **Server-Side (`server/routes/authRouter.js`)**:
    -   The `/register` route is handled by the `authRouter`.
    -   It uses `multer` to handle the profile picture upload. The file is saved to the `uploads` directory.
    -   The server checks if a user with the same ID number already exists.
    -   If the user does not exist, it hashes the password using `bcrypt.hash()`.
    -   A new `User` document is created in the database with the provided details.
    -   A success message is sent back to the client.

### Login

1.  **Client-Side (`client/src/pages/LoginPage.jsx`)**:
    -   The user enters their ID number and password.
    -   The `handleSubmit` function calls the `login` function from `authService.js`.

2.  **API Service (`client/src/services/authService.js`)**:
    -   The `login` function sends a `POST` request to the `/auth/login` endpoint with the user's credentials.

3.  **Server-Side (`server/routes/authRouter.js`)**:
    -   The `/login` route handler finds the user by their `idNumber`.
    -   It uses `bcrypt.compare()` to check if the provided password matches the hashed password in the database.
    -   If the credentials are valid, it generates a JWT and sends it back to the client.

4.  **Client-Side (Post-Login)**:
    -   The `LoginPage` receives the token and stores it in `localStorage`.
    -   The user is then redirected to the `/dashboard`.

## 4. Middleware and Route Protection

### Server-Side Middleware

-   **`authMiddleware.js`**: This middleware protects routes that require authentication. It checks for a valid JWT in the `Authorization` header. If the token is valid, it decodes it and attaches the user's ID to the request object (`req.user`).

-   **`roleMiddleware.js`**: This middleware restricts access to certain routes based on user roles. It takes an array of allowed roles as an argument. It fetches the user from the database using the ID from `req.user` and checks if their role is included in the allowed roles.

### Client-Side Route Protection

-   **`AuthGuard.jsx`**: This component wraps protected routes. It checks if a user is authenticated. If not, it redirects them to the login page. It also handles fetching the current user's data and initializing the socket connection.

-   **`AuthRoute.jsx`**: This component wraps public routes like login and register. If an authenticated user tries to access these routes, they are automatically redirected to the dashboard.

-   **`RoleBasedGuard.jsx`**: This component protects routes that are only accessible to specific roles (e.g., the HOD dashboard). It checks the authenticated user's role and redirects them if they don't have the required permissions.

## 5. Client-Side State Management

-   **`AuthUserContext.jsx`**: This React context provides authentication-related state and functions to the rest of the application.
    -   It holds the current `user` object and a `loading` state.
    -   The `syncUser` function is called on application load to fetch the current user's data if a token exists in `localStorage`.
    -   It provides a `logout` function that clears the token from `localStorage`, resets the user state, and disconnects the socket.
    -   It listens for `userUpdated` and `updateProposals` socket events to keep the user data in sync in real-time.

## 6. Profile Page

### `client/src/pages/ProfilePage.jsx`

-   **Viewing Profile**: This page can display the profile of the currently logged-in user or another user (by ID from the URL). It fetches the user's data using `getCurrentUser` or `getUserById` from the `authService`.
-   **Editing Profile**:
    -   If the profile belongs to the current user, an "Edit Profile" button is displayed.
    -   Clicking this button toggles the `editMode` state, which replaces the static profile information with a form.
    -   The form is pre-filled with the user's current data.
    -   The user can update their full name, email, ID number, phone number, and password. They can also change their profile picture.
    -   The `handleSubmit` function calls the `editProfile` and `uploadProfilePic` (or `resetProfilePic`) services to update the user's data on the server.
    -   Upon successful update, the page exits edit mode and displays a success message.

## 7. HOD User Management

### `client/src/pages/ViewUsersPage.jsx`

This page is only accessible to users with the `hod` role.

-   **Viewing Users**: It fetches all users from the server using the `getUsers` function in `hodService.js`, which calls the `/hod/users` endpoint.
-   **Filtering and Searching**: The HOD can filter the user list by role (`all`, `student`, `mentor`, `hod`) and by mentor. There is also a search bar to find users by name, email, or ID.
-   **Editing Users**:
    -   Each user card has an "Edit" button that opens an `EditUserDialog`.
    -   This dialog allows the HOD to modify a user's full name, email, ID number, and role.
    -   An HOD cannot change their own role.
    -   When the HOD saves the changes, the `updateUser` function from `hodService.js` is called, which sends a `PUT` request to `/hod/users/:id`.
-   **Real-time Updates**: The page listens for the `userUpdated` socket event to update the user list in real-time when any user's details are changed.

### `server/routes/hodRouter.js`

-   This router defines the API endpoints for HOD-specific actions.
-   The `/users` route returns a list of all users.
-   The `/users/:id` route allows the HOD to update a user's profile information. After updating, it emits a `userUpdated` event through sockets to notify all connected clients of the change.
-   All routes in `hodRouter.js` are protected by `authMiddleware` and `roleMiddleware(['hod'])` to ensure only authenticated HODs can access them.
