import express from 'express';
import AsyncFunction from '../../core/async-handler';
import auth from '../../auth/validate-request';
import AdminControllers from '../../controllers/admin.controller';
const router = express.Router();
router.get('/private/admin/owner', AsyncFunction(AdminControllers.getOwner));

export default router;
