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

            sub.connect('events', function() {
                pub.connect('events', function() {

                    sub.on('data',function(data){
                        var message = '' + data;
                        if(/echo(.)*/.test(message)){
                            pub.write(message.substring(4), 'utf8');
                        }

                    });

                    resolve();
                });
            });

            var pubTopics = self.context.socket('PUB');
            var subTopics = self.context.socket('SUB');
            console.log("sockets setup");

            pubTopics.options.routing = 'topic';
            pubTopics.setsockopt('topic', 'critical');

            subTopics.options.routing = 'topic';
            subTopics.setsockopt('topic', 'critical');

            subTopics.connect('eventtopics', 'critical', function() {
                pubTopics.connect('eventtopics', function() {
                    subTopics.on('data',function(data){
                        var message = '' + data;
                        if(/echo(.)*/.test(message)){
                            pubTopics.write(message.substring(4), 'utf8');
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
