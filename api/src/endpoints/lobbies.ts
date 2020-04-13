import { Router, Request } from 'express';
import authenticated, {
  priviledgedUser,
  userCreatorOfTheLobbyOrFullyPriviledged,
  userMemberOfTheLobbyOrFullyPriviledged,
} from '../includes/auth-guard';
import setDefaultPaginationIfNotPresent from '../includes/pagination';
import { ErrorResponse, CreateSuccessResponse } from '../models/response';
import {
  SearchForLobby,
  GetAllLobbies,
  CreateNewLobby,
  Lobby,
  GetLobby,
  ChangeLobby,
  DeleteLobby,
  GetLobbyMembers,
  GetLobbyChallenges,
  GetLobbyChallengesOrder,
  ChangeLobbyChallengesOrder,
  CodeInUseException,
  GetLobbySnapTemplate,
  UpdateLobbySnapTemplate,
  LobbyNotFound,
  GetLobbySolutions,
  GetLobbyChallengesSolutions,
  GetLobbyPage,
  UpdateLobbyInstructionsPage,
  CloneLobbyWithNewCodeAndCreator,
  SearchForPublicLobby,
  GetPublicLobbies,
  GetLobbyFinishPage,
  UpdateLobbyInstructionsPages,
} from '../models/lobby';
import { validateRequest } from '../includes/validation';
import { check } from 'express-validator/check';
import { fully_privileged_roles } from '../config';
import bodyParser = require('body-parser');

var router = Router();

// Create new lobby ✅
// POST /lobbies

// Get lobbies ✅
// GET /lobbies

// Get public lobbies
// GET /lobbies/public

// Get lobby details ✅
// POST /lobbies/:lobbyID

// Change lobby details ✅
// PUT /lobbies/:lobbyID

// Delete a lobby ✅
// DELETE /lobbies/:lobbyID

// Fetch lobby members ✅
// GET /lobbies/:lobbyID/members

// Fetch lobby challenges with order ✅
// GET /lobbies/:lobbyID/challenges

// Fetch lobby challenges order ✅
// GET /lobbies/:lobbyID/challenges/order

// Change lobby challenges order ✅
// PUT /lobbies/:lobbyID/challenges/order

// Get lobby Snap! template ✅
// GET /lobby/:lobbyID/snap

// Edit lobby Snap! template ✅
// PUT /lobby/:lobbyID/snap

// Get lobby instructions page ✅
// GET /lobby/:lobbyID/page

// Edit lobby instructions page ✅
// PUT /lobby/:lobbyID/page

// Get which users have submited solutions ✅
// for the lobby challenge ✅
// GET /lobby/:lobbyID/solutions

// Get which users have submited solutions ✅
// for ALL the challenges in the lobby ✅
// GET /lobby/:lobbyID/challenges/solutions

// Clone a lobby
// POST /lobby/:lobbyID/clone

/*
 * If user is fully priviledged
 * Returns all the lobbies found in the database
 * if user is teacher
 * returns all lobbies created by this user
 * (search function follows and searches based on the rule above)
 * pagination /lobbies?_page=1&_limit=25
 * search /lobbies?search=query
 */
router.get(
  '/',
  authenticated,
  priviledgedUser,
  setDefaultPaginationIfNotPresent,
  async (req, res) => {
    let lobbies: any[];
    try {
      if (req.query.search != undefined) {
        if (fully_privileged_roles.includes(req['user'].role)) {
          lobbies = await SearchForLobby(
            req.query.search,
            req.query._page,
            req.query._limit
          );
        } else {
          lobbies = await SearchForLobby(
            req.query.search,
            req.query._page,
            req.query._limit,
            req['user'].id
          );
        }
      } else {
        if (fully_privileged_roles.includes(req['user'].role)) {
          lobbies = await GetAllLobbies(req.query._page, req.query._limit);
        } else {
          lobbies = await GetAllLobbies(
            req.query._page,
            req.query._limit,
            req['user'].id
          );
        }
      }
    } catch (err) {
      console.error(err);
      res.status(500).send(new ErrorResponse('LOBBIES1'));
      return;
    }
    res
      .status(200)
      .json(
        CreateSuccessResponse({ totalCount: lobbies.length, lobbies: lobbies })
      );
  }
);

