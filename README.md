# Faculty Feedback System

A comprehensive web portal for managing faculty performance feedback from students at Somaiya University. This system enables students to submit feedback, allows faculty to view their reports, and provides administrators with tools to manage forms, users, and analytics.

## Features

### 🎓 For Students
- **Dashboard**: View assigned feedback forms based on semester, course, division, and batch
- **Feedback Submission**: Submit ratings and comments for faculty members
- **Multiple Question Types**: Support for Yes/No, 3-option scale (Need improvement/Satisfactory/Good), and 1-10 rating scales
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop devices

### 👨‍🏫 For Faculty
- **Dashboard**: View assigned subjects and feedback statistics
- **Individual Reports**: Access detailed analytics for each subject including:
  - Question-wise ratings with visual progress bars
  - Student comments
  - Overall average ratings
  - Response counts
- **Role-based Access**: Can only view reports for their own forms

### 👨‍💼 For Administrators
- **Generate Forms**: Create feedback forms for divisions or batches
  - Manual entry or CSV bulk import
  - Support for both theory and lab forms
- **User Management**: 
  - Manage students, faculty, and admin users
  - Bulk CSV import for students and faculty
  - Upsert functionality (update existing or create new)
- **Feedback Monitoring**: 
  - View all feedback forms
  - Monitor response counts (X / Y format showing responses vs total students)
  - Filter by semester, course, and division
  - Bulk delete capabilities
- **Form Editor**: 
  - Customize feedback questions
  - Separate configurations for theory and lab forms
  - Support for multiple question types
  - Reset to default questions
- **Reports & Analytics**:
  - View faculty performance across all subjects
  - Detailed analytics per faculty member
  - Rankings and statistics

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MySQL with Prisma ORM
- **Authentication**: Firebase Authentication (Google Sign-In)
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components

## Prerequisites

- Node.js 18+ and npm/yarn
- MySQL database
- Firebase project with Authentication enabled (Google Sign-In)
- Environment variables configured (see Setup)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Faculty Feedback System"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/database_name"
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Run the development server**
```bash
npm run dev
```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard and management pages
│   ├── api/               # API routes
│   ├── faculty/           # Faculty dashboard and pages
│   ├── student/           # Student dashboard and pages
│   └── report/            # Report viewing pages
├── components/            # Reusable React components
├── contexts/              # React context providers
├── lib/                   # Utility functions and configurations
├── prisma/                # Database schema and migrations
└── public/                # Static assets

```

## Database Schema

The system uses the following main models:
- **users**: Authentication and role management
- **students**: Student information (semester, course, division, batch)
- **faculty**: Faculty member details
- **feedback_forms**: Generated feedback forms
- **feedback_parameters**: Question templates
- **form_questions**: Questions snapshot for each form
- **feedback_responses**: Student submissions
- **feedback_response_items**: Individual question responses

## Key Features & Implementation

### Performance Optimizations
- **Server-side filtering**: Forms and responses are filtered on the server to reduce payload sizes
- **Database indexing**: Optimized indexes for common queries (semester, course, division, faculty_email)
- **Progressive loading**: Pagination for large lists (20 items per page)

### Data Management
- **Upsert functionality**: Students and faculty can be updated if they already exist (based on email)
- **Bulk operations**: CSV import for students and faculty
- **Response counting**: Accurate student count calculation for theory forms (all students in division) and lab forms (specific batch)

### Rating System
- **Normalized ratings**: All ratings converted to 0-10 scale for consistent comparison
  - Yes/No: Yes = 10, No = 0
  - 3-option scale: Need improvement = 3.3, Satisfactory = 6.6, Good = 10
  - 1-10 scale: Direct mapping

### Responsive Design
- Fully responsive layouts for all pages
- Mobile-first approach with card-based layouts on small screens
- Optimized for various screen sizes (mobile, tablet, desktop)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Security

- **Role-based access control**: Users can only access pages appropriate for their role
- **Email-based authentication**: All users must sign in with their institutional email
- **Protected routes**: API routes and pages verify user authentication and roles
- **Form access control**: Faculty can only view reports for their own forms

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private project for Somaiya University.

## Support

For issues or questions, please contact the development team.

