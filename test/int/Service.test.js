"use strict";

const assert = require("assert");
const Logger = require("log4bro");
const uuid = require("uuid");

const {
    FaceHugger
} = require("./../../index.js");

describe("Service INT", function(){

    const moduleFile = "./../../test/TestProcess.js";
    const log = new Logger({level: "DEBUG"});
    const config = {
        autoRestart: true,
        forkDelay: 10
    };
    const faceHugger = new FaceHugger(moduleFile, log, config);

    it("should be able to start process", function(done){
        faceHugger.start({});
        faceHugger.once("ready", () => {
            assert.ok(faceHugger.fork.isConnected);
            done();
        });
    });

    it("should run for a while", function(done){
        setTimeout(done, 1500);
    });

    it("should still be alive", function(){
        return faceHugger.fork.pullMetrics().then(metrics => {
            //console.log(metrics);
            assert.ok(metrics);
            return true;
        });
    });

    it("should be able to log on different levels", function(){
        return faceHugger.fork.runTask("log-test", {}).catch(error => {
            assert.ifError(error);
        });
    });

    it("should be able to catch error for throwing task", function(done){
        faceHugger.fork.runTask("test-throw", {arg1: 456}).catch(error => {
            //console.log(error);
            assert.ok(error.message.indexOf("took to long to run task") !== -1);
            done();
        });
    });
    
    it("should be able to run task", function(){
        return faceHugger.fork.runTask("test-cb", {arg1: 123}).then(result => {
            //console.log(result);
            assert.ok(result);
            return true;
        });
    });
    
   it("should be able to catch error for bad task", function(done){
        faceHugger.fork.runTask("test-error", {arg1: 321}).catch(error => {
            //console.log(error);
            assert.equal(error.message, "an error");
            done();
        });
    });

    it("should be able to catch error for task timeout", function(done){
        faceHugger.fork.runTask("test-timeout", {arg1: 456}).catch(error => {
            //console.log(error);
            assert.ok(error.message.indexOf("took to long to run task") !== -1);
            done();
        });
    });

    it("should be able to catch error for non existing task", function(done){
        faceHugger.fork.runTask("test-dont-exist", {arg1: 456}).catch(error => {
            //console.log(error);
            assert.ok(error.message.indexOf("took to long to run task") !== -1);
            done();
        });
    });

    it("should see empty callback stack", function(done){
        assert.equal(Object.keys(faceHugger.fork.stack).length, 0);
        setTimeout(done, 1);
    });

    it("should be able to reset stack if size exceeds", function(done){
        for(let i = 0; i < 1e5 + 1; i++){
            faceHugger.fork.stack[uuid.v4()] = "lol";
        }
        assert.equal(Object.keys(faceHugger.fork.stack).length, 1e5 + 1);
        faceHugger.fork.runTask("bla").catch(_ => {});
        assert.equal(Object.keys(faceHugger.fork.stack).length, 1);
        setTimeout(done, 110);
    });

    it("should be able to restart", function(done){
        faceHugger.restart();
        setTimeout(done, 500); //await restart
    });

    it("should be able to run task again", function(){
        return faceHugger.fork.runTask("test-cb", {arg1: 789}).then(result => {
            //console.log(result);
            assert.ok(result);
            return true;
        });
    });

    it("should be able to run task through queue", function(){

        faceHugger.setQueueConcurrency(1);
        const p = faceHugger.runQueueTask("test-cb", {arg1: 789});

        //console.log(faceHugger.getQueueSize());
        assert.ok(faceHugger.getQueueSize());

        return p.then(result => {
            //console.log(result);
            assert.ok(result);

            //console.log(faceHugger.getQueueSize());
            assert.ifError(faceHugger.getQueueSize());

            return true;
        });
    });

    it("should be able to stop fork without restart", function(done){
        faceHugger.fork.kill(true);
        setTimeout(done, 1000);
    });

    it("should not see a reconnected fork process", function(done){
        assert.ok(!faceHugger.fork.isConnected);
        assert.ok(faceHugger.fork.isClosed);
        assert.ok(!faceHugger.child);
        done();
    });
});
