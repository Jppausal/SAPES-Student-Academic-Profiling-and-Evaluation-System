const calculateSubjectGwa = (academicRecords, includeSubject) => {
  const includedSubjects = academicRecords.flatMap((record) =>
    record.subjects.filter((subject) =>
      includeSubject(subject) &&
      String(subject.status || '').toLowerCase() !== 'dropped' &&
      typeof subject.grade === 'number' &&
      subject.grade > 0 &&
      subject.units > 0
    )
  );
  const totalUnits = includedSubjects.reduce((sum, subject) => sum + subject.units, 0);

  return totalUnits === 0
    ? 0
    : Number((
      includedSubjects.reduce((sum, subject) => sum + subject.grade * subject.units, 0) /
      totalUnits
    ).toFixed(2));
};

const calculateMajorSubjectGwa = (academicRecords) => calculateSubjectGwa(
  academicRecords,
  (subject) => subject.isMajor
);

const calculateOverallGwa = (academicRecords) => calculateSubjectGwa(
  academicRecords,
  () => true
);

const withAcademicGwas = (academicRecords) => academicRecords.map((record) => ({
  ...record,
  overallGwa: calculateOverallGwa([record]),
  majorSubjectGwa: calculateMajorSubjectGwa([record])
}));

const withMajorSubjectGwa = withAcademicGwas;

const semesterRank = (semester) => ({
  '1st semester': 1,
  '2nd semester': 2,
  summer: 3,
  midyear: 3
}[String(semester || '').trim().toLowerCase()] || 0);

const academicYearRank = (academicYear) => {
  const firstYear = Number.parseInt(String(academicYear || '').split('-')[0], 10);
  return Number.isFinite(firstYear) ? firstYear : 0;
};

const getLatestAcademicPeriod = (academicRecords) => {
  const latestRecord = academicRecords.reduce((latest, record) => {
    if (!latest) return record;
    const yearDifference = academicYearRank(record.academicYear) - academicYearRank(latest.academicYear);
    if (yearDifference !== 0) return yearDifference > 0 ? record : latest;
    return semesterRank(record.semester) > semesterRank(latest.semester) ? record : latest;
  }, null);

  return latestRecord ? {
    academicYear: latestRecord.academicYear,
    semester: latestRecord.semester,
    overallGwa: calculateOverallGwa([latestRecord]),
    majorSubjectGwa: calculateMajorSubjectGwa([latestRecord])
  } : null;
};

module.exports = {
  calculateMajorSubjectGwa,
  calculateOverallGwa,
  withAcademicGwas,
  withMajorSubjectGwa,
  getLatestAcademicPeriod
};
