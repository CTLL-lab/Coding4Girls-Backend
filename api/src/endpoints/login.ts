import { jwtEncryptionKey } from '../config';
import * as jwt from 'jsonwebtoken';
import { Router } from 'express';
import { getDBClient } from '../includes/db';
import { SuccessResponse, ErrorResponse } from '../models/response';
import { checkStringAgainstHash, hashString } from '../includes/hashing';
import { check, oneOf } from 'express-validator/check';
import { validateRequest } from '../includes/validation';
import {
  updateLastSeenForUser,
  findUserByUsernameOrEmail,
  isUserActivated,
  hasUserResetPasswordToken,
  changeUserPasswordUsingEmailAndResetToken
} from '../models/user';
var router = Router();

router.post(
  '/',
  [
    check('username')
      .exists()
      .isString(),
    check('password')
      .exists()
      .isString()
  ],
  validateRequest,
  async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const user = await findUserByUsernameOrEmail(username);
    if (user == null) {
      res.status(404).send();
      return;
    }
    let UserActivated = await isUserActivated(user.id);
    if (!UserActivated) {
      // LOGIN1: User not activated
      const response = new ErrorResponse('LOGIN1');
      res.status(401).json(response);
      return;
    }
    const passwordsMatch = checkStringAgainstHash(password, user.password);
    if (passwordsMatch) {
      try {
        const token = await generateSignedToken(
          user.id,
          user.username,
          user.role
        );
        const response = new SuccessResponse();
        response.data = { token: token };
        updateLastSeenForUser(user.id);
        res.json(response);
        return;
      } catch {
        const response = new ErrorResponse('LOGIN0');
        res.status(500).json(response);
      }
    }
    res.status(401).send();
  }
);

router.post(
  '/reset_password',
  [check('password').exists()],
  validateRequest,
  async (req, res) => {
    let userInfo = req.query['email'];
    if (req.query['email'] == undefined) {
      if (req.query['username'] == undefined) {
        userInfo = req.query['username'];
      } else {
        res.status(400).send();
        return;
      }
    }
    const reset_token = req.query['reset_token'];
    if (reset_token == undefined) {
      res.status(400).send();
      return;
    }
    const newPassword = hashString(req.body.password);
    const result = await changeUserPasswordUsingEmailAndResetToken(
      userInfo,
      newPassword,
      reset_token
    );
    if (result) {
      res.status(200);
    } else {
      res.status(404);
    }
    res.send();
  }
);

async function generateSignedToken(
  userID: string,
  username: string,
  role: string
) {
  return jwt.sign(
    { id: userID, role: role, username: username },
    jwtEncryptionKey,
    {
      algorithm: 'HS256',
      expiresIn: '10 days'
    }
  );
}

module.exports = router;
