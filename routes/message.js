var express = require('express');
var router = express.Router();
var clientFromConnectionString = require('azure-iot-device-http').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var EventHubClient = require('azure-event-hubs').Client;

router.post('/', function (req, res) {
    var client = clientFromConnectionString(req.query.connectionString);
    var message = req.query.message;

    client.sendEvent(new Message(JSON.stringify(message)), sendEventDone(true, client, res));
});

function sendEventDone(close, client, res) {
    return function printResult(err, d2cRes) {
        if (err) {
            console.log('error: ' + err.toString());
            res.status(500).send(err.toString())
        }
        if (d2cRes) {
            console.log('status: ' + d2cRes.constructor.name + ' ' + d2cRes.statusMessage);
            res.send('ok')
        }
        if (close) {
            client.close((err, result) => { console.log('client close') });
        }
    };
}

router.get('/monitor', function (req, res) {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
    });

    res.write("data: Start monitoring...\n\n");

    var client = EventHubClient.fromConnectionString(req.query.connectionString);
    var consumerGroup = req.query.consumerGroup ? req.query.consumerGroup : '$Default';
    client.open()
    .then(client.getPartitionIds.bind(client))
    .then(function (partitionIds) {
        return partitionIds.map(function (partitionId) {
            return client.createReceiver(consumerGroup, partitionId, { 'startAfterTime' : Date.now()}).then(function(receiver) {
                console.log('Created partition receiver [' + partitionId + '] for consumerGroup [' + consumerGroup + ']');
                writeSSEData(res, 'Created partition receiver [' + partitionId + '] for consumerGroup [' + consumerGroup + ']');
                receiver.on('errorReceived', printError(res, client));
                receiver.on('message', printMessage(res));
            });
        });
    })
    .catch(printError);
});

function printError(res, client) {
    return function (err) {
        writeSSEData(res, err.message);
        writeSSEData(res, 'Stop monitoring...');
        console.log(err.message);
        console.log('Stop monitoring...');
        client.close();
    };
};

function printMessage(res) {
    return function (message) {
        writeSSEData(res, 'Message received: ');
        writeSSEData(res, JSON.stringify(message.body));
        writeSSEData(res, '');
        console.log('Message received: ');
        console.log(JSON.stringify(message.body));
        console.log('');
    };
};

function writeSSEData(res, data) {
    var dataList = data.split('\n');
    for (x in dataList) {
        res.write("data:" + dataList[x] + "\n\n");
    }
}

module.exports = router;