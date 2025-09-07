# Dashboards

This document explains the different dashboards available in the application, tailored to the specific roles of Student, Mentor, and Head of Department (HOD).

## 1. Role-Based Dashboard Rendering

The application displays a different dashboard for each user role. This is managed by the `DashboardPage.jsx` component.

### `DashboardPage.jsx`

-   **Role Switching**: This component acts as a router for the dashboards. It uses the `useAuthUser` hook to get the current user's role.
-   **Conditional Rendering**: A `switch` statement checks the `user.role` and renders the corresponding dashboard component:
    -   If `role` is `student`, it renders `StudentDashboard`.
    -   If `role` is `mentor`, it renders `MentorDashboard`.
    -   If `role` is `hod`, it renders `HodDashboard`.

This ensures that each user sees a dashboard specifically designed for their needs and permissions.

## 2. Student Dashboard

### `dashboards/StudentDashboard.jsx`

This dashboard provides a student with a comprehensive overview of their current project.

-   **Project-Centric View**: If the student is not yet in a project, it displays a message prompting them to submit a proposal. If they are in a project, the dashboard is focused entirely on that project.
-   **Project Progress**:
    -   A prominent linear progress bar visualizes the project's current stage (Proposal, Specification, Code, Presentation, Done).
    -   The current stage is highlighted.
-   **Key Information**: It displays the project's background and objectives, the assigned mentor, and the student team members.
-   **Meetings**: A section shows a summary of the most recent meetings, with a button to navigate to the main meetings page to schedule a new one.
-   **Quick Links**: Provides easy access to the project's tasks and the user's profile.

## 3. Mentor Dashboard

### `dashboards/MentorDashboard.jsx`

This dashboard gives mentors a high-level view of all the projects and meetings they are involved in.

-   **Key Performance Indicators (KPIs)**:
    -   **My Projects**: Total number of projects the mentor is currently supervising.
    -   **Upcoming Meetings**: Count of meetings with an `accepted` status.
    -   **Pending Meetings**: Count of meeting requests awaiting the mentor's approval.
-   **Meetings Section**: It includes the `MeetingsSection` component, which provides a detailed, filterable list of all meetings associated with the mentor. This is the primary place for a mentor to approve or decline meeting requests.
-   **Projects Grid**: It displays a list of all projects assigned to the mentor, allowing for quick access to the details of each one.
-   **Project Status Pie Chart**: A visual breakdown of the statuses of all the mentor's projects.

## 4. HOD Dashboard

### `dashboards/HodDashboard.jsx`

The HOD dashboard provides the highest-level overview of the entire system, focusing on monitoring and management.

-   **System-Wide KPIs**:
    -   **Pending Proposals**: The number of proposals waiting for HOD review. This is a critical action item.
    -   **Total Students**: The total number of student users in the system.
    -   **Total Projects**: The total number of active projects.
-   **Graphs and Visualizations**:
    -   **`ProjectStatusBarChart.jsx`**: This bar chart shows the distribution of all students based on their project involvement:
        -   **Not Started**: Students who are not yet in a project.
        -   **In Progress**: Students who are part of a project that is not yet `done`.
        -   **Completed**: Students whose project has a `done` status.
    -   **`ProjectStatusPieChart.jsx`**: This pie chart provides a visual breakdown of all projects in the system by their current status (Proposal, Specification, Code, etc.), giving the HOD a quick snapshot of the overall progress of all projects.

## 5. Graphs and Charts

The dashboards use the `recharts` library to create interactive charts.

### `ProjectStatusPieChart.jsx`

-   **Purpose**: To show the distribution of projects by their status.
-   **Data Processing**: It takes a list of projects, counts the occurrences of each status (`proposal`, `specification`, etc.), and transforms this into a data format suitable for the pie chart.
-   **Rendering**: It renders a `PieChart` with a `Tooltip` (to show details on hover) and a `Legend`. Each slice of the pie is colored according to the project status, using colors from the Material-UI theme.

### `ProjectStatusBarChart.jsx`

-   **Purpose**: To show the number of students at different stages of project involvement.
-   **Data Processing**: It processes the lists of all projects and all students. It maps each student to their project and categorizes them into "Not Started," "In Progress," or "Completed."
--   **Rendering**: It renders a `BarChart`. Each bar represents one of these categories, and its height corresponds to the number of students in that category. The bars are color-coded for clarity (e.g., green for completed, red for not started).
