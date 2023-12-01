import { Request } from 'express';
import User from '../models/user';
import Admin from '../models/admin';
import { RoleCode } from '../const/role';
import { EnumAction } from 'app/models/department';

declare interface PublicRequest extends Request {
  apiKey: string;
  t: (__key: string, ...args?: any) => string
}

declare interface RoleRequest extends PublicRequest {
  required_role: RoleCode[];
}

declare interface ProtectedRequest extends RoleRequest {
  user: any;
  permission: any;
  access_token: string;
  old_data?:any
  new_data?:any
}

declare interface InternalRequest extends ProtectedRequest {
  apiKey: string;
}

declare interface Tokens {
  accessToken: string;
  refreshToken: string;
}
