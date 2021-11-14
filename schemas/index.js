import * as Yup from 'yup';

export const VALIDATION_ERROR = 'ValidationError';

const AccountSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .trim()
    .required('Required'),
});

export const validateAccount = async (req, res, next) => {
  let { account } = req.body;
  try {
    account = await AccountSchema.validate(account);
    req.body.account = account;
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};

const MessageSchema = Yup.object().shape({
  text: Yup.string()
    .trim()
    .required('Required'),
  to: Yup.string()
    .trim()
    .required('Required'),
});

export const validateMessage = async (req, res, next) => {
  let { message } = req.body;
  try {
    message = await MessageSchema.validate(message);
    req.body.message = message;
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};

const UserSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Too Short!')
    .max(128, 'Too Long!'),
  birthdate: Yup.string()
    .min(2, 'Too Short!')
    .max(128, 'Too Long!'),
});

export const validateUpdateUser = async (req, res, next) => {
  let { user } = req.body || {};
  console.log(user);
  try {
    user = await UserSchema.validate(user);
    req.body.user = user;
    next();
  } catch (e) {
    res.send(400).json({});
  }
};
