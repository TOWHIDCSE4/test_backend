import { ProtectedRequest } from 'app-request';
import TeamActions from '../actions/team';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import Team from '../models/team';
import DepartmentActions from '../actions/department';
import AdminActions from '../actions/admin';
import { isArray } from 'lodash';

export default class TeamController {
    public static async getAllTeamPagination(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number } = req.query;
        const teams = await TeamActions.findAllPagination({
            paginationInfo: {
                page_number: Number(page_number || 0),
                page_size: Number(page_size || 0)
            }
        });
        return new SuccessResponse('success', teams).send(res, req);
    }

    public static async getAllTeam(req: ProtectedRequest, res: Response) {
        const filter: any = {
            isActive: true
        };
        const teams = await TeamActions.findAll({ filter });
        return new SuccessResponse('success', teams).send(res, req);
    }

    public static async getTeam(req: ProtectedRequest, res: Response) {
        const { code } = req.params;
        const team = await TeamActions.findOne({
            filter: { code, isActive: true }
        });
        if (!team) throw new NotFoundError('Không tìm thấy phòng/ban');
        return new SuccessResponse('success', team).send(res, req);
    }

    public static async createTeam(req: ProtectedRequest, res: Response) {
        const { name, description, idDepartment, idLeader, idMembers } =
            req.body;
        const department = await DepartmentActions.findOne({
            filter: { id: Number(idDepartment) || undefined, isActive: true }
        });
        if (!department)
            throw new BadRequestError(req.t('errors.department.not_found'));
        let member_Id = [];
        if (idMembers && isArray(idMembers)) {
            const members = await AdminActions.findAll({
                id: {
                    $in:
                        idMembers
                            ?.map((i) => Number(i))
                            .filter((i) => i !== Number(idLeader)) || []
                }
            });
            member_Id = members.map((m) => m?._id);
        }
        const team = await TeamActions.create({
            name,
            description,
            members: member_Id,
            department: department._id
        } as Team);
        try {
            if (idLeader) {
                await TeamActions.updateLeader(team?._id, idLeader);
            }
        } catch (error: any) {
            throw new BadRequestError(error?.message);
        }
        return new SuccessResponse('success', team).send(res, req);
    }

    public static async editTeam(req: ProtectedRequest, res: Response) {
        const { name, description, idDepartment, idLeader, idMembers } =
            req.body;
        const { idTeam } = req.params;
        const team = await TeamActions.findOne({
            filter: { id: Number(idTeam), isActive: true }
        });
        if (!team) throw new NotFoundError('Không tìm thấy nhóm');
        const department = await DepartmentActions.findOne({
            filter: { id: Number(idDepartment) || undefined, isActive: true }
        });
        if (!department)
            throw new BadRequestError(req.t('errors.department.not_found'));
        let member_Id = [];
        if (idMembers && isArray(idMembers)) {
            const members = await AdminActions.findAll({
                id: {
                    $in:
                        idMembers
                            ?.map((i) => Number(i))
                            .filter((i) => i !== Number(idLeader)) || []
                }
            });
            member_Id = members.map((m) => m?._id);
        }
        const newTeam = await TeamActions.update(team._id, {
            $set: {
                name,
                description,
                members: member_Id,
                department: department._id
            }
        });
        try {
            if (idLeader) {
                await TeamActions.updateLeader(team?._id, idLeader);
            }
        } catch (error: any) {
            throw new BadRequestError(error?.message);
        }
        return new SuccessResponse('success', newTeam).send(res, req);
    }

    public static async deleteTeam(req: ProtectedRequest, res: Response) {
        const { idTeam } = req.params;
        const team = await TeamActions.findOne({
            filter: { id: Number(idTeam), isActive: true }
        });
        if (!team) throw new NotFoundError('Không tìm thấy phòng/ban');
        await TeamActions.update(team._id, { $set: { isActive: false } });
        return new SuccessResponse('success', 'Xóa thành công').send(res, req);
    }
}
