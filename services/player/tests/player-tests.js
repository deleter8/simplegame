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
    var context = null;

    var getContext = new Promise(function(resolve, reject){
        context= rabbit.createContext(process.env['RABBIT_URI']);

        context.on('ready', function() {
            resolve({'context':context});
        });

        context.on('err', function(err){
            reject(err);
        });

    });

    var createSocket = function(type, exchange, topic){
        return function(state){
            return new Promise( function(resolve, reject){
                state[type + 'socket'] = state.context.socket(type);
                topic = topic || '';

                state.context.on('error', function(err){
                    console.log("error" + JSON.stringify(err));
                    reject(err);
                });

                var handler = function(){
                    return resolve(state);
                };

                if(topic != ''){
                    state[type+'socket'].options.routing = 'topic';
                    state[type+'socket'].setsockopt('topic', topic);
                }

                if(topic != '' && type.substring(0,3).toLowerCase() == 'sub'){
                    state[type + 'socket'].connect(exchange, topic, handler);
                }else{
                    state.topic = topic;
                    state[type + 'socket'].connect(exchange, handler);
                }
            });
        };
    };

    var publishMessage = function(message){
        return function(state){
            return new Promise(function(resolve, reject){
                state['PUBsocket'].write(message);
                resolve(state);
            })
        }
    };

    var startListeningForMessage = function(expectedMessage){
        return function(state){
            return new Promise(function(resolve, reject){
                state.defer = Promise.pending();

                state['SUBsocket'].on('data', function(receivedMessage){
                    if(expectedMessage instanceof RegExp){
                        if(expectedMessage.test(receivedMessage)){
                            state.defer.fulfill(receivedMessage);
                        }
                    }else{
                        if(expectedMessage == receivedMessage){
                            state.defer.fulfill(receivedMessage);
                        }
                    }
                });

                resolve(state);
            });
        }
    };

    var confirmMessageReceived = function(){
        return function(state){
            return state.defer.promise.then(function(receivedMessage){});
        }
    };

    //this could be done better
    var confirmMessageNotReceived = function(){
        return function(state){
            return new Promise(function(resolve, reject){
                state.defer.promise
                    .timeout(1 * 1000)
                    .then(function(){
                        reject(new Error("should not have received message"));
                    })
                    .catch(Promise.TimeoutError, function() {
                        resolve();
                    });
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
    it('should echo message', function(done){
        var message = 'test_message';

        var promise = getContext
            .then(createSocket('SUB', 'events'))
            .then(createSocket('PUB', 'events'))
            .then(startListeningForMessage(message))
            .then(publishMessage('echo'+message))
            .then(confirmMessageReceived());

        promise
        .then(done, done);
    });

    it('should echo message with topic', function(done){
        var message = 'test_message';

        var promise = getContext
            .then(createSocket('SUB', 'eventtopics', 'critical'))
            .then(createSocket('PUB', 'eventtopics', 'critical'))
            .then(startListeningForMessage(message))
            .then(publishMessage('echo'+message))
            .then(confirmMessageReceived());

        promise
            .then(done, done);
    });

    it('should not receive echo when topic does not match', function(done){
        var message = 'test_message';

        var promise = getContext
            .then(createSocket('SUB', 'eventtopics', 'critical'))
            .then(createSocket('PUB', 'eventtopics', 'warning'))
            .then(startListeningForMessage(message))
            .then(publishMessage('echo'+message))
            .then(confirmMessageNotReceived());

        promise
            .then(done, done);
    });

});
