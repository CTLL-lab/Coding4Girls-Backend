import authenticated from '../includes/auth-guard';
import { privileged_roles } from '../config';
import setDefaultPaginationIfNotPresent from '../includes/pagination';
import { Router } from 'express';
import {
  GetUserLobbies,
  joinLobbyByCode,
  UserAlreadyMemberOfLobbyException,
  LeaveLobby,
  GetChallengeSolutionForUser,
  GetLobbySolutionForUser,
  TriedToJoinPublicLobbyException
} from '../models/user';
import { SuccessResponse, CreateSuccessResponse } from '../models/response';
import { oneOf, check } from 'express-validator/check';
import { validateRequest } from '../includes/validation';
import { CodeNotInUseException } from '../models/lobby';

var router = Router();

router.get(
  '/:userID/lobbies',
  authenticated,
  selfOrPriviledged,
  setDefaultPaginationIfNotPresent,
  async (req, res) => {
    const page = req.query._page;
    const limit = req.query._limit;
    const lobbies = await GetUserLobbies(req.params.userID);
    const response = new SuccessResponse();
    response.data = { lobbies: lobbies, lobbiesCount: lobbies.length };
    res.json(response);
  }
);

router.post(
  '/:userID/lobbies',
  authenticated,
  selfOrPriviledged,
  oneOf([
    check('lobbyid')
      .exists()
      .isString(),
    check('code')
      .exists()
      .isString()
  ]),
  validateRequest,
  async (req, res) => {
    if (req.body.code != undefined && req.body.lobbyid != undefined) {
      res.status(422).send();
      return;
    }
    if (req.body.code != undefined) {
      try {
        const r = await joinLobbyByCode(req.params.userID, req.body.code);
        if (r) {
          res.status(201).send();
          return;
        }
        res.status(500).send();
      } catch (err) {
        if (err instanceof UserAlreadyMemberOfLobbyException) {
          res.status(409).send();
        }
        if (err instanceof TriedToJoinPublicLobbyException) {
          res.status(428).send();
        }
        if (err instanceof CodeNotInUseException) {
          res.status(404).send();
          return;
        }
        res.status(500).send();
      }
    }
  }
);

router.delete(
  '/:userID/lobbies/:lobbyID',
  authenticated,
  selfOrPriviledged,
  async (req, res) => {
    try {
      const r = await LeaveLobby(req.params.userID, req.params.lobbyID);
      if (r) {
        res.status(200).send();
        return;
      } else {
        res.status(500).send();
      }
    } catch (err) {
      res.status(404).send();
    }
  }
);

router.get(
  '/:userID/challenges/:challengeID/solution/:levelID',
  authenticated,
  selfOrPriviledged,
  async (req, res) => {
    try {
      const solution = await GetChallengeSolutionForUser(
        req.params.challengeID,
        req.params.levelID,
        req.params.userID
      );
      res.json(
        CreateSuccessResponse({
          solution
        })
      );
    } catch (err) {
      console.error(err);
    }
  }
);

router.get(
  '/:userID/lobbies/:lobbyID/solution',
  authenticated,
  async (req, res) => {
    try {
      const solution = await GetLobbySolutionForUser(
        req.params.lobbyID,
        req.params.userID
      );
      res.json(
        CreateSuccessResponse({
          solution
        })
      );
    } catch (err) {
      console.error(err);
    }
  }
);

function selfOrPriviledged(req, res, next) {
  if (
    req.params.userID == req.user.id ||
    privileged_roles.includes(req.user.role)
  ) {
    next();
  } else {
    res.status(401).send();
  }
}

module.exports = router;
