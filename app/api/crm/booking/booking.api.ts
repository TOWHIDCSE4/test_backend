import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TrialTeacherControllers from '../../../controllers/trial-teacher.controller';
import auth from '../../../auth/validate-request';
import UnitControllers from '../../../controllers/unit.controller';
import TrialBookingControllers from '../../../controllers/trial-booking.controller';
import ValidationResult, {
    newTrialBookingValidatorForCrm
} from '../../../validator';
import { services } from '../../../const/services';

const router = express.Router();

router.get(
    '/teachers/trial-pool',
    auth.validateService(services.crm),
    AsyncFunction(TrialTeacherControllers.getTrialTeacherProfiles)
);

router.get(
    '/admin/units',
    auth.validateService(services.crm),
    AsyncFunction(UnitControllers.getUnitsByAdmin)
);

router.post(
    '/admin/bookings/trial',
    auth.validateService(services.crm),
    newTrialBookingValidatorForCrm(),
    ValidationResult(),
    AsyncFunction(TrialBookingControllers.createTrialBookingForCrm)
);

export default router;
