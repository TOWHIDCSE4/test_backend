import GreetingCall from './greeting-call.api';
import CheckingCall from './checking-call.api';
import UpcomingCall from './upcoming-call.api';
import TestReports from './test-reports.api';
import RegularTest from './regular-test.api';
import PeriodicReports from './periodic-reports.api';
import ObservationList from './observation.api';
import express from 'express';
const router = express.Router();

router.use('/', GreetingCall);
router.use('/', CheckingCall);
router.use('/', UpcomingCall);
router.use('/', TestReports);
router.use('/', RegularTest);
router.use('/', PeriodicReports);
router.use('/', ObservationList);

export default router;
