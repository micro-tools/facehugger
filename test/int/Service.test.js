"use strict";

const assert = require("assert");
const Logger = require("log4bro");

const {
    FaceHugger
} = require("./../../index.js");

describe("Service INT", function(){

    const moduleFile = "./../../test/TestProcess.js";
    const faceHugger = new FaceHugger(moduleFile, new Logger({level: "INFO"}));

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
            console.log(metrics);
            assert.ok(metrics);
            return true;
        })
    });
    
    it("should be able to run task", function(){
        return faceHugger.fork.runTask("test-cb", {arg1: 123}).then(result => {
            console.log(result);
            assert.ok(result);
            return true;
        })
    });
    
   it("should be able to catch error for bad task", function(done){
        return faceHugger.fork.runTask("test-error", {arg1: 321}).catch(error => {
            console.log(error);
            done();
        });
    });

    it("should be able to stop process", function(done){
        faceHugger.stop();
        assert.ok(!faceHugger.fork);
        done();
    });
});
