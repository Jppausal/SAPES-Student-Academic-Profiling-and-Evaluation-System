# BukSU Google Authentication Guide

## Overview

Your SAPES system is configured to allow **only BukSU institutional Google accounts** to sign in. This ensures that only authorized university members can access the system.

## Allowed Email Domains

The system accepts Google accounts from these domains only:
- `@student.buksu.edu.ph` - For students
- `@buksu.edu.ph` - For faculty and admin

Any other Google account domain will be **rejected**.

---

## How It Works

### For Students (`*@student.buksu.edu.ph`)

#### First-Time Login
1. Student clicks "Continue with Google"
2. Student selects their institutional account (e.g., `2021301234@student.buksu.edu.ph`)
3. System validates:
   - ✅ Email domain is `student.buksu.edu.ph`
   - ✅ Email format matches pattern: `[student-number]@student.buksu.edu.ph`
   - ✅ Google account is verified by Google
4. System automatically:
   - Creates a user account with role `student`
   - Extracts student number from email (e.g., `2021301234`)
   - Creates or links a Student profile with this institution ID
   - Generates authentication token
5. Student is logged in and can access the student portal

#### Subsequent Logins
1. System finds existing user by Google ID
2. Verifies:
   - ✅ Account is active
   - ✅ Email still matches `*@student.buksu.edu.ph` format
   - ✅ Student record exists and is linked
3. Student is logged in immediately

---

### For Faculty/Admin (`*@buksu.edu.ph`)

#### First-Time Login
1. **Admin must pre-create the account** via the admin panel
   - Username should be the user's BukSU email (e.g., `faculty.name@buksu.edu.ph`)
   - Role should be set to `faculty` or `admin`
   - Status should be `active`

2. Faculty/Admin clicks "Continue with Google"
3. Faculty/Admin selects their institutional account (e.g., `faculty.name@buksu.edu.ph`)
4. System validates:
   - ✅ Email domain is `buksu.edu.ph`
   - ✅ Account exists in the database
   - ✅ Account role is NOT `student`
   - ✅ Account status is `active`
5. System links the Google ID to the existing account
6. Faculty/Admin is logged in

#### Subsequent Logins
1. System finds existing user by Google ID
2. Verifies account is active
3. Faculty/Admin is logged in immediately

---

## Security Features

### Domain Validation
```javascript
// Only these domains are allowed
const GOOGLE_ALLOWED_DOMAINS = new Set([
  'buksu.edu.ph', 
  'student.buksu.edu.ph'
]);
```

The system checks the `hd` (hosted domain) parameter from Google's ID token to ensure the account belongs to BukSU.

### Email Format Validation
- **Students**: Must match `[numbers]@student.buksu.edu.ph`
- **Faculty/Admin**: Must match `*@buksu.edu.ph` (but cannot be student format)

### Account Status Checks
- Only `active` accounts can log in
- `inactive` and `suspended` accounts are blocked

### Role Protection
- Student emails (`*@student.buksu.edu.ph`) can only be used with `student` role
- Faculty/Admin emails (`*@buksu.edu.ph`) cannot be used with `student` role
- Prevents privilege escalation

---

## Configuration

### Backend (`server/.env`)
```env
GOOGLE_CLIENT_ID=431074112550-9gj2c8ahidi7lua4ioef6jp4gj4icuau.apps.googleusercontent.com
```

### Frontend (`client/.env.local`)
```env
VITE_GOOGLE_CLIENT_ID=431074112550-9gj2c8ahidi7lua4ioef6jp4gj4icuau.apps.googleusercontent.com
```

### Google Cloud Console Setup
Your Google OAuth client should be configured with:
- **Authorized JavaScript origins**:
  - `http://localhost:5173` (development)
  - `http://localhost:5000` (development)
  - Your production domain (e.g., `https://sapes.buksu.edu.ph`)

- **Authorized redirect URIs**:
  - `http://localhost:5173` (development)
  - Your production domain (e.g., `https://sapes.buksu.edu.ph`)

---

## User Experience Flow

### Student First-Time Sign Up
```
1. Visit login page
2. Click "Continue with Google"
3. Select BukSU student account (2021301234@student.buksu.edu.ph)
4. ✅ Account created automatically
5. ✅ Student profile created with institution ID: 2021301234
6. ✅ Logged in to student portal
```

