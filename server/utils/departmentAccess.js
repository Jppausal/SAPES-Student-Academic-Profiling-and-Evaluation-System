const DEPARTMENTS = [
  {
    code: 'IT',
    name: 'Information Technology',
    program: 'Bachelor of Information Technology'
  },
  {
    code: 'EMC',
    name: 'Entertainment and Multimedia Computing',
    program: 'Entertainment and Multimedia Computing'
  },
  {
    code: 'ELECTRONICS',
    name: 'Electronics',
    program: 'Electronics'
  },
  {
    code: 'FOODTECH',
    name: 'Food Technology',
    program: 'Food Technology'
  },
  {
    code: 'AUTOMOTIVE',
    name: 'Automotive Technology',
    program: 'Automotive Technology'
  }
];

const getEnrollmentOfficerDepartment = (user) => {
  if (!user?.isVerifiedEnrollmentOfficer) return undefined;
  const code = typeof user.departmentCode === 'string' ? user.departmentCode.trim().toUpperCase() : '';
  return DEPARTMENTS.find((department) => department.code === code) || null;
};

const buildStudentDepartmentFilter = (user, filter = {}) => {
  const department = getEnrollmentOfficerDepartment(user);
  if (department === undefined) return filter;
  if (!department) return null;
  return {
    $and: [
      filter,
      { 'classification.program': department.program }
    ]
  };
};

const studentBelongsToDepartment = (user, student) => {
  const department = getEnrollmentOfficerDepartment(user);
  if (department === undefined) return true;
  return Boolean(department && student?.classification?.program === department.program);
};

module.exports = {
  DEPARTMENTS,
  buildStudentDepartmentFilter,
  getEnrollmentOfficerDepartment,
  studentBelongsToDepartment
};
