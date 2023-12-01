const mongoose = require('mongoose');
const listTeacher = require('./count_booking_teacher_ispeak.json');
const url = 'mongodb://localhost:27017/ispeak-backend';

import Teacher, { TeacherModel } from '../../app/models/teacher';
import BookingActions from '../../app/actions/booking';

let count = 0;
const updateTeacher = async (iterator: any) => {
    const user = await TeacherModel.findOne({ user_id: iterator.user_id });
    if (user) {
        const countBookingEPlus = await BookingActions.count({
            teacher_id: iterator.user_id,
            status: 1,
            from_ispeak: { $ne: true }
        });
        user.total_lesson_english_plus = countBookingEPlus;
        user.total_lesson_ispeak = iterator.bookings;
        user.total_lesson = iterator.bookings + countBookingEPlus;
        await user.save();
        count++;
    }
};

// ngày 12/12
// migrate total lesson từ ispeak sang
const migrate = async () => {
    await mongoose.connect(url);
    // migrate teachers
    console.log('======>Total', listTeacher.length);
    let arr: any = [];
    for (const iterator of listTeacher) {
        if (arr.length === 10) {
            await Promise.all(arr);
            arr = [];
        } else {
            arr.push(updateTeacher(iterator));
        }
    }
    // update data còn lại trong mảng
    if (arr.length) {
        await Promise.all(arr);
    }
    console.log(`======>Updated ${count}`);
    process.exit(1);
};

migrate();
