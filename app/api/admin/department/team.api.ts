import TeamController from '../../../controllers/team.controller';
import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ValidationResult from '../../../validator';
import { createTeamValidator } from '../../../validator/team.validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/team',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmtm_view]),
    AsyncFunction(TeamController.getAllTeam)
);

router.get(
    '/admin/team/:idTeam',
    auth.validateToken(),
    AsyncFunction(TeamController.getTeam)
);

router.post(
    '/admin/team',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmtm_create]),
    createTeamValidator(),
    ValidationResult(),
    AsyncFunction(TeamController.createTeam)
);

router.put(
    '/admin/team/:idTeam',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmtm_update]),
    createTeamValidator(),
    ValidationResult(),
    AsyncFunction(TeamController.editTeam)
);

router.delete(
    '/admin/team/:idTeam',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.hrmtm_delete]),
    AsyncFunction(TeamController.deleteTeam)
);

export default router;
