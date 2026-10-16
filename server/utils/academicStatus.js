const getAcademicStatus = (student) => {
  const academicStatus = student?.academicStatus || {};
  const currentStatus = academicStatus.currentStatus || 'Not recorded';
  const isOnProbation = academicStatus.isOnProbation === true || /probation/i.test(currentStatus);

  return {
    currentStatus,
    isOnProbation,
    probationReason: academicStatus.probationReason,
    statusRemarks: academicStatus.statusRemarks,
    effectiveDate: academicStatus.effectiveDate
  };
};

module.exports = { getAcademicStatus };
