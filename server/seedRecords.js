require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const AcademicRecord = require('./models/AcademicRecord');

async function run() {
  try {
    await mongoose.connect("mongodb://localhost:27017/sapes_dev");
    
    // Find the student by institutionId or learnerReferenceNo etc. 
    // The field in Student schema might be inside personalInformation or enrollmentInformation.
    // Let's search broadly just in case.
    const student = await Student.findOne({ 'enrollmentInformation.institutionId': '2401105814' }) || 
                    await Student.findOne({ 'studentId': '2401105814' }) || 
                    await Student.findOne(); // Fallback if schema differs slightly, but we really want 2401105814
                    
    const targetStudent = await Student.findOne({ 'enrollmentInformation.institutionId': '2401105814' });
    if (!targetStudent) {
        console.log('Student not found! Looking up by string 2401105814 anywhere...');
        const all = await Student.find({});
        for(let s of all) {
            if (JSON.stringify(s).includes('2401105814')) {
                console.log('Found student with ID:', s._id);
                await addRecords(s._id);
                return;
            }
        }
        console.log('Could not find student 2401105814');
        process.exit(1);
    }
    
    await addRecords(targetStudent._id);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

async function addRecords(studentId) {
    await AcademicRecord.deleteMany({ studentId }); // clear existing for clean test
    
    // 1st Year, 1st Sem
    await AcademicRecord.create({
      studentId,
      academicYear: '2024-2025',
      semester: '1st Semester',
      subjects: [
        { subjectCode: 'IT111', subjectName: 'Introduction to Computing', units: 3, grade: 1.5, isMajor: true, status: 'Passed' },
        { subjectCode: 'IT112', subjectName: 'Computer Programming 1', units: 3, grade: 1.25, isMajor: true, status: 'Passed' },
        { subjectCode: 'GE111', subjectName: 'Understanding the Self', units: 3, grade: 1.75, isMajor: false, status: 'Passed' }
      ]
    });
  
    // 1st Year, 2nd Sem
    await AcademicRecord.create({
      studentId,
      academicYear: '2024-2025',
      semester: '2nd Semester',
      subjects: [
        { subjectCode: 'IT121', subjectName: 'Computer Programming 2', units: 3, grade: 1.5, isMajor: true, status: 'Passed' },
        { subjectCode: 'IT122', subjectName: 'Data Structures and Algorithms', units: 3, grade: 1.75, isMajor: true, status: 'Passed' },
        { subjectCode: 'GE121', subjectName: 'Readings in Philippine History', units: 3, grade: 1.5, isMajor: false, status: 'Passed' }
      ]
    });
    
    // 2nd Year, 1st Sem
    await AcademicRecord.create({
      studentId,
      academicYear: '2025-2026',
      semester: '1st Semester',
      subjects: [
        { subjectCode: 'IT211', subjectName: 'Object Oriented Programming', units: 3, grade: 1.0, isMajor: true, status: 'Passed' },
        { subjectCode: 'IT212', subjectName: 'Database Management Systems 1', units: 3, grade: 1.25, isMajor: true, status: 'Passed' },
        { subjectCode: 'GE211', subjectName: 'Mathematics in the Modern World', units: 3, grade: 2.0, isMajor: false, status: 'Passed' }
      ]
    });
    
    // 2nd Year, 2nd Sem
    await AcademicRecord.create({
      studentId,
      academicYear: '2025-2026',
      semester: '2nd Semester',
      subjects: [
        { subjectCode: 'IT221', subjectName: 'Information Management', units: 3, grade: 1.5, isMajor: true, status: 'Passed' },
        { subjectCode: 'IT222', subjectName: 'Systems Integration and Architecture', units: 3, grade: 1.75, isMajor: true, status: 'Passed' },
        { subjectCode: 'GE221', subjectName: 'Purposive Communication', units: 3, grade: 1.25, isMajor: false, status: 'Passed' }
      ]
    });
    
    console.log('Successfully added 4 terms of records for 3rd year student.');
}

run();
