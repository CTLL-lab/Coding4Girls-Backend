import { Router, Response } from 'express';
import authenticated, {
  priviledgedUser,
  userCreatorOfTheLobbyOrFullyPriviledged,
  userMemberOfTheLobbyOrFullyPriviledged
} from '../includes/auth-guard';
import {
  GetChallenge,
  ChallengeNotFound,
  Challenge,
  CreateNewChallenge,
  UpdateChallenge,
  GetChallengePage,
  DeleteChallenge,
  GetChallengeSnapTemplate,
  UpdateChallengePage,
  UpdateChallengeSnapTemplate,
  GetChallengeLevels,
  ChangeChallengeLevel,
  CreateChallengeLevel,
  DeleteChallengeLevel,
  GetChallengeSnapSolution
} from '../models/challenge';
import { CreateSuccessResponse } from '../models/response';
import { check } from 'express-validator/check';
import { validateRequest } from '../includes/validation';

var router = Router();

// Create new challenge ✅
// POST /challenges

// Get challenge details ✅
// GET /challenges/:challengeID

// Edit challenge details ✅
// PUT /challenges/:challengeID

// Delete a challenge ✅
// DELETE /challenges/:challengeID

// Get all levels for a challenge
// GET /challenges/:challengeID/levels

// Create a level
// POST /challenges/:challengeID/levels

// Update a level
// PUT /challenges/:challengeID/levels/:levelID

// Delete a level
// DELETE /challenges/:challengeID/levels/:levelID

// Deprecated
// Get challenge Snap! template ✅
// GET /challenges/:challengeID/snap

// Edit challenge Snap! template ✅
// PUT /challenges/:challengeID/snap

// Get challenge html page intented to be shown to users ✅
// GET /challenges/:challengeID/page

// Edit challenge html page intented to be shown to users ✅
// PUT /challenges/:challengeID/page

router.get('/:challengeID', authenticated, async (req, res) => {
  let r: Challenge;
  try {
    r = await GetChallenge(req.params.challengeID);
  } catch (err) {
    if (err instanceof ChallengeNotFound) {
      res.status(404);
    } else {
      res.status(500);
    }
    res.send();
    return;
  }
  res.json(CreateSuccessResponse({ challenge: r }));
});

router.post(
  '/',
  authenticated,
  priviledgedUser,
  [
    check('name').exists(),
    check('description').exists(),
    check('lobbyid').exists(),
    check('minigame').exists(),
    check('variables').exists(),
    check('miniGameCategory').exists()
  ],
  validateRequest,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res: Response) => {
    let r;
    if (req.body.variables) {
      // if timer exists in variables
      if (req.body.variables.timer) {
        // and is less than 20
        if (req.body.variables.timer < 20) {
          req.body.variables.timer = 20;
        }
      }

      // if score exists in variables
      if (req.body.variables.score) {
        // and is less than 0
        if (req.body.variables.score < 0) {
          req.body.variables.score = 0;
        }
      }
    }
    try {
      let challenge: Challenge = {
        name: req.body.name,
        description: req.body.description,
        lobbyid: req.body.lobbyid,
        minigame: req.body.minigame,
        miniGameCategory: req.body.miniGameCategory,
        variables: req.body.variables,
        tag: req.body.tag
      };
      r = await CreateNewChallenge(challenge);
      res.status(201);
      res.json(String(r));
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
);

router.put(
  '/:challengeID',
  authenticated,
  priviledgedUser,
  [
    check('name').exists(),
    check('description').exists(),
    check('minigame').exists(),
    check('variables').exists(),
    check('miniGameCategory').exists()
  ],
  validateRequest,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    let r;
    if (req.body.variables) {
      // if timer exists in variables
      if (req.body.variables.timer) {
        // and is less than 20
        if (req.body.variables.timer < 20) {
          req.body.variables.timer = 20;
        }
      }

      // if score exists in variables
      if (req.body.variables.score) {
        // and is less than 0
        if (req.body.variables.score < 0) {
          req.body.variables.score = 0;
        }
      }
    }
    try {
      let challenge: Challenge = {
        name: req.body.name,
        description: req.body.description,
        id: req.params.challengeID,
        minigame: req.body.minigame,
        variables: req.body.variables,
        lobbyid: '0',
        miniGameCategory: req.body.miniGameCategory,
        tag: req.body.tag
      };
      r = await UpdateChallenge(challenge);
      res.status(200).send();
    } catch (err) {
      console.log(req);
      console.error(err);
      res.sendStatus(500);
    }
  }
);

