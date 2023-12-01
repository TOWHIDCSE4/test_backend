import { PaginationInfo } from '../const';
import mongoose, { FilterQuery, UpdateQuery } from 'mongoose';
import Team, { TeamModel } from '../models/team';
import CounterActions from './counter';
import AdminActions from './admin';
import Admin, { EnumRole } from '../models/department';

export default class TeamActions {
    public static async findAllPagination(args?: {
        filter?: FilterQuery<Team>;
        paginationInfo?: PaginationInfo;
        sort?: any;
    }) {
        const { filter, paginationInfo, sort } = args || {
            filter: {},
            paginationInfo: { page_number: 1, page_size: 20 },
            sort: {}
        };
        const pageSize = paginationInfo?.page_size || 20;
        const pageNumber = paginationInfo?.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return TeamModel.find({
            ...filter,
            isActive: true
        })
            .sort({ ...sort, createdAt: -1 })
            .populate('department')
            .populate(
                'leader',
                '-_id -__v -password -login_counter -created_time -updated_time'
            )
            .populate(
                'members',
                '-_id -__v -password -login_counter -created_time -updated_time'
            )
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAll(args?: { filter?: FilterQuery<Team> }) {
        const { filter } = args || { filter: {} };
        return TeamModel.find({
            ...filter,
            isActive: true
        })
            .sort({ code: 1 })
            .populate('department')
            .populate(
                'leader',
                '-_id -__v -password -login_counter -created_time -updated_time'
            )
            .populate(
                'members',
                '-_id -__v -password -login_counter -created_time -updated_time'
            );
    }

    public static async findOne(args?: { filter?: FilterQuery<Team> }) {
        const { filter } = args || { filter: {} };
        return TeamModel.findOne(filter)
            .populate('department')
            .populate(
                'leader',
                '-_id -__v -password -login_counter -created_time -updated_time'
            )
            .populate(
                'members',
                '-_id -__v -password -login_counter -created_time -updated_time'
            );
    }

    public static async create(input: Team) {
        const counter = await CounterActions.findOne({});
        const id = counter.team_id || 1;
        await CounterActions.increaseId('team_id');
        const Team = new TeamModel({
            ...input,
            id,
            permissionOfMember: {
                manager: [],
                leader: [],
                staff: []
            }
        });
        await Team.save();
        return Team;
    }

    public static async update(
        _id: mongoose.Types.ObjectId,
        update: UpdateQuery<Team>
    ) {
        return TeamModel.findOneAndUpdate(
            { _id: _id },
            [
                update,
                {
                    $set: {
                        updatedAt: Date.now()
                    }
                }
            ],
            {
                new: true
            }
        ).exec();
    }

    public static async updateLeader(
        _id: mongoose.Types.ObjectId,
        adminID: number
    ) {
        const team = await TeamModel.findOne({ _id })
            .populate('leader')
            .populate('department');
        if (!team) throw new Error('Không tìm thấy nhóm');
        const admin = await AdminActions.findOne({ id: adminID });
        if (!admin) throw new Error('Không tìm thấy trưởng nhóm');
        if (admin.canUpdate === false)
            throw new Error('Người dùng mặc định, không thể cập nhật');
        if (admin.department?.department?.id !== team?.department?.id) {
            throw new Error('Admin phải thuộc phòng/ban chứa nhóm');
        }
        if (
            admin?.department?.isRole != EnumRole.Manager &&
            admin?.department?.isRole != EnumRole.Deputy_manager
        ) {
            await AdminActions.update(admin._id, {
                'department.isRole': EnumRole.Leader
            } as any);
        }
        if (team.leader?.id == admin?.id) {
            return true;
        } else {
            await TeamModel.update(
                { _id: team._id },
                {
                    $set: {
                        leader: admin._id
                    }
                }
            );
            const oldLeader = await TeamModel.findOne({
                id: { $ne: team.id },
                leader: team.leader?._id
            }).populate('leader');
            if (
                !oldLeader &&
                team.leader?.department?.isRole != EnumRole.Manager &&
                team.leader?.department?.isRole != EnumRole.Deputy_manager
            ) {
                await AdminActions.update(team.leader?._id, {
                    'department.isRole': EnumRole.Staff
                } as any);
            }
            return true;
        }
    }
}
