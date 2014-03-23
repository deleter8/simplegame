var should = require('should');
var assert = require('assert');
var request = require('supertest');
var serviceUnderTest = require('../connection-service.js').Service;


describe('Unit Tests', function () {
    this.timeout(60 * 1000);

    var service = new serviceUnderTest();
    var port = 11080;
    var url = "http://localhost:" + port;
    var testUsername = 'testuser';
    var testUserPassword = '1234';
    var badUsername = 'dontexist';
    var badUserPassword = 'nope';
    var bannedUsername = 'banneduser';
    var bannedUserPassword = 'deservedit';

    var giveLoggedInSession = function(handler){
        request(url)
            .post('/login')
            .send({'username':testUsername, 'password':testUserPassword})
            .set('Accept', 'application/json')
            .expect(200)
            .expect('set-cookie', /connect.sid[.]*/)
            .end(function(err, res){
                if (err) return done(err);
                res.body.should.have.property('success').which.equal(true);
                res.header.should.have.property('set-cookie');
                var cookie = res.header['set-cookie'][0];
                cookie = cookie.substr(0,cookie.indexOf(';'));
                return handler(cookie)
            });
    };

    process.env['SESSION_KEY_SECRET'] = "not so secret";

    before(function(done) {
        service.init();
        service.addUser(testUsername, testUserPassword, false);
        service.addUser(bannedUsername, bannedUserPassword, true);
        service.run(port);
        done();
    });

    after(function(done) {
        service.stop();
        done();
    });

    it('should give null user when not logged in', function(done) {

        request(url)
            .get('/user')
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                res.body.should.have.property('username');
                assert.equal(res.body['username'], null, 'username should be null' );
                return done();
            });
    });

    it('should not send auth only data when user not logged in', function(done){

        request(url)
            .get('/authonly')
            .set('Accept', 'application/json')
            .expect(401)
            .end(function(err, res){
                if (err) return done(err);
                res.body.should.have.property('info').which.equal('this data requires login');
                return done();
            })
    });

    it('should be log in and send cookie for valid credentials', function(done){

        request(url)
            .post('/login')
            .send({'username':testUsername, 'password':testUserPassword})
            .set('Accept', 'application/json')
            .expect(200)
            .expect('set-cookie', /connect.sid[.]*/)
            .end(function(err, res){
                if (err) return done(err);
                res.body.should.have.property('success').which.equal(true);
                return done();
            })
    });

    it('should send auth only data when user logged in', function(done){
        giveLoggedInSession(function(cookie){
            return request(url)
                .get('/authonly')
                .set('Accept', 'application/json')
                .set('Cookie', cookie)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    res.body.should.have.property('exclusive').which.equal('user data only!');
                    return done();
                })
        });
    });

    it('should send auth only data when user logged in', function(done){
        giveLoggedInSession(function(cookie){
            return request(url)
                .get('/authonly')
                .set('Accept', 'application/json')
                .set('Cookie', cookie)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    res.body.should.have.property('exclusive').which.equal('user data only!');
                    return done();
                })
        });
    });

    it('should delete session and logout when requested', function(done){
        giveLoggedInSession(function(cookie){
            return request(url)
                .get('/logout')
                .set('Accept', 'application/json')
                .set('Cookie', cookie)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    res.body.should.have.property('success').which.equal(true);
                    return request(url)
                        .get('/authonly')
                        .set('Accept', 'application/json')
                        .set('Cookie', cookie)
                        .expect(401)
                        .end(function(err, res){
                            if (err) return done(err);
                            res.body.should.have.property('info').which.equal('this data requires login');
                            return done();
                        })
                })
        });
    });

    it('should not log in banned credentials', function(done){

        request(url)
            .post('/login')
            .send({'username':bannedUsername, 'password':bannedUserPassword})
            .set('Accept', 'application/json')
            .expect(401)
            .end(function(err, res){
                if (err) return done(err);
                res.body.should.have.property('message').which.equal("This username has been banned");
                return done();
            })
    });

    it('should not log in credentials with wrong password', function(done){

        request(url)
            .post('/login')
            .send({'username':testUsername, 'password':badUserPassword})
            .set('Accept', 'application/json')
            .expect(401)
            .end(function(err, res){
                if (err) return done(err);
                res.body.should.have.property('message').which.equal("Invalid login");
                return done();
            })
    });

    it('should not log in credentials with invalid username', function(done){

        request(url)
            .post('/login')
            .send({'username':badUsername, 'password':testUserPassword})
            .set('Accept', 'application/json')
            .expect(401)
            .end(function(err, res){
                if (err) return done(err);
                res.body.should.have.property('message').which.equal("Invalid login");
                return done();
            })
    });

    it('should send same response regardless of which part of credentials was wrong', function(done){

        request(url)
            .post('/login')
            .send({'username':testUsername, 'password':badUserPassword})
            .set('Accept', 'application/json')
            .expect(401)
            .end(function(err, res){
                if (err) return done(err);
                var badPasswordBody = res.body;

                return request(url)
                    .post('/login')
                        .send({'username':badUsername, 'password':testUserPassword})
                        .set('Accept', 'application/json')
                        .expect(401)
                        .end(function(err, res){
                            if (err) return done(err);
                            res.body.should.eql(badPasswordBody);
                            return done();
                        });
            })
    });
});
