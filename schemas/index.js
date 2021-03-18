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
