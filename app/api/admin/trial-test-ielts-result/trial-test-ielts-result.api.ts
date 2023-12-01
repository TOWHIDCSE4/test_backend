import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
import TrialTestIeltsResultController from '../../../controllers/trial-test-ielts-result.controller';

const router = express.Router();

router.get(
    '/admin/trial-test-ielts/results',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.amttir_view]),
    AsyncFunction(TrialTestIeltsResultController.getAllTrialTestIeltsResults)
);

router.put(
    '/admin/trial-test-ielts/results/:result_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.amttir_edit]),
    AsyncFunction(
        TrialTestIeltsResultController.editTrialTestIeltsWritingResults
    )
);

export default router;