### Faculty/Admin First-Time Sign Up
```
1. Admin creates account in admin panel:
   - Username: faculty.name@buksu.edu.ph
   - Role: faculty
   - Status: active

2. Faculty visits login page
3. Click "Continue with Google"
4. Select BukSU account (faculty.name@buksu.edu.ph)
5. ✅ Google ID linked to existing account
6. ✅ Logged in to faculty portal
```

---

## Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Google account verification failed" | Email domain is not `buksu.edu.ph` or `student.buksu.edu.ph` | Use your BukSU institutional account |
| "Student Google account must use the institutional student email format" | Student trying to use non-student email | Use your `[student-number]@student.buksu.edu.ph` email |
| "Google account is not linked to the matching student record" | Student record doesn't exist or isn't linked | Contact admin to verify student record |
| "Student Google accounts cannot use a non-student SAPES role" | Student email used with faculty/admin account | Use correct account type |
| "The linked SAPES account is not a student account" | Student record linked to non-student user | Contact admin to fix account linkage |
| "Google account must be provisioned by an administrator before sign-in" | Faculty/Admin account not pre-created | Contact admin to create your account first |
| "Account is not active" | Account status is `inactive` or `suspended` | Contact admin to activate your account |

---

## Testing the System

### Test as Student
1. Ensure you have a BukSU student email: `[student-number]@student.buksu.edu.ph`
2. Go to login page
3. Click "Continue with Google"
4. Sign in with student account
5. System should create account automatically and log you in

### Test as Faculty
1. Admin creates account via admin panel
2. Go to login page
3. Click "Continue with Google"
4. Sign in with faculty account (`*@buksu.edu.ph`)
5. System should link Google ID and log you in

---

## Troubleshooting

### "Google sign-in is not configured"
- Check `client/.env.local` has `VITE_GOOGLE_CLIENT_ID`
- Check `server/.env` has `GOOGLE_CLIENT_ID`
- Restart both frontend and backend servers

### "Google account verification failed"
- Verify the email domain is exactly `buksu.edu.ph` or `student.buksu.edu.ph`
- Check Google Cloud Console: ensure client ID matches
- Check Google Cloud Console: ensure your origin URL is authorized

### Students can't log in
- Verify email format: `[numbers]@student.buksu.edu.ph`
- Ensure no existing account conflicts with different role

### Faculty can't log in
- Verify admin has created account first
- Verify username matches Google email
- Verify account status is `active`
- Verify role is `faculty` or `admin` (not `student`)

---

## Production Deployment Checklist

- [ ] Update Google Cloud Console with production domain
- [ ] Add production domain to Authorized JavaScript origins
- [ ] Add production domain to Authorized redirect URIs
- [ ] Update `client/.env.production` with production Google Client ID
- [ ] Update `server/.env` with production Google Client ID
- [ ] Test login with actual BukSU Google accounts
- [ ] Verify non-BukSU accounts are rejected
- [ ] Set up SSL/HTTPS for production domain

---

## Code Reference

### Backend Authentication Logic
File: [`server/routes/authRoutes.js`](../server/routes/authRoutes.js)

Key sections:
- **Lines 10-11**: Domain whitelist
- **Lines 103-263**: Google authentication handler
- **Line 140**: Domain validation check
- **Lines 151-228**: Student account handling
- **Lines 229-245**: Faculty/Admin account handling

### Frontend Google Button
File: [`client/src/pages/auth/LoginPage.tsx`](../client/src/pages/auth/LoginPage.tsx)

Key sections:
- **Lines 17-67**: Google Sign-In initialization
- **Lines 28-39**: Google button configuration
- **Line 37**: `hd: '*'` allows Google to filter by hosted domain

---

## Summary

✅ Your system is **already configured** to accept only BukSU institutional accounts

✅ Students can **self-register** using their `[student-number]@student.buksu.edu.ph` email

✅ Faculty/Admin must be **pre-provisioned** by an admin before first Google login

✅ All accounts are validated against BukSU domains

✅ No external or personal Google accounts can access the system
