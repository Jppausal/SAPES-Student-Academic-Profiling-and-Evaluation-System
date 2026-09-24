# Database Seeding Scripts

## Seed Accounts

This script creates test accounts for students and faculty with 10-digit ID numbers.

### Running the Script

```bash
cd server
npm run seed
```

### Created Accounts

#### Students (5 accounts)
All students use their **10-digit institution ID** as username for login.

| ID Number    | Password    | Name              | Email                              |
|-------------|-------------|-------------------|------------------------------------|
| 2021301234  | student123  | Juan Dela Cruz    | 2021301234@student.buksu.edu.ph   |
| 2021305678  | student123  | Maria Santos      | 2021305678@student.buksu.edu.ph   |
| 2022401234  | student123  | Pedro Reyes       | 2022401234@student.buksu.edu.ph   |
| 2022405678  | student123  | Ana Garcia        | 2022405678@student.buksu.edu.ph   |
| 2023501234  | student123  | Jose Ramos        | 2023501234@student.buksu.edu.ph   |

#### Faculty (3 accounts)
Faculty use their **10-digit institution ID** as username for login.

| ID Number    | Password    | Email                          |
|-------------|-------------|--------------------------------|
| 1234567890  | faculty123  | faculty.cruz@buksu.edu.ph     |
| 2345678901  | faculty123  | faculty.santos@buksu.edu.ph   |
| 3456789012  | faculty123  | faculty.reyes@buksu.edu.ph    |

### Login Instructions

1. Go to the login page
2. Enter the **ID Number** (10 digits)
3. Enter the password
4. Click "Login"

**Example for Student:**
- Student/ID Number: `2021301234`
- Password: `student123`

**Example for Faculty:**
- Student/ID Number: `1234567890`
- Password: `faculty123`

### Google Sign-In

These accounts can also link their Google accounts:
- **Students**: Must use their `[id]@student.buksu.edu.ph` email
- **Faculty**: Must use their institutional `@buksu.edu.ph` email

### Notes

- The script is idempotent - it won't create duplicate accounts if run multiple times
- All accounts are created with `active` status
- Students automatically get a profile with their personal information
- Passwords are securely hashed using bcrypt
