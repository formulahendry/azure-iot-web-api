var express = require('express');
var router = express.Router();
var clientFromConnectionString = require('azure-iot-device-http').clientFromConnectionString;
var Message = require('azure-iot-device').Message;

router.get('/', function (req, apiRes) {
    var client = clientFromConnectionString(req.query.connectionString);
    var message = req.query.message

    client.sendEvent(new Message(JSON.stringify(message)), sendEventDone(true, client, apiRes));
});

function sendEventDone(close, client, apiRes) {
    return function printResult(err, res) {
        if (err) {
            console.log('error: ' + err.toString());
            apiRes.status(500).send(err.toString())
        }
        if (res) {
            console.log('status: ' + res.constructor.name + ' ' + res.statusMessage);
            apiRes.send('ok')
        }
        if (close) {
            client.close((err, result) => { console.log('client close') });
        }
    };
}

module.exports = router;