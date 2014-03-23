var service = new (require('./connection-service').Service)();

service.init();
service.run(10080);