const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';
import { TeacherModel } from '../app/models/teacher';
import { UserModel } from '../app/models/user';
import Student, { StudentModel } from '../app/models/student';
import StudentActions from '../app/actions/student';

let count = 0;

const migrate = async () => {
    await mongoose.connect(url);
    const temp = await StudentModel.updateMany({}, { $unset: { id: 1 } });
    console.log(temp);
    const data = await UserModel.find({
        role: 1
    });
    console.log('======>Total', data.length);

    await Promise.all(
        data.map(async (iterator) => {
            const student = await StudentModel.findOne({
                user_id: iterator.id
            });
            if (!student) {
                const user_info: any = {
                    user_id: iterator.id
                };
                await StudentActions.create(user_info as Student);
                count++;
            }
        })
    );

    console.log(`======>Updated ${count}`);
    process.exit(1);
};

migrate();
