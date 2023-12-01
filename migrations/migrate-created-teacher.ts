const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';

import Teacher, { TeacherModel } from '../app/models/teacher';
import { UserModel } from '../app/models/user';
let count = 0;
const updateTeacher = async (iterator: Teacher) => {
    const user = await UserModel.findOne({ id: iterator.user_id });
    if (user) {
        iterator.created_time = user.created_time;
        iterator.updated_time = user.updated_time;
        await iterator.save();
        count++;
    }
};

// ngày 18/11
// migrate lại create date bảng teacher do thiếu dữ liệu từ ispeak
const migrate = async () => {
    await mongoose.connect(url);
    // migrate teachers
    const teachers = await TeacherModel.find({
        created_time: null
    });
    console.log('======>Total', teachers.length);
    let arr: any = [];
    for (const iterator of teachers) {
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
