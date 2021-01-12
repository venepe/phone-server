import * as Yup from 'yup';

export const validateProtected = async (req, res, next) => {
  let { userId } = req.user || {};
  if (userId && userId.length > 0) {
    next();
  } else {
    res.send(401).json({});
  }
};

const PhoneNumberSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .trim()
    .required('Required'),
});

export const validatePhoneNumber = async (req, res, next) => {
  let { phoneNumber } = req.body;
  try {
    phoneNumber = await PhoneNumberSchema.validate(phoneNumber);
    req.body.phoneNumber = phoneNumber;
    next();
  } catch (err) {
    req.dealValidationError = err;
    next();
  }
};

const InvitationSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .trim()
    .required('Required'),
});

export const validateInvitation = async (req, res, next) => {
  let { invitation } = req.body;
  try {
    invitation = await InvitationSchema.validate(invitation);
    req.body.invitation = invitation;
    next();
  } catch (err) {
    req.placeValidationError = err;
    next();
  }
};

const VoteSchema = Yup.object().shape({
  value: Yup.number()
    .min(-1)
    .max(1)
    .required('Required')
});

export const validateVote = async (req, res, next) => {
  let { vote } = req.body;
  try {
    vote = await VoteSchema.validate(vote);
    req.body.vote = vote;
    next();
  } catch (err) {
    req.answerValidationError = err;
    next();
  }
};

const UserSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Too Short!')
    .max(128, 'Too Long!')
    .required('Required')
    .trim()
});

export const validateUpdateUser = async (req, res, next) => {
  let { user } = req.body || {};
  try {
    user = await UserSchema.validate(user);
    req.body.user = user;
    next();
  } catch (e) {
    console.log(e);
    res.send(400).json({});
  }
};

const CommentSchema = Yup.object().shape({
  text: Yup.string()
    .min(1, 'Too Short!')
    .max(256, 'Too Long!')
    .required('Required')
    .trim()
});

export const validateComment = async (req, res, next) => {
  let { comment } = req.body || {};
  try {
    comment = await CommentSchema.validate(comment);
    req.body.comment = comment;
    next();
  } catch (e) {
    console.log(e);
    res.send(400).json({});
  }
};
