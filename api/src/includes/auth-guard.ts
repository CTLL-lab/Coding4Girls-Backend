import * as jwt from 'jsonwebtoken';
import {
  jwtEncryptionKey,
  privileged_roles,
  fully_privileged_roles
} from '../config';
import { ErrorResponse } from '../models/response';
import { GetLobbyCreatorID, IsLobbyPublic } from '../models/lobby';
import { GetChallengeLobbyID } from '../models/challenge';
import { isUserMemberOfLobby } from '../models/user';

// middleware for authentication
export default function authenticated(request, res, next) {
  let apiToken: string;
  try {
    if (request.headers['authorization'] == undefined) {
      res.status(401).send();
      return;
    }
    apiToken = request.headers['authorization'].split(' ')[1];
  } catch (err) {
    console.error(err);
    const r = new ErrorResponse('AUTH0');
    console.log(request.headers);
    res.status(401).json(r);
    return;
  }
  // set user on-success
  try {
    request.user = jwt.verify(apiToken, jwtEncryptionKey, {
      algorithms: ['HS256']
    });
  } catch (err) {
    console.error(err);
    res.status(401).send();
    return;
  }
  // always continue to next middleware
  next();
}

export function priviledgedUser(req, res, next) {
  if (privileged_roles.includes(req.user.role)) {
    next();
  } else {
    res.status(401).send();
  }
}

export function fullyPriviledgedUser(req, res, next) {
  if (fully_privileged_roles.includes(req.user.role)) {
    next();
  } else {
    res.status(401).send();
  }
}

export async function userCreatorOfTheLobbyOrFullyPriviledged(req, res, next) {
  // This allow the function to be used in cases where the lobbyID is not
  // in the url but contained in the body of the request
  let lobbyID;
  try {
    lobbyID = req.params.lobbyID;
    if (req.params.lobbyID == undefined) {
      if (req.body['lobbyid'] == undefined) {
        lobbyID = await GetChallengeLobbyID(req.params['challengeID']);
        if (lobbyID == undefined) {
          res.status(401).send();
          return;
        }
      } else {
        lobbyID = req.body['lobbyid'];
      }
    }
  } catch {
    res.sendStatus(500);
  }
  try {
    if (
      req['user'].id == (await GetLobbyCreatorID(lobbyID)).toString() ||
      fully_privileged_roles.includes(req.user.role)
    ) {
      next();
    } else {
      res.status(401).send();
    }
  } catch {
    res.status(401).send();
  }
}

/**
 * Middleware that returns true if user is member of the lobby, creator of it or fully priviledged
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export async function userMemberOfTheLobbyOrFullyPriviledged(req, res, next) {
  let lobbyID;
  try {
    lobbyID = req.params.lobbyID;
    if (req.params.lobbyID == undefined) {
      if (req.body['lobbyid'] == undefined) {
        lobbyID = await GetChallengeLobbyID(req.params['challengeID']);
        if (lobbyID == undefined) {
          res.status(401).send();
          return;
        }
      } else {
        lobbyID = req.body['lobbyid'];
      }
    }
  } catch {
    res.sendStatus(500);
  }

  if (
    fully_privileged_roles.includes(req.user.role) ||
    (await isUserMemberOfLobby(req.user.id, lobbyID)) ||
    (privileged_roles.includes(req.user.role) && (await IsLobbyPublic(lobbyID)))
  ) {
    next();
  } else {
    res.status(401).send();
  }
}
