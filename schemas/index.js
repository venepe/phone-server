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
