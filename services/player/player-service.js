var Promise = require("bluebird");
var path = require('path');
var rabbit = require('rabbit.js');


function Service(){
    this.context = null;
}

Service.prototype.run = function(){
    var self = this;

    return new Promise(function(resolve, reject){
        if(!!self.context){
            console.log("connection already started");
            reject(new Error("connection already started"));
            return;
        }
        console.log("trying to create context");
        self.context = rabbit.createContext(process.env['RABBIT_URI']);
        console.log("context setup");

        self.context.on('ready', function() {
            console.log("connection successful");
            console.log("trying to set up sockets");
            var pub = self.context.socket('PUB');
            var sub = self.context.socket('SUB');
            //sub.pipe(process.stdout);
            console.log("sockets setup");
            sub.connect('events', function() {

                console.log("subscribe is connected");
                pub.connect('events', function() {
                    console.log("publish is connected, sending message");
                    //pub.write(JSON.stringify({welcome: 'rabbit.js'}), 'utf8');

                    sub.on('data',function(message){
                        console.log("message recieved: " + message);
                        if(/echo(.)*/.test(message)){
                            pub.write(message.substr(4), 'utf8');
                        }

                    });

                    resolve();
                });
            });

            //console.log("resolving ");
            //return resolve();
        });

        self.context.on('error',function(err){
            console.log("error hit " + err);
            return reject(err);
        });
    });

};

Service.prototype.stop = function(){
    var self = this;
    return new Promise(function(resolve, reject){
        if(!self.context){
            reject(new Error("no connection to terminate"));
            return;
        }

        self.context.on('close', function(err){
            self.context = null;
            return resolve(err);
        });

        self.context.close();
    });
};

module.exports = {
    'Service':Service
};
