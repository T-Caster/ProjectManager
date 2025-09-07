# Project Proposal System

This document explains the project proposal system, from the database model to the client-side implementation, including real-time features powered by WebSockets.

## 1. Database Model (`Proposal.js`)

The `Proposal` model is the core of the proposal system. It stores all information related to a project proposal.

### Schema Fields

-   **Basic Info**: `projectName`, `background`, `objectives`, `marketReview`, `newOrImproved`. These fields store the core details of the project.
-   **Author Info**:
    -   `author`: A reference to the `User` who created the proposal.
    -   `authorSnapshot`: A snapshot of the author's `fullName` and `idNumber` at the time of submission. This is to preserve the author's details even if their user profile changes later.
-   **Contact Info**: `address`, `mobilePhone`, `endOfStudies`. These are specific to the proposal and are not stored in the `User` model.
-   **Co-student**:
    -   `coStudent`: An optional reference to another `User` who is a co-author of the proposal.
    -   `coStudentSnapshot`: A snapshot of the co-student's details.
-   **Mentor Suggestion**: `suggestedMentor`: An optional reference to a `User` (mentor) suggested by the student.
-   **Attachments**: `attachments`: An array to store information about uploaded files (e.g., the proposal PDF), including a reference to the `File` model.
-   **Status and Lifecycle**:
    -   `status`: The current status of the proposal (`Draft`, `Pending`, `Approved`, `Rejected`).
    -   `submittedAt`, `reviewedAt`: Timestamps for submission and review.
    -   `approval`: An object storing the HOD's decision (`Approved` or `Rejected`), the reason for rejection, and a reference to the HOD who made the decision.
-   **Indexes**: The schema uses indexes to optimize queries and enforce constraints, such as preventing a student from having more than one pending proposal at a time.

## 2. Server-Side Logic (`proposalRouter.js`)

The `proposalRouter.js` file handles all API requests related to proposals. All routes are protected by `authMiddleware`.

### Key Routes

-   **`POST /draft`**: Allows a student to create a new proposal or update an existing one. The proposal is saved with a `Draft` status.
-   **`PUT /:id/submit`**: A student submits a proposal. The status is changed from `Draft` or `Rejected` to `Pending`. The server checks the eligibility of both the author and the co-student to ensure they are not already in a project or part of another pending proposal.
-   **`GET /my`**: Fetches all proposals created by the currently logged-in student.
-   **`GET /queue`**: For HODs only. Fetches all proposals with a `Pending` status.
-   **`GET /:id`**: Fetches a single proposal by its ID. Access is restricted to the author, co-student (if the proposal is pending or approved), and HODs.
-   **`PUT /:id/approve`**: For HODs only. Approves a proposal. This is a critical action that:
    1.  Changes the proposal status to `Approved`.
    2.  **Creates a new `Project`** from the proposal details.
    3.  Updates the `isInProject` status for the student(s) involved.
    4.  Automatically rejects any other pending proposals from the same student(s).
-   **`PUT /:id/reject`**: For HODs only. Rejects a proposal. The HOD must provide a reason for the rejection. The proposal status is changed to `Rejected`, and the proposal is returned to the student for editing.
-   **`POST /upload`**: Handles PDF file uploads for the proposal.
-   **`GET /file/:fileId`**: Securely serves uploaded files, checking user permissions before allowing a download.

## 3. Client-Side Implementation

### Service (`proposalService.js`)

This service provides functions that make API calls to the server's proposal endpoints. It abstracts the HTTP requests (using `axios`) for creating drafts, submitting proposals, fetching data, and HOD actions.

### Context (`ProposalContext.jsx`)

-   **State Management**: This context manages the state for proposals on the client side. It holds `myProposals` (for students) and `pendingProposals` (for HODs).
-   **Data Fetching**: It uses the `proposalService` to fetch the relevant proposals based on the user's role.
-   **Real-time Updates**: It establishes a connection to the socket server and listens for the `updateProposals` event. When this event is received, it re-fetches the proposal data, ensuring the UI is always up-to-date.

### Proposal Creation and Editing (`ProposeProjectPage.jsx`)

-   **Functionality**: This page allows students to create new proposals or edit existing ones (if they are in `Draft` or `Rejected` status).
-   **Drafts**: The "Save Draft" button calls the `/draft` endpoint. This allows students to save their progress without formally submitting the proposal. The form is pre-filled with the data from the most recent draft.
-   **Submission**: The "Submit Proposal" button first saves any changes (as a draft) and then calls the `/submit` endpoint.
-   **Rejection Handling**: If a proposal is rejected by the HOD, its status becomes `Rejected`. The student can then navigate to this page, see the rejection reason in a banner, edit the proposal based on the feedback, and resubmit it. The data is not lost.
-   **Co-student System**: The form includes a dropdown to select an eligible co-student. The list of eligible co-students is fetched from the server, which excludes students who are already in a project or part of another pending proposal.
-   **Read-only Mode**: If a proposal is `Pending` or `Approved`, the form fields are disabled, preventing any further edits.

### HOD's Review Process

-   **Queue (`ProposalsQueuePage.jsx`)**: This page displays a list of all pending proposals for the HOD. The HOD can search and filter the proposals. Clicking on a proposal navigates to the review page.
-   **Review (`ProposalReviewPage.jsx`)**: This page shows all the details of a single proposal. The HOD can:
    -   View all proposal information and download the attached PDF.
    -   Assign or change the mentor for the project. A mentor must be assigned before approval.
    -   **Approve** the proposal, which triggers the project creation process.
    -   **Reject** the proposal by providing a reason.

## 4. Real-time Updates with Sockets

-   **Server-Side (`proposalRouter.js` and `socketManager.js`)**:
    -   The server maintains a mapping of `userId` to `socket.id` in the `socketManager`.
    -   When a significant action occurs (e.g., a proposal is submitted, approved, or rejected), the server identifies the users who need to be notified (the author, co-student, and all HODs).
    -   It then emits an `updateProposals` event directly to the specific sockets of these users.
-   **Client-Side (`ProposalContext.jsx`)**:
    -   The `ProposalContext` listens for the `updateProposals` event.
    -   When the event is received, it triggers a re-fetch of the proposal data, which in turn updates the state and re-renders the relevant components with the latest information. This ensures that all concerned parties see the changes in real-time without needing to manually refresh the page.
