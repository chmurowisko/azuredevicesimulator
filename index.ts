import { DeviceSimulatorService } from './services/device-simulator.service';
import { AzureDeviceConnector } from './connectors/azure.mqtt.connector';
import { Constants } from "./app.constants";

(function main() {
    console.log('App initialized...');
    var mqttConnector = new AzureDeviceConnector();
    var deviceSimulator = new DeviceSimulatorService();
    mqttConnector.subscribeForDeviceMethod('file').subscribe(data => {
        console.log(data.eventName);
        console.log(data.payload);
        data.response.send(200);
        deviceSimulator.generateFileData().then(binaryFile => {
            mqttConnector.uploadFile(binaryFile.fileName, binaryFile.data, binaryFile.length).subscribe(data => {
                console.log('Blob sending end. Errors:', data);
            });
        }).catch(error => console.log(error));
    });
    mqttConnector.connectToIotHub(Constants.DeviceConnectionString);

    mqttConnector.subscribeForConfiguration().subscribe(config => {
        deviceSimulator.updateConfiguration(config);
    });
    deviceSimulator.generateRandomDataInTimeInterval().subscribe((data) => {
        mqttConnector.sendMessageToCloud(data, {messageType:'metrics'});
    });
    deviceSimulator.generateEventsInTimeInterval(60000).subscribe(event => {
        mqttConnector.sendMessageToCloud(event, {messageType: 'events'});
    });
    mqttConnector.subscribeForReceivedMessage().subscribe((data) => {
        if (data) {
            try {
                deviceSimulator.receiveMessageFromDevice(data);
            }
            catch (e) {
                console.log(e);
            }
        }
    });

    deviceSimulator.configurationUpdatedSubscription().subscribe(isCompleted => {
        if (isCompleted) {
            mqttConnector.completeConfigChange();
        }
    });
})();

