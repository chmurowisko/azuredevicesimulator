import { Subject } from "rxjs/Subject";
import { DeviceMethod } from "./device-method.model";

export interface DeviceMethodSubscriber {
    [key: string]: Subject<DeviceMethod> 
}