# Project System

This document outlines the project system, covering how projects are created from approved proposals, the data model, API routes, client-side handling, and real-time updates.

## 1. Automatic Project Creation

A key feature of the system is the automatic creation of a `Project` when a Head of Department (HOD) approves a `Proposal`. This process is handled within the `proposalRouter.js` file.

### `PUT /proposals/:id/approve`

When an HOD approves a proposal, the following actions are triggered on the server:

1.  **Find the Proposal**: The server retrieves the proposal being approved.
2.  **Verify Mentor**: It ensures a mentor has been assigned to the proposal.
3.  **Create New Project**: A new `Project` document is created using the data from the approved proposal. This includes the project name, background, objectives, student(s), and the assigned mentor.
4.  **Create Snapshots**: The project stores snapshots of key information, such as student and mentor names, to ensure the project record remains stable even if user profiles change later.
5.  **Update Proposal Status**: The proposal's status is set to `Approved`.
6.  **Update User Status**: The `isInProject` field for the involved student(s) is set to `true`, and their `project` and `mentor` fields are updated. This prevents them from creating or being added to other proposals.
7.  **Handle Conflicts**: The server automatically finds and rejects any other pending proposals that involve the same student(s), preventing them from being part of multiple active projects.
8.  **Emit Socket Events**: A `project:updated` event is emitted to notify relevant clients (students, mentor, HODs) about the new project and the status change. An `updateProposals` event is also sent to notify clients about the changes in the proposal queue.

## 2. Database Model (`Project.js`)

The `Project` model defines the structure for project documents in the database.

### Schema Fields

-   **Core Details**: `name`, `background`, `objectives`. These are copied from the approved proposal.
-   **`status`**: The current stage of the project. It's an enum with the following possible values: `proposal`, `specification`, `code`, `presentation`, `done`. The default is `proposal`.
-   **`students`**: An array of 1-2 `User` references, representing the students working on the project.
-   **`mentor`**: A reference to the `User` who is mentoring the project.
-   **`proposal`**: A required, unique reference to the `Proposal` from which the project was created. This maintains a strong link to the original proposal.
-   **`snapshots`**: An object containing snapshots of `studentNames`, `mentorName`, the `approvedAt` date, and the `hodReviewer`, preserving the state at the time of approval.

## 3. Server-Side Logic (`projectRouter.js`)

This router handles all API requests related to projects.

### Key Routes

-   **`GET /`**: Fetches projects based on the user's role:
    -   **HOD**: Gets all projects.
    -   **Mentor**: Gets all projects they are mentoring.
    -   **Student**: Gets the project they are part of.
-   **`GET /:projectId`**: Fetches a single project by its ID.
-   **`PUT /:projectId/status`**: Allows a mentor to update the status of a project. Only the assigned mentor of the project can perform this action. After updating the status, it emits a `project:updated` socket event to the students, the mentor, and all HODs.

## 4. Client-Side Implementation

### Service (`projectService.js`)

This service provides functions to interact with the project API endpoints, including fetching projects and updating a project's status.

### Context (`ProjectContext.jsx`)

-   **State Management**: Manages the state for projects (`projects`, `loading`, `error`).
-   **Data Fetching**: Fetches projects based on the user's role using `projectService`.
-   **Real-time Updates**: Listens for the `project:updated` socket event. When the event is received, it updates the local state with the new project data, ensuring the UI reflects the most current information without a page reload.

### Project Pages

-   **`ProjectsPage.jsx`**:
    -   **For HODs and Mentors**: This page displays a list of projects. Users can filter projects by status and search by name, mentor, or student.
    -   **For Students**: If a student is not yet in a project, this page displays a message indicating that their project is not yet available. If they are in a project, they are automatically redirected to their specific `ProjectPage`.

-   **`ProjectPage.jsx`**:
    -   **Display**: This is the detailed view of a single project. It shows all the project information, including its status, students, mentor, and a list of associated meetings.
    -   **Status Updates**: If the logged-in user is the project's mentor, they will see a dropdown menu to change the project's status. Changing the status triggers an API call and a socket event to update all relevant clients.
    -   **Real-time**: The page listens for `project:updated` socket events to keep the displayed data in sync.

## 5. Sockets and Real-time Updates

-   **Event-Driven**: The project system heavily relies on sockets for real-time communication.
-   **`project:updated` Event**: This is the primary event for projects. It is emitted from the server whenever a project's details (like its status) are changed.
-   **Targeted Emission**: The server sends this event specifically to the users involved in the project (students and mentor) and to all HODs, ensuring that only relevant clients receive the update.
-   **Client-Side Handling**: The `ProjectContext` and `ProjectPage` listen for this event and update their state accordingly, providing a seamless and responsive user experience.