router.post(
  '/',
  authenticated,
  priviledgedUser,
  [
    check('name').exists().isString().not().isEmpty(),
    check('description').exists().not().isEmpty(),
    check('outcome').exists(),
    check('code').exists().isString().not().isEmpty(),
    check('public').exists(),
  ],
  validateRequest,
  async (req, res) => {
    const lobby: Lobby = ParseLobbyFromRequest(req);
    let r: boolean;
    try {
      r = await CreateNewLobby(lobby);
    } catch (err) {
      if (err instanceof CodeInUseException) {
        const response = new ErrorResponse('LOBBIES2');
        response.data['duplicate'] = 'code';
        res.status(409).json(response);
        return;
      }
      res.status(500).send();
      return;
    }
    if (r) {
      res.status(201).send();
    } else {
      res.status(500).send();
    }
  }
);

router.get(
  '/public',
  authenticated,
  priviledgedUser,
  setDefaultPaginationIfNotPresent,
  async (req, res) => {
    let lobbies: { lobbies: any[]; totalCount: number };
    try {
      if (req.query.search || req.query.language || req.query.tag) {
        lobbies = await SearchForPublicLobby(
          req.query.search,
          req.query._page,
          req.query._limit,
          req.query.language,
          req.query.tag
        );
      } else {
        lobbies = await GetPublicLobbies(req.query._page, req.query._limit);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send(new ErrorResponse('LOBBIES1'));
      return;
    }
    res.status(200).json(
      CreateSuccessResponse({
        totalCount: Number(lobbies.totalCount),
        currentCount: lobbies.lobbies.length,
        lobbies: lobbies.lobbies,
      })
    );
  }
);

router.get(
  '/:lobbyID',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    const lobbyID = req.params.lobbyID;
    let data;
    try {
      data = await GetLobby(lobbyID);
      delete data.page_before;
      delete data.snap_template;
    } catch (err) {
      console.error(err);
      res.status(500).send();
    }
    if (data != null) {
      res.status(200).json(CreateSuccessResponse({ lobby: data }));
    } else {
      res.status(404).send();
    }
  }
);

router.put(
  '/:lobbyID',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  [
    check('name').exists().isString(),
    check('description').exists(),
    check('outcome').exists(),
    check('code').exists(),
    check('public').exists(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const r = await ChangeLobby(ParseLobbyFromRequest(req));
      if (r) {
        res.status(200).send();
      } else {
        res.status(404).send();
      }
    } catch (err) {
      if (err instanceof CodeInUseException) {
        res.status(409).send();
        return;
      }
      res.status(500).send();
    }
  }
);

router.delete(
  '/:lobbyID',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    const lobbyID = req.params.lobbyID;
    try {
      const r = await DeleteLobby(lobbyID);
      if (r) {
        res.status(200).send();
      } else {
        res.status(404).send();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send();
    }
  }
);

router.get(
  '/:lobbyID/members',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const lobbyID = req.params.lobbyID;
      const members = await GetLobbyMembers(lobbyID);
      res.status(200).json(
        CreateSuccessResponse({
          totalCount: members.length,
          members: members,
        })
      );
    } catch (err) {
      console.error(err);
      res.status(500).send();
    }
  }
);

router.get(
  '/:lobbyID/challenges',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const r = await GetLobbyChallenges(req.params.lobbyID);
      const order = await GetLobbyChallengesOrder(req.params.lobbyID);
      res.json(
        CreateSuccessResponse({
          challenges: r,
          totalCount: r.length,
          order: order,
        })
      );
    } catch (err) {
      console.error(err);
      res.status(500).send();
    }
  }
);

router.get(
  '/:lobbyID/challenges/order',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const r = await GetLobbyChallengesOrder(req.params.lobbyID);
      res.json(CreateSuccessResponse({ order: r != undefined ? r : [] }));
    } catch (err) {
      console.error(err);
      res.status(500).send();
    }
  }
);

