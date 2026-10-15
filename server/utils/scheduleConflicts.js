const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const isTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

const validateActivities = (items) => {
  if (!Array.isArray(items) || items.length > 10) return { error: 'religiousInformation.spiritualActivities must contain up to 10 activities' };
  const value = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some((key) => !['dayOfWeek', 'startTime', 'endTime'].includes(key))) return { error: 'Each spiritual activity must contain only dayOfWeek, startTime, and endTime' };
    if (!DAYS.includes(item.dayOfWeek) || !isTime(item.startTime) || !isTime(item.endTime) || minutes(item.startTime) >= minutes(item.endTime)) return { error: 'Each spiritual activity must have a valid day and time range' };
    value.push({ dayOfWeek: item.dayOfWeek, startTime: item.startTime, endTime: item.endTime });
  }
  return { value };
};

const findScheduleConflicts = (activities, meetings) => (meetings || []).flatMap((meeting) =>
  (activities || []).filter((activity) => activity.dayOfWeek === meeting.dayOfWeek && minutes(meeting.startTime) < minutes(activity.endTime) && minutes(activity.startTime) < minutes(meeting.endTime)).map((activity) => ({ meeting, restriction: activity }))
);

module.exports = { DAYS, isTime, validateActivities, findScheduleConflicts };
