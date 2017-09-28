export interface DeviceConfiguration{
    configId: number;
    dataInterval: number;
    status?: string;
    pendingConfig?: DeviceConfiguration; 
}