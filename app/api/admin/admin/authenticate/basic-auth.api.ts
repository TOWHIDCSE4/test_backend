import express from 'express';
import AsyncFunction from '../../../../core/async-handler';
import AdminControllers from '../../../../controllers/admin.controller';

const router = express.Router();

router.post('/admin/login', AsyncFunction(AdminControllers.login));

export default router;
