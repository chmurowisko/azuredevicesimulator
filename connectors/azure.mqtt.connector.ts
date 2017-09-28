import { Message, Client } from 'azure-iot-device';
import { clientFromConnectionString } from 'azure-iot-device-mqtt';
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { C2DMessage } from "../models/c2d-message.model";
import { DeviceConfiguration } from "../models/device-configuration.model";
import { Twin } from "azure-iot-device/lib/twin";
import { Subject } from "rxjs/Subject";
import { DeviceMethod } from "../models/device-method.model";
import { Observable } from "rxjs/observable";
import { DeviceMethodSubscriber } from "../models/device-subscriber.model";
import { Stream } from "stream";
export class AzureDeviceConnector {
    private methodSubsribers: DeviceMethodSubscriber;
    private twin: Twin;
    client: Client;
    private $receivedMessage: BehaviorSubject<C2DMessage>;
    private $configChanged: Subject<DeviceConfiguration>;
    private $deviceCommand: Subject<DeviceMethod>;
    constructor() {
        this.$receivedMessage = new BehaviorSubject(null);
        this.$configChanged = new Subject<DeviceConfiguration>();
        this.$deviceCommand = new Subject();
        this.methodSubsribers = {};
    }
    subscribeForReceivedMessage(): BehaviorSubject<C2DMessage> {
        return this.$receivedMessage;
    }
    subscribeForConfiguration(): Subject<DeviceConfiguration> {
        return this.$configChanged;
    }
    subscribeForDeviceMethod(method: string): Subject<DeviceMethod> {
        if (!this.methodSubsribers[method]) {
            this.methodSubsribers[method] = new Subject();
        }
        return this.methodSubsribers[method];
    }
    sendMessageToCloud(message, properties?: any) {
        var data = JSON.stringify(message);
        var iotMessage = new Message(data);
        for (let key in properties) {
            iotMessage.properties.add(key, properties[key]);
        }
        console.log("Data sended to cloud. Properties: ", properties);
        this.client.sendEvent(iotMessage, this.printResultFor('send'));
    }
    printResultFor(op) {
        return function printResult(err, res) {
            if (err) console.log(op + ' error: ' + err.toString());
            if (res) console.log(op + ' status: ' + res.constructor.name);
        };
    }
    connectToIotHub(connectionString) {
        this.client = clientFromConnectionString(connectionString);
        this.client.open((error) => {
            if (error) {
                console.log("Could not connect: " + error);
            } else {
                this.getTwinData();
            }
        });
        this.client.addListener("message", (data) => {
            this.$receivedMessage.next(data);
        });
        this.getTwinData();
        this.readDeviceMethods();
    }
    private readDeviceMethods() {
        for (var key in this.methodSubsribers) {
            console.log(key);
            this.client.onDeviceMethod(key, ((request, response) => {
                this.methodSubsribers[key].next({
                    eventName: request.methodName,
                    payload: request.payload,
                    requestId: request.requestId,
                    response: response
                });
            }));
        }
    }
    private getTwinData() {
        let telemetryConfig: DeviceConfiguration = {
            configId: 0,
            dataInterval: 3000
        };
        this.client.getTwin((err, twin) => {
            if (err) {
                console.error('could not get twin');
            } else {
                this.twin = twin;
                console.log('retrieved device twin');
                twin.properties.reported.telemetryConfig = telemetryConfig;
                twin.on('properties.desired', (desiredChange) => {
                    console.log("received change: " + JSON.stringify(desiredChange));
                    var currentTelemetryConfig = twin.properties.reported.telemetryConfig;
                    if (desiredChange.telemetryConfig && desiredChange.telemetryConfig.configId !== currentTelemetryConfig.configId) {
                        this.initConfigChange(twin);
                    }
                });
            }
        });
    }
    private initConfigChange(twin) {
        let currentTelemetryConfig: DeviceConfiguration = twin.properties.reported.telemetryConfig;
        currentTelemetryConfig.pendingConfig = twin.properties.desired.telemetryConfig;
        currentTelemetryConfig.status = "Pending";

        let patch = {
            telemetryConfig: currentTelemetryConfig
        };
        twin.properties.reported.update(patch, (err) => {
            if (err) {
                console.log('Could not report properties');
            } else {
                console.log('Reported pending config change: ' + JSON.stringify(patch));
                this.$configChanged.next(currentTelemetryConfig.pendingConfig);

            }
        });
    }
    completeConfigChange() {
        let currentTelemetryConfig: DeviceConfiguration = this.twin.properties.reported.telemetryConfig;
        currentTelemetryConfig.configId = currentTelemetryConfig.pendingConfig.configId;
        currentTelemetryConfig.dataInterval = currentTelemetryConfig.pendingConfig.dataInterval;
        currentTelemetryConfig.status = "Success";
        delete currentTelemetryConfig.pendingConfig;
        let patch = {
            telemetryConfig: currentTelemetryConfig
        };
        patch.telemetryConfig.pendingConfig = null;

        this.twin.properties.reported.update(patch, function (err) {
            if (err) {
                console.error('Error reporting properties: ' + err);
            } else {
                console.log('Reported completed config change: ' + JSON.stringify(patch));
            }
        });
    }
    uploadFile(fileName: string, stream: Stream, streamLength: number): Subject<any> {
        let result = new Subject()
        this.client.uploadToBlob(fileName, stream, streamLength, (err) => {
            result.next(err);
        });
        return result;
    }
}