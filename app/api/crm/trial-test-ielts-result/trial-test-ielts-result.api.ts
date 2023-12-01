import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import TrialTestIeltsResultControllers from '../../../controllers/trial-test-ielts-result.controller';
import ValidationResult, {
    newTrialTestIeltsResultValidatorForCrm
} from '../../../validator';
import { services } from '../../../const/services';

const router = express.Router();

router.post(
    '/admin/trial-test-ielts-result/create',
    auth.validateService(services.crm),
    newTrialTestIeltsResultValidatorForCrm(),
    ValidationResult(),
    AsyncFunction(
        TrialTestIeltsResultControllers.createTrialTestIeltsResultForCrm
    )
);

router.put(
    '/student/trial-test-ielts-result/update-test-result',
    auth.validateService(services.trialTest),
    AsyncFunction(TrialTestIeltsResultControllers.updateTestResult)
);

router.get(
    '/student/trial-test-ielts-result/link-ielts-skills',
    auth.validateService(services.trialTest),
    AsyncFunction(TrialTestIeltsResultControllers.getLinkIeltsSkills)
);

export default router;
