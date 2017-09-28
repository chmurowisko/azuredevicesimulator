export interface C2DMessage {

    transportObj: {
        messageAnnotations: {
            "x-opt-sequence-number": number,
            'iothub-enqueuedtime': Date,
            'iothub-deliverycount': number
        },
        properties: {
            messageId: string,
            userId: any,
            to: string,
            subject: string,
            replyTo: string,
            correlationId: any,
            contentType: any,
            contentEncoding: any,
            absoluteExpiryTime: any,
            creationTime: any,
            groupId: any,
            groupSequence: any,
            replyToGroupId: any,
        },
        applicationProperties: { [key: string]: string },
        body: ArrayBuffer
    }
}