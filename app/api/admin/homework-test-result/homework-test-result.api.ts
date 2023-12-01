import express from 'express';
import AsyncFunction from '../../../core/async-handler';
const router = express.Router();
import HomeworkTestResultControllers from '../../../controllers/homework-test-result.controller';
import auth from '../../../auth/validate-request';

router.get(
    '/admin/homework/get-self-study-history-v2',
    auth.validateToken(),
    AsyncFunction(HomeworkTestResultControllers.getSelfStudyHistoryV2)
);

export default router;