router.delete(
  '/:challengeID',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    const challengeID = req.params.challengeID;
    try {
      const r = await DeleteChallenge(challengeID);
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

router.put(
  '/:challengeID/levels/:levelID',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    const challengeID = req.params.challengeID;
    const levelID = req.params.levelID;
    try {
      req.body.instructions =
        req.body.instructions == '' ? {} : req.body.instructions;
      const r = await ChangeChallengeLevel(challengeID, req.body);
      res.send();
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  }
);

router.post(
  '/:challengeID/levels',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    const challengeID = req.params.challengeID;
    const levelID = req.params.levelID;
    try {
      req.body.instructions =
        req.body.instructions == '' ? {} : req.body.instructions;
      const r = await CreateChallengeLevel(challengeID, req.body);
      res.send();
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  }
);

router.delete(
  '/:challengeID/levels/:levelID',
  authenticated,
  userCreatorOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    const challengeID = req.params.challengeID;
    const levelID = req.params.levelID;
    try {
      const r = await DeleteChallengeLevel(challengeID, levelID);

      res.status(200).send();
    } catch (err) {
      console.error(err);
      res.status(500).send();
    }
  }
);

router.get(
  '/:challengeID/levels/:levelID/page',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetChallengePage(
        req.params['challengeID'],
        req.params['levelID']
      );
      res.json(ans);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
);

// router.put(
//   '/:challengeID/page',
//   authenticated,
//   userCreatorOfTheLobbyOrFullyPriviledged,
//   [check('page').exists()],
//   validateRequest,
//   async (req, res) => {
//     let r;
//     try {
//       r = await UpdateChallengePage(req.params.challengeID, req.body['page']);
//       res.status(200).send();
//     } catch (err) {
//       console.log(req);
//       console.log(req.body['page']);
//       console.error(err);
//       res.sendStatus(500);
//     }
//   }
// );

router.get(
  '/:challengeID/levels/:levelID/snap',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetChallengeSnapTemplate(
        req.params['challengeID'],
        req.params['levelID']
      );
      res.json(ans);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
);

router.get(
  '/:challengeID/levels/:levelID/snap/solution',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    try {
      const ans = await GetChallengeSnapSolution(
        req.params['challengeID'],
        req.params['levelID']
      );
      res.json(ans);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
);

// router.put(
//   '/:challengeID/snap',
//   authenticated,
//   userCreatorOfTheLobbyOrFullyPriviledged,
//   [check('snapTemplate').exists()],
//   validateRequest,
//   async (req, res) => {
//     let r;
//     try {
//       r = await UpdateChallengeSnapTemplate(
//         req.params.challengeID,
//         req.body['snapTemplate']
//       );
//       res.status(200).send();
//     } catch (err) {
//       console.error(err);
//       res.sendStatus(500);
//     }
//   }
// );

router.get(
  '/:challengeID/levels*',
  authenticated,
  userMemberOfTheLobbyOrFullyPriviledged,
  async (req, res) => {
    const challengeID = req.params.challengeID;
    let levels;
    try {
      levels = await GetChallengeLevels(challengeID);
    } catch (err) {
      res.sendStatus(500);
      return;
    }
    if (req.params[0] == '/unity') {
      levels.forEach(x => {
        delete x['snap'];
        delete x['snap_solution'];
      });
    }
    res.json(
      CreateSuccessResponse({ levels: levels, challengeID: challengeID })
    );
  }
);

module.exports = router;
