import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import IeltsBookingController from '../../../controllers/ielts-booking.controller';
import ValidationResult, { newIeltsBookingValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.post(
    '/admin/bookings/ielts',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.tmctc_create]),
    newIeltsBookingValidator(),
    ValidationResult(),
    AsyncFunction(IeltsBookingController.createIeltsBooking)
);

export default router;
