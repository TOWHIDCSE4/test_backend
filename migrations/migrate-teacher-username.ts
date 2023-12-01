const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';
import { TeacherModel } from '../app/models/teacher';
import { UserModel } from '../app/models/user';
let count = 0;

// ngày 25/10
// thêm trường username vào object user trong bảng teacher
const migrate = async () => {
    await mongoose.connect(url);
    const teachers = await TeacherModel.find({});
    console.log('======>Total', teachers.length);
    for (const iterator of teachers) {
        const user = await UserModel.findOne({
            id: iterator.user_id
        });
        if (user) {
            iterator.user = {
                full_name: user.full_name,
                is_active: user.is_active || false,
                email: user.email,
                username: user.username,
                avatar: user.avatar
            };
            await iterator.save();
            count++;
        }
    }
    console.log(`======>Updated ${count}`);
    process.exit(1);
};

migrate();
