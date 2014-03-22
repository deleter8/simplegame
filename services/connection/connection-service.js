var server = require('http').createServer(handler);
var io = require('socket.io').listen(server);
var fs = require('fs');
var Promise = require("bluebird");

function Service(){

}

Service.prototype.start = function(port){

    function handler (req, res) {
        res.writeHead(404);
        res.end(null);
    }

    io.sockets.on('connection', function (socket) {
        //TODO: add socket to list, remove on disconnect. allow adding event listeners after the fact, use promises maybe internally
        socket.emit('initEvent', { 'data': 'value' });
        socket.on('secondEvent', function (data) {
            socket.emit('finalEvent', {'echoData':data, 'data':'finalValue'})
        });
        socket.on('disconnect', function(){});
    });

    server.listen(port);


    //new Promise(function (resolve, reject) {
};


module.exports = {
    'Service':Service
};
