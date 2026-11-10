
# Anonymous Campus

### A Privacy-Focused Student Feedback and Campus Improvement Platform

**Speak honestly. Stay protected. Improve together.**

Anonymous Campus is a privacy-first web application developed for IIIT Sonepat. It provides students with a safer way to share honest feedback about campus facilities while reducing the fear of personal identification.

Students can submit ratings and comments about facilities such as mess, laundry, Wi-Fi, rooms, water and sports facilities. Administrators can review feedback, identify recurring facility issues and track their resolution.

**Live Website:** https://anonymous-campus-test.netlify.app

**GitHub Repository:** https://github.com/rohitjee7022-blip/Anonymous-Campus

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
- Minimum five-response threshold before aggregate information becomes visible.
- Access to recent student feedback.
- Feedback comment moderation tools.
- Facility issue tracking and status updates.
- Ability to issue policy-based warnings and seven-day suspensions.
- Appeal review and sanction reversal.
- Records of account actions and appeal decisions.

### AI-Powered Features

- BharatCode AI integration for facility insights.
- Analysis of aggregated facility ratings.
- Identification of facilities requiring attention.
- AI-generated practical recommendations.
- Privacy-conscious processing without sending raw student comments or direct student identifiers.

---

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript (ES Modules)

### Backend and Serverless Functions
- Node.js
- Netlify Functions
- Firebase Cloud Functions (development and emulator backend)
- Firebase Admin SDK

### Database and Authentication
- Firebase Authentication
- Cloud Firestore

### AI Integration
- BharatCode AI API
- Qwen 3.8 27B model

### Hosting and Development Tools
- Netlify
- Firebase Emulator Suite
- Visual Studio Code
- Git and GitHub

---

## System Architecture

Anonymous Campus follows a client-server architecture.

1. **Student Interface:** Students interact with the application through a web interface built using HTML, CSS and JavaScript.
2. **Authentication:** Firebase Authentication handles student and administrator sign-in.
3. **Backend Processing:** Server-side functions validate requests, enforce permissions, process feedback and manage account actions.
4. **Database:** Cloud Firestore stores feedback, facility information, account notices, submission records and appeal information.
5. **AI Processing:** BharatCode AI analyses aggregated facility data and generates recommendations.
6. **Administrator Dashboard:** Authorized administrators access feedback statistics, recent submissions, facility issues and AI-generated insights.

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
 Server-side Functions
          |
          v
     Cloud Firestore
          |
          v
   BharatCode AI
 (Aggregate Data Only)
          |
          v
 Administrator Insights
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
git clone https://github.com/rohitjee7022-blip/Anonymous-Campus.git
cd Anonymous-Campus
```

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
- Demo administrator credentials are shared separately when required and are not published in this repository.

---

## Project Status

Anonymous Campus is a publicly deployed web application. Its production website is hosted on Netlify and uses Firebase Authentication and Cloud Firestore.

**Live Website:** https://anonymous-campus-test.netlify.app

### Implemented Features

- Student registration, login and logout.
- College email verification and student eligibility checks.
- Feedback submission for six campus facilities.
- Weekly submission limits and duplicate prevention.
- Automatic masking of recognised inappropriate language.
- Facility feedback statistics with a minimum response threshold.
- Automatic facility issue creation and report counting from low ratings.
- Administrator dashboard and feedback comment moderation.
- Facility issue tracking and status updates.
- Student warnings and seven-day suspensions.
- Student sanction appeals and administrator appeal review.
- Backend authentication and authorization checks.
- Private account notices and suspension expiry handling.
- AI-powered Facility Insights.
- Privacy-conscious administrative reporting.

### Deployment

- Frontend hosted on Netlify.
- Production server-side functions deployed through Netlify Functions.
- Firebase Authentication used for authentication.
- Cloud Firestore used for application data.
- BharatCode AI integration used for generating facility improvement recommendations.

### Future Improvements

- Further separation of feedback and account records.
- Expanded security and edge-case testing.
- Improved accessibility and mobile responsiveness.
- Enhanced administrative reporting and analytics.
- Additional testing and performance improvements.

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

1. Students submit facility feedback.
2. Backend functions calculate aggregate statistics.
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
- Model: Qwen 3.8 27B
- API: BharatCode Responses API

AI-generated recommendations support administrative decision-making; final decisions remain with human administrators.

---

## Live Website

**Project URL:** https://anonymous-campus-test.netlify.app

The website is publicly accessible. Students and administrators must still authenticate to access their respective dashboards.

---

## Instructions for Judges

### 1. Open the Website

Visit:

https://anonymous-campus-test.netlify.app

### 2. Admin Dashboard

- Open the Admin Login page.
- Use the demo administrator Gmail credentials if requested by the organizers.
- After logging in, judges can explore:
  - Facility Overview
  - Recent Student Feedback
  - Privacy-reviewed facility issues
  - Feedback moderation
  - Student account actions and appeals
  - AI-powered Facility Insights

### 3. Student Dashboard

- Open the Student Login / Registration page.
- Student access requires an eligible, verified IIIT Sonepat college email address.
- After logging in, students can explore the facility feedback system and submit feedback.

### 4. AI Facility Insights

- Log in using the demo administrator account.
- Open the Admin Dashboard.
- Click **Generate AI Insights**.
- Review AI-generated recommendations based on aggregated facility feedback.

### Important Notes

- Admin demo credentials will be shared separately if requested by the organizers.
- Student accounts must meet college email and eligibility requirements.
- Student identities are protected in the administrative feedback view.
- Passwords and private API credentials are never published in this repository.

---

## Project Objective

Anonymous Campus aims to provide students with a safer channel for expressing concerns, while helping administrators identify recurring problems and make informed decisions about campus improvements.

**Speak honestly. Stay protected. Improve together.**
