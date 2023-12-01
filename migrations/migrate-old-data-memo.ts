const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';

import Booking, { BookingModel } from '../app/models/booking';
import TrialBooking, { TrialBookingModel } from '../app/models/trial-booking';
let count = 0;
const updateBooking = async (iterator: Booking) => {
    if (iterator.memo) {
        let note = iterator.memo?.note;
        note = note.filter((e: any) => e.keyword !== 'avg_score');
        let avg = 0;
        for (const iterator of note) {
            iterator.point = iterator.point || 0;
        }
        avg = note.reduce((a, b) => a + b.point, 0) / note.length;
        iterator.memo.note = note;
        iterator.memo.avg_note = avg;
        if (iterator.memo && !iterator.memo?.created_time) {
            iterator.memo.created_time = iterator.updated_time;
        }
        await iterator.save();
        count++;
    }
};

const updateTrialBooking = async (iterator: TrialBooking) => {
    if (iterator.memo) {
        let note = iterator.memo?.note;
        note = note.filter((e: any) => e.keyword !== 'avg_score');
        let avg = 0;
        for (const iterator of note) {
            iterator.point = iterator.point || 0;
        }
        avg = note.reduce((a, b) => a + b.point, 0) / note.length;
        iterator.memo.note = note;
        iterator.memo.avg_note = avg;
        if (iterator.memo && !iterator.memo?.created_time) {
            iterator.memo.created_time = iterator.updated_time;
        }
        await iterator.save();
        count++;
    }
};

// ngày 15/11
// migrate lại old data memo cả data đồng bộ từ ispeak sang theo form mới
const migrate = async () => {
    await mongoose.connect(url);
    // migrate booking
    const bookings = await BookingModel.find({
        'memo.note.1': { $exists: true },
        'memo.avg_note': { $exists: false }
    });
    console.log('======>Total', bookings.length);
    let arr: any = [];
    for (const iterator of bookings) {
        if (iterator.memo?.note?.length) {
            if (arr.length === 20) {
                await Promise.all(arr);
                arr = [];
            } else {
                arr.push(updateBooking(iterator));
            }
        }
    }
    // update data còn lại trong mảng
    if (arr.length) {
        await Promise.all(arr);
    }
    console.log(`======>Updated ${count}`);
    // migrate  trial booking
    const trialBooking = await TrialBookingModel.find({
        'memo.note.1': { $exists: true },
        'memo.avg_note': { $exists: false }
        // from_ispeak: { $exists: false }
    });
    console.log('======>Total', bookings.length);
    count = 0;
    for (const iterator of trialBooking) {
        if (iterator.memo?.note?.length) {
            if (arr.length === 20) {
                await Promise.all(arr);
                arr = [];
            } else {
                arr.push(updateTrialBooking(iterator));
            }
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
