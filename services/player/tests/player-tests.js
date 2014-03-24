var should = require('should');
var assert = require('assert');
var request = require('supertest');
var serviceUnderTest = require('../player-service.js').Service;
var Promise = require("bluebird");
var rabbit = require("rabbit.js");

describe('Service Tests', function () {
    this.timeout(15 * 1000);

    var service = new serviceUnderTest();
    var port = 11080;
    var url = "http://localhost:" + port;
    var testUsername = 'testuser';
    var testUserPassword = '1234';
    var badUsername = 'dontexist';
    var badUserPassword = 'nope';
    var bannedUsername = 'banneduser';
    var bannedUserPassword = 'deservedit';

    var getContext = new Promise(function(resolve, reject){
        var context= rabbit.createContext(process.env['RABBIT_URI']);

        context.on('ready', function() {
            resolve(context);
        });

        context.on('err', function(err){
            reject(err);
        });

    });

    var createSocket = function(type, exchange, topic){
        return getContext
        .then(function(context){
                console.log('a');
            return new Promise( function(resolve, reject){
                var socket = context.socket(type);
                console.log('aa');
                topic = topic || '';

                socket.connect(exchange, topic, function(){
                    console.log('aaa');
                    return resolve(socket);
                });
            });
        });
    };

    var publishMessage = function(message){
        return function(socket){
            console.log('aaaaB');
            return new Promise(function(resolve, reject){
                console.log('aaaaaG');
                socket.write(message);
                resolve(socket);
            })
        }
    };

    var expectMessage = function(expectedMessage){
        return function(socket){
            console.log('a6');
            return new Promise(function(resolve, reject){
                console.log('a7');
                socket.on('data', function(receivedMessage){
                    console.log('a8');
                    if(expectedMessage instanceof RegExp){
                        if(expectedMessage.test(receivedMessage)){
                            resolve(socket);
                            //reject(new Error("received message did not match expected. received: '" + receivedMessage + "' expected: '" + expectedMessage + "'"))
                        }
                    }else{
                        if(expectedMessage === receivedMessage){
                            resolve(socket);
                            //reject(new Error("received message did not match expected. received: '" + receivedMessage + "' expected: '" + expectedMessage + "'"))
                        }
                    }

                    //resolve(socket);
                })
            });
        }
    };

    before(function(done) {
        service.run()
        .then(done)
        .catch(done);
    });

    after(function(done) {
        service.stop()
        .then(done)
        .catch(done);
    });

    //should receive when no topic, should receive on topic, should not receive on other topic or general when pub on topic
    //req/rec (gets when should, doesnt when not)
    it('should rabbit', function(done){
        var message = 'test_message';

        var sub = createSocket('SUB', 'events')
        .then(expectMessage(message));

        var pub = createSocket('PUB', 'events')
        .then(publishMessage(message));

        Promise.all(pub,sub)
        .then(done, done);
    });

});