router.put(
  '/:lobbyID/challenges/order',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  [check('order').isArray().exists()],
  validateRequest,
  async (req, res) => {
    try {
      const r = await ChangeLobbyChallengesOrder(
        req.params.lobbyID,
        req.body.order
      );
      if (r) {
        res.status(200);
      } else {
        res.status(404);
      }
    } catch (err) {
      console.log(err);
      res.status(500);
    }
    res.send();
  }
);

router.get(
  '/:lobbyID/snap',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetLobbySnapTemplate(req.params['lobbyID']);
      res.json(ans);
    } catch (err) {
      console.error(err);
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
      }
      res.sendStatus(500);
    }
  }
);

router.put(
  '/:lobbyID/snap',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  [check('snapTemplate').exists()],
  validateRequest,
  async (req, res) => {
    let r;
    try {
      r = await UpdateLobbySnapTemplate(
        req.params.lobbyID,
        req.body['snapTemplate']
      );
      res.status(200).send();
    } catch (err) {
      console.error(err);
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
      }
      res.sendStatus(500);
    }
  }
);

router.get(
  '/:lobbyID/page',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetLobbyPage(req.params['lobbyID']);
      res.json(ans);
    } catch (err) {
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
        return;
      }
      res.sendStatus(500);
    }
  }
);

router.get(
  '/:lobbyID/page/after',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetLobbyFinishPage(req.params['lobbyID']);
      res.json(ans);
    } catch (err) {
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
        return;
      }
      res.sendStatus(500);
    }
  }
);

router.put(
  '/:lobbyID/page',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  [check('pageAfter').exists(), check('pageBefore').exists()],
  validateRequest,
  async (req, res) => {
    let r;
    try {
      r = await UpdateLobbyInstructionsPages(
        req.params.lobbyID,
        req.body['pageBefore'],
        req.body['pageAfter']
      );
      res.status(200).send();
    } catch (err) {
      console.error(err);
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
      }
      res.sendStatus(500);
    }
  }
);

router.get(
  '/:lobbyID/solutions',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetLobbySolutions(req.params['lobbyID']);
      res.json(ans);
    } catch (err) {
      console.error(err);
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
      }
      res.sendStatus(500);
    }
  }
);

router.get(
  '/:lobbyID/solutions/anonymous',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetLobbySolutions(req.params['lobbyID']);
      // anonymize response
      for (let i of ans) {
        delete i['username'];
        delete i['fname'];
        delete i['lname'];
      }
      res.json(ans);
    } catch (err) {
      console.error(err);
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
      }
      res.sendStatus(500);
    }
  }
);

router.get(
  '/:lobbyID/challenges/solutions',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetLobbyChallengesSolutions(req.params['lobbyID']);
      res.json(ans);
    } catch (err) {
      console.error(err);
      if (err instanceof LobbyNotFound) {
        res.sendStatus(404);
      }
      res.sendStatus(500);
    }
  }
);

router.post(
  '/:lobbyID/clone',
  authenticated,
  priviledgedUser,
  [
    check('code').exists(),
    check('name').exists(),
    check('description').exists(),
  ],
  validateRequest,
  async (req, res) => {
    CloneLobbyWithNewCodeAndCreator(
      req.params.lobbyID,
      req.body.code,
      req.user.id,
      req.body.name,
      req.body.description,
      req.body.tag
    )
      .then((x) => {
        res.sendStatus(201);
      })
      .catch((x) => {
        console.error(x);
        res.sendStatus(500);
      });
  }
);

function ParseLobbyFromRequest(req: Request): Lobby {
  return {
    name: req.body.name,
    outcome: req.body.outcome,
    description: req.body.description,
    id: req.params.lobbyID,
    code: req.body.code,
    snapTemplate: req.body.snapTemplate,
    instructions: req.body.instructions,
    tag: req.body.tag,
    public: Boolean(req.body.public),
    language: req.body.language,
    finishPage: req.body.finishPage,
    createdby: req['user'].id,
  };
}

module.exports = router;
