const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Student = require('../models/Student');

const STUDENTS = [
  {
    institutionId: '2021301234',
    password: 'student123',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: '2021301234@student.buksu.edu.ph'
  },
  {
    institutionId: '2021305678',
    password: 'student123',
    firstName: 'Maria',
    lastName: 'Santos',
    email: '2021305678@student.buksu.edu.ph'
  },
  {
    institutionId: '2022401234',
    password: 'student123',
    firstName: 'Pedro',
    lastName: 'Reyes',
    email: '2022401234@student.buksu.edu.ph'
  },
  {
    institutionId: '2022405678',
    password: 'student123',
    firstName: 'Ana',
    lastName: 'Garcia',
    email: '2022405678@student.buksu.edu.ph'
  },
  {
    institutionId: '2023501234',
    password: 'student123',
    firstName: 'Jose',
    lastName: 'Ramos',
    email: '2023501234@student.buksu.edu.ph'
  }
];

const FACULTY = [
  {
    institutionId: '1234567890',
    password: 'faculty123',
    username: 'faculty.cruz@buksu.edu.ph',
    email: 'faculty.cruz@buksu.edu.ph'
  },
  {
    institutionId: '2345678901',
    password: 'faculty123',
    username: 'faculty.santos@buksu.edu.ph',
    email: 'faculty.santos@buksu.edu.ph'
  },
  {
    institutionId: '3456789012',
    password: 'faculty123',
    username: 'faculty.reyes@buksu.edu.ph',
    email: 'faculty.reyes@buksu.edu.ph'
  }
];

async function seedAccounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create student accounts
    console.log('\n=== Creating Student Accounts ===');
    for (const student of STUDENTS) {
      // Check if user already exists
      const existingUser = await User.findOne({ username: student.institutionId });
      if (existingUser) {
        console.log(`✓ Student ${student.institutionId} (${student.firstName} ${student.lastName}) already exists`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(student.password, 12);

      // Create user account
      const user = await User.create({
        username: student.institutionId,
        passwordHash,
        role: 'student',
        accountStatus: 'active'
      });

      // Create student profile
      await Student.create({
        userId: user._id,
        institutionId: student.institutionId,
        personalInformation: {
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email
        },
        classification: {
          studentType: 'regular'
        },
        academicStatus: {
          currentStatus: 'regular'
        }
      });

      console.log(`✓ Created student: ${student.institutionId} (${student.firstName} ${student.lastName})`);
      console.log(`  Email: ${student.email}`);
      console.log(`  Password: ${student.password}`);
    }

    // Create faculty accounts
    console.log('\n=== Creating Faculty Accounts ===');
    for (const faculty of FACULTY) {
      // Check if user already exists
      const existingUser = await User.findOne({ username: faculty.institutionId });
      if (existingUser) {
        console.log(`✓ Faculty ${faculty.institutionId} already exists`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(faculty.password, 12);

      // Create user account
      await User.create({
        username: faculty.institutionId,
        passwordHash,
        role: 'faculty',
        accountStatus: 'active'
      });

      console.log(`✓ Created faculty: ${faculty.institutionId}`);
      console.log(`  Email: ${faculty.email}`);
      console.log(`  Password: ${faculty.password}`);
    }

    console.log('\n=== Seeding Complete ===');
    console.log('\nYou can now log in with any of the following accounts:');
    console.log('\nSTUDENTS (ID Number / Password):');
    STUDENTS.forEach(s => {
      console.log(`  ${s.institutionId} / ${s.password} (${s.firstName} ${s.lastName})`);
    });
    console.log('\nFACULTY (ID Number / Password):');
    FACULTY.forEach(f => {
      console.log(`  ${f.institutionId} / ${f.password}`);
    });

  } catch (error) {
    console.error('Error seeding accounts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedAccounts();
