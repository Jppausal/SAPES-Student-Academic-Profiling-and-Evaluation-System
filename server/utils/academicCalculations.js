const calculateMajorSubjectGwa = (academicRecords) => {
  const majorSubjects = academicRecords.flatMap((record) =>
    record.subjects.filter((subject) =>
      subject.isMajor &&
      String(subject.status || '').toLowerCase() !== 'dropped' &&
      typeof subject.grade === 'number' &&
      subject.grade > 0 &&
      subject.units > 0
    )
  );
  const totalMajorUnits = majorSubjects.reduce((sum, subject) => sum + subject.units, 0);

  return totalMajorUnits === 0
    ? 0
    : Number((
      majorSubjects.reduce((sum, subject) => sum + subject.grade * subject.units, 0) /
      totalMajorUnits
    ).toFixed(2));
};

const withMajorSubjectGwa = (academicRecords) => academicRecords.map((record) => ({
  ...record,
  majorSubjectGwa: calculateMajorSubjectGwa([record])
}));

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
    majorSubjectGwa: calculateMajorSubjectGwa([latestRecord])
  } : null;
};

module.exports = { calculateMajorSubjectGwa, withMajorSubjectGwa, getLatestAcademicPeriod };
