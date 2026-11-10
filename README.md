# Anonymous Campus

### A Privacy-Focused Student Feedback and Campus Improvement Platform

Anonymous Campus is a web-based platform designed to help students share honest feedback about campus facilities while reducing the fear of personal identification.

Students can submit ratings and comments about facilities such as mess, laundry, Wi-Fi, rooms, water and sports facilities. Administrators can review feedback, identify recurring facility issues and track their resolution.

**Our goal:** To create a transparent feedback system where student voices can contribute to meaningful campus improvements.

---

## Key Features

### Student Features

- Student registration and login using IIIT Sonepat college email accounts.
- Email verification before accessing the application.
- Feedback submission for six campus facilities: Mess, Laundry, Wi-Fi, Rooms, Water and Sports.
- Facility ratings from 1 to 5 with optional comments.
- Weekly submission limits to reduce duplicate feedback.
- Automatic masking of recognised inappropriate language.
- Personal account notices for warnings and suspensions.
- Ability to appeal eligible account sanctions.
- Facility issue tracking with status updates.

### Administrator Features

- Secure admin authentication and role-based access.
- Dashboard displaying facility feedback statistics.
- Minimum five-response threshold before facility issues and aggregate information become visible.
- Access to recent student feedback.
- Feedback moderation tools.
- Facility issue tracking and status updates.
- Ability to issue policy-based warnings and seven-day suspensions.
- Appeal review and sanction reversal.
- Audit records for account actions and appeal decisions.

---

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript (ES Modules)

### Backend
- Firebase Cloud Functions
- Node.js
- Firebase Admin SDK

### Database and Authentication
- Firebase Authentication
- Cloud Firestore

### Development and Testing Tools
- Visual Studio Code
- Firebase Emulator Suite
- Git and GitHub

---

## System Architecture

Anonymous Campus follows a client-server architecture.

1. **Student Interface:** Students interact with the application through a web interface built using HTML, CSS and JavaScript.
2. **Authentication:** Firebase Authentication handles student and administrator sign-in.
3. **Backend Processing:** Firebase Cloud Functions validate requests, enforce permissions, process feedback and manage account actions.
4. **Database:** Cloud Firestore stores feedback, facility information, account notices, submission records and appeal information.
5. **Administrator Dashboard:** Authorized administrators access feedback statistics, recent submissions, facility issues and appeal management tools.

### Application Flow

```text
Student / Administrator
          |
          v
     Web Interface
          |
          v
 Firebase Authentication
          |
          v
 Firebase Cloud Functions
          |
          v
     Cloud Firestore
```

---

## Privacy and Security

Privacy is an important design consideration in Anonymous Campus.

- Feedback documents do not directly store student names, email addresses or Firebase UIDs.
- A separate backend mapping supports submission eligibility and policy enforcement.
- Account identifiers are protected using HMAC-SHA256.
- Students cannot directly read or write Firestore documents through client-side access.
- Administrative operations are protected by backend authentication and authorization checks.
- Students can view their own account notices and appeal eligible sanctions.
- Negative opinions and low ratings are not automatically treated as policy violations.
- Ratings remain part of facility statistics even when inappropriate language in comments is masked or comments are withheld.

### Privacy Limitation

Anonymous Campus is designed to reduce direct identity exposure, but it does not guarantee absolute anonymity. Privileged backend access may allow the project owner to associate feedback with an account through separate records.

The system aims to protect genuine criticism while allowing action against specific policy violations such as targeted abuse, threats, disclosure of personal information and spam.

---

## Installation and Local Setup

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- Firebase CLI
- Visual Studio Code (recommended)
- Live Server extension for VS Code (recommended)

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd "Anonymous Campus"
```

Replace the repository URL with the actual GitHub repository URL.

### 2. Install Backend Dependencies

```bash
cd functions
npm install
cd ..
```

### 3. Configure Firebase

Log in to Firebase CLI:

```bash
firebase login
```

Make sure the Firebase project configuration and emulator settings are available in the project.

### 4. Configure Environment Variables

Create a `.env` file inside the `functions` directory.

Add:

```env
ANONYMOUS_ACCOUNT_SECRET=YOUR_PRIVATE_RANDOM_SECRET
```

Use a securely generated random secret of at least 32 characters.

**Important:** Never publish this secret or commit the `.env` file to GitHub.

### 5. Start Firebase Emulators

From the project root, run:

```bash
firebase emulators:start --only auth,firestore,functions
```

This starts the Firebase Authentication, Cloud Firestore and Cloud Functions emulators configured in the project.

### 6. Open the Application

Use Visual Studio Code with Live Server to open the application's HTML pages locally.

The application can then be tested using the local Firebase Emulator Suite.

---

## Administrator Setup

Administrator access is controlled by the backend.

- Admin accounts must be provisioned through a trusted administrative process.
- The backend checks administrator authorization using the `adminUsers` collection.
- A student cannot grant themselves administrator privileges through the registration page.
- Administrative access must never be assigned through an untrusted client-side operation.

---

## Project Status

Anonymous Campus currently has a developed local prototype implemented and tested using the Firebase Emulator Suite.

### Implemented Features

- Student registration, login and logout.
- College email verification.
- Feedback submission for six campus facilities.
- Weekly submission limits and duplicate prevention.
- Automatic masking of recognised inappropriate language.
- Facility feedback statistics with a minimum response threshold.
- Automatic facility issue creation and report counting from low ratings.
- Administrator dashboard and feedback moderation.
- Facility issue tracking and status updates.
- Student warnings and seven-day suspensions.
- Student sanction appeals and administrator appeal review.
- Backend authentication and authorization checks.
- Private account notices and suspension expiry handling.

### Future Improvements

- Production deployment and hosting.
- Further separation of feedback and account records.
- Expanded security and edge-case testing.
- Improved accessibility and mobile responsiveness.
- Enhanced administrative reporting and analytics.

---

## Project Objective

Anonymous Campus aims to provide students with a safer channel for expressing concerns, while helping administrators identify recurring problems and make informed decisions about campus improvements.

**Speak honestly. Stay protected. Improve together.**

---

## BharatCode AI Integration

Anonymous Campus integrates the BharatCode AI API to help administrators understand campus facility feedback and identify areas that may need improvement.

### AI Capabilities

- Analyses aggregated facility ratings.
- Examines privacy-reviewed facility issue counts and statuses.
- Generates facility-specific insights.
- Suggests actionable recommendations for campus improvement.
- Helps administrators prioritize recurring facility concerns.

### AI Workflow

1. Students submit anonymous facility feedback.
2. Firebase Cloud Functions calculate aggregate statistics.
3. Relevant aggregate data and privacy-reviewed issue information are sent to BharatCode AI.
4. BharatCode AI generates insights and recommendations.
5. Administrators review the results and decide on appropriate actions.

### Privacy in AI Processing

- Raw student comments are not sent to BharatCode AI.
- Student names, emails and Firebase UIDs are not included in AI requests.
- AI analysis uses aggregated ratings and facility issue information.
- API credentials are stored in server-side environment variables.

### AI Technology

- Provider: BharatCode AI
- Model: qwen-3.8-27b
- API: BharatCode Responses API

AI-generated recommendations support administrative decision-making; final decisions remain with human administrators.
