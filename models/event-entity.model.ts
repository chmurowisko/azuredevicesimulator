import { BaseData } from "./base-data.model";

export interface EventEntity extends BaseData {
    message: string;
    level: string;
    state: string;
    id: number;
}