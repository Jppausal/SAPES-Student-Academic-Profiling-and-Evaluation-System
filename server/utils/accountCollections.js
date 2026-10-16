const AdminUser = require('../models/AdminUser');
const FacultyUser = require('../models/FacultyUser');
const Student = require('../models/Student');

const ACCOUNT_MODELS = {
  admin: AdminUser,
  faculty: FacultyUser,
  student: Student
};

const getAccountModel = (role) => ACCOUNT_MODELS[role] || null;
const getAccountModelName = (role) => ({
  admin: 'AdminUser',
  faculty: 'FacultyUser',
  student: 'Student'
}[role] || null);

const findAccountById = (userId, role) => {
  const AccountModel = getAccountModel(role);
  return AccountModel ? AccountModel.findById(userId) : null;
};

const findAccountByIdentifier = async (
  identifier,
  fields = ['email', 'username'],
  select = ''
) => {
  const normalizedIdentifier = identifier.trim();
  const normalizedLower = normalizedIdentifier.toLowerCase();
  const query = {
    $or: fields.flatMap((field) => field === 'email'
      ? [{ email: normalizedLower }]
      : field === 'username'
        ? [{ username: normalizedIdentifier }, { username: normalizedLower }]
        : [{ [field]: normalizedIdentifier }])
  };
  const matches = (await Promise.all(
    Object.entries(ACCOUNT_MODELS).map(async ([role, AccountModel]) => {
      let accountQuery = AccountModel.findOne(query);
      if (select && typeof accountQuery.select === 'function') {
        accountQuery = accountQuery.select(select);
      }
      return { role, account: await accountQuery };
    })
  )).filter(({ account }) => account);

  if (matches.length > 1) return { account: null, role: null, ambiguous: true };
  if (matches.length === 0) return { account: null, role: null, ambiguous: false };

  const [{ account, role }] = matches;
  return { account, role, ambiguous: false };
};

const findAccountByGoogleId = async (googleId) => {
  const matches = (await Promise.all(
    Object.entries(ACCOUNT_MODELS).map(async ([role, AccountModel]) => ({
      role,
      account: await AccountModel.findOne({ googleId })
    }))
  )).filter(({ account }) => account);

  if (matches.length > 1) return { account: null, role: null, ambiguous: true };
  if (matches.length === 0) return { account: null, role: null, ambiguous: false };

  const [{ account, role }] = matches;
  return { account, role, ambiguous: false };
};

const findAccountByIdAcrossRoles = async (userId) => {
  const matches = (await Promise.all(
    Object.entries(ACCOUNT_MODELS).map(async ([role, AccountModel]) => ({
      role,
      account: await AccountModel.findById(userId)
    }))
  )).filter(({ account }) => account);

  if (matches.length > 1) return { account: null, role: null, ambiguous: true };
  if (matches.length === 0) return { account: null, role: null, ambiguous: false };

  const [{ account, role }] = matches;
  return { account, role, ambiguous: false };
};

module.exports = {
  ACCOUNT_MODELS,
  findAccountByGoogleId,
  findAccountById,
  findAccountByIdAcrossRoles,
  findAccountByIdentifier,
  getAccountModel,
  getAccountModelName
};
