import { BaseData } from "./base-data.model";

export interface DataEntity extends BaseData {
   metrics:{
       [key: string]: { [key: string]: number}
   } 
}