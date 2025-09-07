# Meeting System

This document details the meeting system, explaining how students and mentors can schedule, approve, and manage meetings for their projects.

## 1. Database Model (`Meeting.js`)

The `Meeting` model stores all information about a scheduled meeting.

### Schema Fields

-   `project`: A reference to the `Project` this meeting belongs to.
-   `proposer`: A reference to the `User` who last proposed or rescheduled the meeting.
-   `mentor`: A reference to the project's mentor.
-   `proposedDate`: The date and time for the meeting.
-   `status`: The current status of the meeting.
-   `attendees`: An array of `User` references for all who are expected to attend (students and mentor).
-   `lastRescheduleReason`: A string to store the reason for the most recent reschedule request.

### Meeting Statuses

The `status` field is an enum that can have one of the following values:

-   **`pending`**: The meeting has been proposed and is awaiting approval from the other party.
-   **`accepted`**: The meeting has been approved by all parties and is scheduled to happen.
-   **`rejected`**: The meeting proposal has been declined.
-   **`held`**: The meeting date has passed, and the meeting was in an `accepted` state. This status is crucial as it allows mentors to add tasks to the meeting's summary.
-   **`expired`**: The meeting date has passed, but the meeting was still `pending`. It was never approved.

The schema includes helper methods (`_deriveTemporalStatus`, `materializeTemporalStatus`) to automatically update the status from `accepted` to `held` or from `pending` to `expired` based on the current date and time. This ensures that meeting statuses are always accurate.

## 2. Server-Side Logic (`meetingRouter.js`)

This router manages all API requests for meetings.

### Key Routes

-   **`POST /propose`**: A student proposes a new meeting. The server checks for scheduling conflicts with the mentor's other meetings and ensures the proposed time is within working hours (8:00-17:00).
-   **`GET /:projectId`**: Fetches all meetings for a specific project. Before returning the data, it materializes the temporal statuses to ensure they are up-to-date.
-   **`PUT /:meetingId/approve`**: A mentor approves a meeting proposed by a student. The status changes to `accepted`.
-   **`PUT /:meetingId/decline`**: A mentor declines a meeting proposed by a student. The status changes to `rejected`.
-   **`PUT /:meetingId/student-approve`**: A student approves a meeting that was rescheduled/proposed by the mentor.
-   **`PUT /:meetingId/student-decline`**: A student declines a meeting that was rescheduled/proposed by the mentor.
-   **`PUT /:meetingId/reschedule`**: Allows either a student or a mentor to propose a new time for a meeting.
    -   This action can only be performed on `pending` or `accepted` meetings.
    -   When a meeting is rescheduled, its status is reset to `pending`.
    -   The `proposer` field is updated to the user who initiated the reschedule.
    -   This requires the *other* party to approve the new time. For example, if a mentor reschedules, a student must approve it.

## 3. Client-Side Implementation

### Service (`meetingService.js`)

This service provides functions for making API calls to the meeting endpoints, abstracting the `axios` requests for proposing, approving, declining, and rescheduling meetings.

### Context (`MeetingContext.jsx`)

-   **State Management**: Manages the `meetings` state for the logged-in user.
-   **Data Fetching**: Fetches the relevant meetings based on the user's role (student, mentor, or HOD).
-   **Real-time Updates**: Listens for `newMeeting` and `meetingUpdated` socket events. When an event is received, it updates the local `meetings` state, ensuring the UI is always synchronized with the server.

### UI Components

-   **`ScheduleMeetingPage.jsx` (for Students)**:
    -   This page allows a student to propose a new meeting time to their mentor.
    -   It includes a `DateTimePicker` to select a date and time.
    -   It also displays a list of all current and past meetings for their project using the `MeetingsSection` component.

-   **`MeetingsPage.jsx` (for Mentors)**:
    -   This page serves as the main view for mentors to see all incoming meeting requests and the status of all their meetings across different projects. It uses the `MeetingsSection` component.

-   **`MeetingsSection.jsx`**:
    -   A reusable component that displays a list of meetings.
    -   It includes filtering options to view meetings by status (`all`, `pending`, `accepted`, etc.).
    -   It renders a `MeetingCard` for each meeting in the list.

-   **`MeetingCard.jsx`**:
    -   This is the core UI component for displaying a single meeting.
    -   **Conditional Rendering**: The card's appearance and the buttons it displays are highly dependent on the meeting's `status` and the current user's `role`.
        -   **Status Chip**: A colored chip indicates the current status (e.g., "Pending Approval", "Scheduled", "Held").
        -   **Approve/Decline Buttons**: These buttons are only rendered for the user whose approval is currently required. For example, if a student proposes a meeting, only the mentor will see these buttons. If the mentor reschedules, only the student(s) will see them.
        -   **Reschedule Button**: This button is available on `pending` and `accepted` meetings for any attendee, as long as the meeting is in the future.
        -   **Tasks Button**: This button appears only when a meeting's status is `held`, allowing users to view the tasks associated with that meeting's summary.
    -   **Reschedule Dialog**: Clicking the "Reschedule" button opens a `RescheduleDialog` where the user can pick a new date and provide a reason for the change.

## 4. Sockets and Real-time Updates

-   **Events**: The system uses two main socket events: `newMeeting` and `meetingUpdated`.
-   **Targeted Emission**: When an action is performed on a meeting, the server emits an event to all attendees of that meeting (students and mentor).
-   **Client-Side Handling**: The `MeetingContext` listens for these events and updates its state, which causes the UI to re-render with the latest meeting information. This provides a real-time experience where users can see status changes and new proposals instantly.
