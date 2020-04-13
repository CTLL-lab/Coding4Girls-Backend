import { Router } from 'express';
import { hashString } from '../includes/hashing';
import { check } from 'express-validator/check';
import { validateRequest } from '../includes/validation';
import { ErrorResponse, SuccessResponse } from '../models/response';
import { getDBClient } from '../includes/db';
import {
  createNewUser,
  findUserByUsernameOrEmail,
  activateUser
} from '../models/user';
var router = Router();

router.post(
  '/',
  [
    check('username').exists(),
    check('password').exists(),
    check('email').optional(),
    check('fname').optional(),
    check('lname').optional(),
    check('code').optional()
  ],
  validateRequest,
  async (req, res) => {
    let role = 'student';
    let email = null;
    if (req.query.l == 'web') {
      if (req.body.code != 'C4G TEACHER') {
        res.sendStatus(426);
        return;
      } else {
        role = 'teacher';
        email = req.body.email;
        if (!email) {
          res.sendStatus(400);
          return;
        }
      }
    } else if (req.query.l != 'unity') {
      res.sendStatus(401);
      return;
    }

    let passwordHash: string;
    try {
      passwordHash = hashString(req.body.password);
    } catch (err) {
      console.log(err);
      res.status(500).json(new ErrorResponse('REGISTER0'));
    }
    try {
      const queryResult = await createNewUser(
        req.body.username,
        passwordHash,
        req.body.fname,
        req.body.lname,
        role,
        email
      );
      if (queryResult) {
        const response = new SuccessResponse();
        res.status(200).json(response);
      }
    } catch (err) {
      console.log(err);
      if (err.routine == '_bt_check_unique') {
        const response = new ErrorResponse('REGISTER1');
        // values the duplicate can take:
        //    username
        //    email
        response.data['duplicate'] = err.constraint;
        res.status(409).json(response);
      } else {
        res.status(500).json(new ErrorResponse('REGISTER2'));
      }
    }
  }
);

router.get('/activate', async (req, res) => {
  const email = req.query['email'];
  const activation_token = req.query['activation_token'];
  if (email == undefined || activation_token == undefined) {
    res.status(400).send();
    return;
  }
  const user = await findUserByUsernameOrEmail(email);
  const userActivated = await activateUser(user.id, activation_token);
  if (userActivated) {
    res.status(200);
  } else {
    res.status(404);
  }
  res.send();
});

module.exports = router;
