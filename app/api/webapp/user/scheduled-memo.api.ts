import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ScheduledMemoControllers from '../../../controllers/scheduled-memo.controller';
import auth from '../../../auth/validate-request';
import ValidationResult, {
    updateScheduledMemoByTeacher,
    validateStatusUser
} from '../../../validator';

const router = express.Router();

router.get(
    '/user/scheduled-memos',
    auth.validateToken(),
    AsyncFunction(ScheduledMemoControllers.getScheduledMemosByUser)
);

router.put(
    '/teacher/scheduled-memos/:memo_id',
    auth.validateToken(),
    validateStatusUser(),
    updateScheduledMemoByTeacher(),
    ValidationResult(),
    AsyncFunction(ScheduledMemoControllers.commentOnScheduledMemoByTeacher)
);

export default router;
