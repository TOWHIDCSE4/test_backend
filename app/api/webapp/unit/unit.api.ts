import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import UnitControllers from '../../../controllers/unit.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

/* Bo sung cac route cung cac endpoint cho API */
router.get(
    '/units',
    auth.validateToken(),
    AsyncFunction(UnitControllers.getUnitsByUser)
);

export default router;
