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

module.exports = { calculateMajorSubjectGwa, withMajorSubjectGwa };
