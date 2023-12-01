import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import ScheduledMemoControllers from '../../../controllers/scheduled-memo.controller';
import ValidationResult, {
    createScheduledMemoValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/scheduled-memos',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmmm_view, PERMISSIONS.sca_view]),
    AsyncFunction(ScheduledMemoControllers.getScheduledMemosByAdmin)
);

router.post(
    '/admin/scheduled-memos',
    auth.validateToken(),
    createScheduledMemoValidator(),
    ValidationResult(),
    AsyncFunction(ScheduledMemoControllers.createScheduledMemoByAdmin)
);

router.put(
    '/admin/scheduled-memos/:memo_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmmm_update]),
    AsyncFunction(ScheduledMemoControllers.editScheduledMemoByAdmin)
);

router.delete(
    '/admin/scheduled-memos/:memo_id',
    auth.validateToken(),
    AsyncFunction(ScheduledMemoControllers.removeScheduledMemo)
);

router.post(
    '/admin/memo/auto-rate',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmmm_create_memo_ai,
        PERMISSIONS.arla_update
    ]),
    AsyncFunction(ScheduledMemoControllers.getAutoRateMemo)
);

export default router;
