const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');
const { connectCloudDatabase } = require('../utils/database');
const { DEPARTMENTS } = require('../utils/departmentAccess');
const { syncAllDepartmentMetrics } = require('../utils/departmentMetrics');

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
    institutionId: '2345678901',
    password: 'faculty123',
    firstName: 'Kurt',
    lastName: 'Santos',
    email: 'santos@faculty.buksu.edu.ph',
    departmentCode: 'IT'
  },
  {
    institutionId: '8748861739',
    password: 'faculty123',
    firstName: 'Irene',
    lastName: 'Valdez',
    email: 'irene.valdez@faculty.buksu.edu.ph',
    departmentCode: 'ELECTRONICS'
  },
  {
    institutionId: '4176486035',
    password: 'faculty123',
    firstName: 'Paolo',
    lastName: 'Mendoza',
    email: 'paolo.mendoza@faculty.buksu.edu.ph',
    departmentCode: 'FOODTECH'
  },
  {
    institutionId: '5244096723',
    password: 'faculty123',
    firstName: 'Bianca',
    lastName: 'Navarro',
    email: 'bianca.navarro@faculty.buksu.edu.ph',
    departmentCode: 'EMC'
  },
  {
    institutionId: '6642374793',
    password: 'faculty123',
    firstName: 'Rafael',
    lastName: 'Castillo',
    email: 'rafael.castillo@faculty.buksu.edu.ph',
    departmentCode: 'AUTOMOTIVE'
  }
];

async function seedAccounts() {
  try {
    console.log('Connecting to MongoDB...');
    await connectCloudDatabase();
    console.log('Connected to MongoDB');

    // Create student accounts
    console.log('\n=== Creating Student Accounts ===');
    for (const student of STUDENTS) {
      // Check if user already exists
      const existingStudent = await Student.findOne({ institutionId: student.institutionId });
      if (existingStudent) {
        console.log(`✓ Student ${student.institutionId} (${student.firstName} ${student.lastName}) already exists`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(student.password, 12);

      await Student.create({
        username: student.institutionId,
        institutionId: student.institutionId,
        email: student.email,
        passwordHash,
        role: 'student',
        accountStatus: 'active',
        personalInformation: {
          firstName: student.firstName,
          lastName: student.lastName
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
      const department = DEPARTMENTS.find((item) => item.code === faculty.departmentCode);
      if (!department) throw new Error(`No department configured for ${faculty.departmentCode}`);
      const passwordHash = await bcrypt.hash(faculty.password, 12);
      const officerFields = {
        username: faculty.institutionId,
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        email: faculty.email,
        employeeId: faculty.institutionId,
        department: department.name,
        departmentCode: department.code,
        designation: `${department.code}-Enrollment Officer`,
        isVerifiedEnrollmentOfficer: true,
        passwordHash,
        role: 'faculty',
        accountStatus: 'active'
      };
      const existingUser = await FacultyUser.findOne({ username: faculty.institutionId });
      if (existingUser) {
        Object.assign(existingUser, officerFields);
        await existingUser.save();
        console.log(`✓ Updated ${faculty.institutionId} as verified ${department.code} enrollment officer`);
        continue;
      }

      await FacultyUser.create(officerFields);

      console.log(`✓ Created faculty: ${faculty.institutionId}`);
      console.log(`  Email: ${faculty.email}`);
      console.log(`  Password: ${faculty.password}`);
    }

    await syncAllDepartmentMetrics();
    console.log('✓ Synchronized department student and enrollment metrics');

    console.log('\n=== Seeding Complete ===');
    console.log('\nYou can now log in with any of the following accounts:');
    console.log('\nSTUDENTS (ID Number / Password):');
    STUDENTS.forEach(s => {
      console.log(`  ${s.institutionId} / ${s.password} (${s.firstName} ${s.lastName})`);
    });
    console.log('\nFACULTY (ID Number / Password):');
    FACULTY.forEach((faculty) => {
      console.log(`  ${faculty.institutionId} / ${faculty.password} (${faculty.departmentCode}-Enrollment Officer)`);
    });

  } catch (error) {
    console.error('Error seeding accounts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedAccounts();
