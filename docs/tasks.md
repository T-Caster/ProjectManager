# Task System

This document explains the task management system, which allows mentors to assign tasks to students based on meeting outcomes.

## 1. Database Model (`Task.js`)

The `Task` model defines the schema for tasks in the database.

### Schema Fields

-   **Context**: `meeting` and `project` references link the task to its respective meeting and project.
-   **Actors**: `createdBy` stores a reference to the user (typically a mentor) who created the task.
-   **Content**: `title` and `description` store the details of the task.
-   **Lifecycle**:
    -   `status`: Can be `open` or `completed`.
    -   `dueDate`: The date by which the task should be completed.
-   **Completion Tracking**:
    -   `completedAt`: Timestamp for when the task was marked as completed.
    -   `dueDateAtCompletion`: A snapshot of the due date at the time of completion.
    -   `completedLate`: A boolean flag that is automatically set to `true` if `completedAt` is after `dueDateAtCompletion`.
-   **Virtuals**: A virtual field `isOverdue` is calculated on the fly to check if an open task has passed its due date.
-   **Middleware**: A `pre-save` hook automatically handles the logic for setting completion details (`completedAt`, `completedLate`) when a task's status is changed to `completed`.

## 2. Server-Side Logic (`taskRouter.js`)

This router handles all API requests for tasks. All routes are protected by role-based middleware.

### Key Routes

-   **`POST /` (Create Task)**:
    -   This route is restricted to **mentors only**.
    -   A crucial validation step ensures that a task can only be created for a meeting that has a status of **`held`**. This enforces the workflow where tasks are assigned as outcomes of a completed meeting.
    -   The route also validates that the `dueDate` is in the future.
-   **`GET /mine`**: Fetches all tasks associated with the projects a user (student or mentor) is part of.
-   **`PUT /:taskId/complete`**: Allows a student or mentor to mark a task as `completed`.
-   **`PUT /:taskId/reopen`**: Allows a **mentor only** to change a `completed` task's status back to `open`.
-   **`PUT /:taskId` (Update Task)**: Allows a **mentor only** to edit the `title`, `description`, or `dueDate` of a task.
-   **`DELETE /:taskId`**: Allows a **mentor only** to delete a task.

## 3. Client-Side Implementation

### Service (`taskService.js`)

Provides functions for making API calls to the task endpoints, such as creating, updating, completing, and deleting tasks.

### Context (`TaskContext.jsx`)

-   **State Management**: Manages the `tasks` state for the current user.
-   **Data Fetching**: Fetches all relevant tasks for the user upon loading.
-   **Real-time Updates**: Listens for `taskCreated`, `taskUpdated`, and `taskDeleted` socket events to keep the local task list synchronized with the server in real-time.

### UI Components

-   **`TasksPage.jsx`**:
    -   **Main View**: This is the central page for viewing and managing tasks.
    -   **Filtering**: Users can filter tasks by project, meeting, status (`all`, `open`, `completed`, `overdue`), and due date range.
    -   **Task Creation (Mentor View)**:
        -   If the user is a mentor, a "New Task" button is visible.
        -   Clicking this button opens a `CreateTaskDialog`.
        -   In the dialog, the mentor must select a **held** meeting from a dropdown list to associate the task with. This dropdown is populated only with meetings that have a `held` status, reinforcing the intended workflow.
    -   **Rendering**: The page renders a list of `TaskCard` components for each filtered task.

-   **`TaskCard.jsx`**:
    -   **Display**: This component displays the details of a single task, including its title, description, due date, and status.
    -   **Conditional Rendering**: The actions available on the card are determined by the user's `role` and the task's `status`:
        -   **Status Chip**: A colored chip clearly indicates the task's status (`Open`, `Completed`, `Overdue`, `Completed (late)`).
        -   **Complete Button**: Visible for students and mentors on `open` tasks.
        -   **Reopen Button**: Visible only for mentors on `completed` tasks.
        -   **Edit/Delete Buttons**: Visible only for mentors on `open` tasks. Clicking "Edit" puts the card into an inline editing mode where the title, description, and due date can be modified.
        -   **Save Button**: Appears in edit mode to save changes.

## 4. Sockets and Real-time Updates

-   **Events**: The task system uses three socket events: `taskCreated`, `taskUpdated`, and `taskDeleted`.
-   **Targeted Emission**: When a task is created, updated, or deleted, the server emits the corresponding event to all members of the associated project (students and mentor).
-   **Client-Side Handling**: The `TaskContext` listens for these events and updates its `tasks` state accordingly. This ensures that any change made by one user (e.g., a mentor creating a task or a student completing one) is immediately reflected on the screens of all other project members.
