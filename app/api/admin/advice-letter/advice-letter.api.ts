import express from 'express';
import auth from '../../../auth/validate-request';
import AsyncFunction from '../../../core/async-handler';
import TrialBookingController from '../../../controllers/trial-booking.controller';
import AdviceLetterController from '../../../controllers/advice-letter.controller';

const router = express.Router();

router.put(
    '/admin/advice-letter/create-advice-letter-for-learning-assessment',
    auth.validateToken(),
    AsyncFunction(TrialBookingController.createAdviceLetter)
)

router.get(
    '/admin/all-advice-letters',
    auth.validateToken(),
    AsyncFunction(AdviceLetterController.getAllLetters)
)

router.put(
    '/admin/advice-letter/update-status',
    auth.validateToken(),
    AsyncFunction(AdviceLetterController.updateStatus)
)

router.delete(
    '/admin/advice-letter/delete/:obj_id',
    auth.validateToken(),
    AsyncFunction(AdviceLetterController.removeAdviceLetter)
);


export default router;
