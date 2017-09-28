import { Observable } from 'rxjs/observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { DataEntity } from "../models/data-entity.model";
import { EventEntity } from "../models/event-entity.model";
import { C2DMessage } from "../models/c2d-message.model";
import { DeviceConfiguration } from "../models/device-configuration.model";
import { Subject } from "rxjs/Subject";
import { Stream } from "stream";
import { BinaryFileData } from "../models/binary-file.model";
import { createReadStream, stat } from 'fs'
import { Constants } from "../app.constants";
export class DeviceSimulatorService {
    private configuration: DeviceConfiguration;
    private $data: BehaviorSubject<DataEntity>;
    private $events: BehaviorSubject<EventEntity>;
    private $binaryFiles: BehaviorSubject<any>;
    private $cloudToDeviceMessage: BehaviorSubject<any>;
    private $updatedConf: Subject<boolean>;
    constructor() {
        this.$data = new BehaviorSubject(null);
        this.$events = new BehaviorSubject(null);
        this.$updatedConf = new Subject();
        this.configuration = { configId: -1, dataInterval: 5000 }
    }
    generateRandomDataInTimeInterval(timeout: number = 30000): BehaviorSubject<DataEntity> {
        this.generateMetricData(this);
        return this.$data;
    }
    generateEventsInTimeInterval(timeout: number = 30000): BehaviorSubject<EventEntity> {
        this.generateStartEventsData(this, timeout);
        return this.$events;
    }
    private generateMetricData(self: DeviceSimulatorService) {
        if (self.configuration.status === 'Pending') {
            self.configuration.status = 'Completed';
            let updateOnDevice = this.configuration.configId !== -1;
            this.$updatedConf.next(updateOnDevice);
        }
        let dataJson: DataEntity = {
            messageType: 'measurements',
            metrics: {
                Group1: {
                    a1: Math.random() * 5,
                    a2: Math.random() * 8,
                    a3: Math.random() * 6
                },
                Group2: {
                    b1: Math.random() * (150 - 100) + 100,
                    b2: Math.random() * (200 - 180) + 180,
                    b3: Math.random() * (130 - 100) + 100,
                }
            },
            timestamp: Date.now()
        }
        self.$data.next(dataJson);

        setTimeout(() => {
            self.generateMetricData(self);
        }, self.configuration.dataInterval)
    }
    private generateStartEventsData(self: DeviceSimulatorService, timeout: number = 30000) {
        let alarmId = Math.random() * 1000;
        let dataJson: EventEntity = {
            messageType: "event",
            message: "Alarm " + alarmId,
            state: "start",
            level: "alarm",
            id: alarmId,
            timestamp: Date.now()

        }
        self.$events.next(dataJson);
        setTimeout(() => {
            self.generateEndEventData(self, timeout);
        }, timeout)
        setTimeout(() => {
            self.generateStartEventsData(self, timeout);
        }, 2 * timeout)
    }
    private generateEndEventData(self: DeviceSimulatorService, alarmId: number) {
        let dataJson: EventEntity = {
            messageType: "event",
            message: "Alarm end" + alarmId,
            state: "stop",
            level: "alarm",
            id: alarmId,
            timestamp: Date.now()
        }
        self.$events.next(dataJson);
    }

    generateFileData(): Promise<BinaryFileData> {
        return new Promise((resolve, reject) => {
            stat(Constants.FilePath, (err, stats) => {
                if (err) {
                    reject(err);
                }
                console.log(err, stats);
                let fileName = 'Data_' + new Date().getTime();
                let data = createReadStream(Constants.FilePath);
                resolve({ fileName: fileName, data: data, length: stats.size });
            });
        })

    }
    receiveMessageFromDevice(message: C2DMessage) {
        let properties = message.transportObj.applicationProperties;
        let bodyMessage = message.transportObj.body;
        console.log("Properties: ", properties);
        console.log("Body message: ", bodyMessage.toString());
    }
    configurationUpdatedSubscription(): Subject<boolean> {
        return this.$updatedConf;
    }
    updateConfiguration(conf: DeviceConfiguration) {
        this.configuration = conf;
        this.configuration.status = 'Pending';

    }

}