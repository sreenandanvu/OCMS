# OCMS — Online College Management System

A modern, responsive MERN-stack college management platform based on the supplied project scope.

## Scope

### 1. Student Management
- Registration and profile management
- Contact/DOB/address records
- Course, semester, subjects and academic history
- Document records and verification URLs
- Digital ID / printable student information
- Subject registration data
- Timetable view
- Attendance and result views through APIs
- Leave applications

### 2. Faculty Management
- Faculty profile and registration
- Subject and class allocation data
- Timetable data
- Attendance marking
- Marks entry through results
- Assignment management
- Leave applications
- Student performance data
- Communication/announcements

### 3. Attendance
- Daily, subject-wise and period-wise records
- Automatic percentage reporting
- Low-attendance reporting at 75%
- Leave/correction support
- Bulk attendance API
- QR session generation and QR check-in API
- Monthly/semester-ready records

### 4. Examinations & Results
- Exam scheduling
- Student registration data
- Hall-ticket-ready exam records
- Question-paper/resource URL support
- Marks and internal marks
- Automatic grade/grade-point calculation API
- Published results
- Revaluation requests and decisions
- Performance analytics

### 5. Reporting & Analytics
- Student, faculty, attendance and examination data
- Attendance by subject
- Performance by subject
- Low-attendance students
- Class-level report endpoint
- Dashboard analytics
- Excel export from the web UI
- PDF report generation
- Print-friendly records

## Additional academic workflows
Assignments, timetable, leave management, documents and communication are included because they are part of the feature-level scope.

## Technology
- MongoDB + Mongoose
- Express.js
- React + Vite
- Node.js
- JWT + bcrypt authentication
- Recharts, jsPDF, XLSX and QRCode React
- Responsive CSS
- Light / Dark / Auto theme

## Default administrator

```text
Email: admin@ocms.com
Password: admin123
```

Change the development credentials before production deployment.

## Run locally

### 1. MongoDB

Start a local MongoDB instance on `mongodb://127.0.0.1:27017`.

### 2. Server

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ocms
JWT_SECRET=change-this-secret
CLIENT_URL=http://localhost:5173
```

Then:

```bash
npm run dev
```

### 3. Client

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Architecture

```text
OCMS
├── client/        React + Vite UI
│   └── src/
├── server/        Express + MongoDB API
│   └── src/
├── .github/       CI build/checks
└── README.md
```

The project is intentionally organized so additional modules can be added without replacing the existing authentication, theme system or API foundation.
