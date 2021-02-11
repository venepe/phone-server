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

const InvitationVerifySchema = Yup.object().shape({
  invitation: Yup.string()
    .trim()
    .required('Required'),
});

export const validateInvitationVerify = async (req, res, next) => {
  let { verify } = req.body;
  try {
    verify = await InvitationVerifySchema.validate(verify);
    req.body.verify = verify;
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};

const UserPublicKeySchema = Yup.object().shape({
  publicKey: Yup.string()
    .trim()
    .required('Required'),
});

export const validateUserPulbicKey = async (req, res, next) => {
  let { user } = req.body;
  try {
    user = await UserPublicKeySchema.validate(user);
    req.body.user = user;
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};

const OwnerSchema = Yup.object().shape({
  invitation: Yup.string()
    .trim()
    .required('Required'),
});

export const validateOwner = async (req, res, next) => {
  let { owner } = req.body;
  try {
    owner = await OwnerSchema.validate(owner);
    req.body.owner = owner;
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};
