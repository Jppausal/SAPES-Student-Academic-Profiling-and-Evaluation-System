const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildStudentSearchFilter = (query) => {
  const escapedQuery = escapeRegex(query);
  const matchingText = new RegExp(escapedQuery, 'i');
  const matchingIdPrefix = new RegExp(`^${escapedQuery}`, 'i');

  return {
    $or: [
      { institutionId: matchingIdPrefix },
      { username: matchingText },
      { 'personalInformation.firstName': matchingText },
      { 'personalInformation.lastName': matchingText },
      {
        $expr: {
          $regexMatch: {
            input: {
              $concat: [
                { $ifNull: ['$personalInformation.firstName', ''] },
                ' ',
                { $ifNull: ['$personalInformation.lastName', ''] }
              ]
            },
            regex: escapedQuery,
            options: 'i'
          }
        }
      }
    ]
  };
};

module.exports = { buildStudentSearchFilter, escapeRegex };
