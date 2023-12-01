import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import TrialBookingControllers from '../../../controllers/trial-booking.controller';
import CommentSuggestionControllers from '../../../controllers/comment-suggestion.controller';
import ValidationResult, {
    editTrialBookingValidator,
    updateRecordBookingValidator,
    validateStatusUser
} from '../../../validator';
import auth from '../../../auth/validate-request';

const router = express.Router();

router.put(
    '/teacher/bookings/trial/:booking_id/memo',
    auth.validateToken(),
    validateStatusUser(),
    editTrialBookingValidator(),
    ValidationResult(),
    AsyncFunction(TrialBookingControllers.createMemoByTeacher)
);

router.put(
    '/teacher/bookings/:booking_id/record',
    auth.validateToken(),
    validateStatusUser(),
    updateRecordBookingValidator(),
    ValidationResult(),
    AsyncFunction(TrialBookingControllers.updateRecordBooking)
);

router.get(
    '/teacher/trial-bookings/comment-suggestion-list',
    auth.validateToken(),
    AsyncFunction(
        CommentSuggestionControllers.getTrialCommentSuggestionsByTeacher
    )
);

export default router;
