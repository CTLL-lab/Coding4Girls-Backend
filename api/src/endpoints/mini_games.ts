import { Router } from 'express';
import authenticated from '../includes/auth-guard';
import {
  GetMiniGame,
  MiniGameNotFound,
  GetAllMiniGames
} from '../models/mini_game';
import { SuccessResponse, CreateSuccessResponse } from '../models/response';

var router = Router();

router.get('/', authenticated, async (req, res) => {
  try {
    const r = await GetAllMiniGames();
    res.json(CreateSuccessResponse({ mini_games: r }));
  } catch (err) {
    console.error(err);
    res.status(500).send();
    return;
  }
});

router.get('/:minigameID', authenticated, async (req, res) => {
  try {
    const r = await GetMiniGame(req.params.minigameID);
    res.send(CreateSuccessResponse({ mini_game: r }));
  } catch (err) {
    if (err instanceof MiniGameNotFound) {
      res.status(404);
    } else {
      res.status(500);
    }
    res.send();
  }
});

module.exports = router;
