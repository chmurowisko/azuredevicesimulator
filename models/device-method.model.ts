export interface DeviceMethod{
    eventName: string;
    payload: any;
    requestId:string;
    response: {send: (status:number, payload?:any, done?:(error?:any)=>void)=>void};
}