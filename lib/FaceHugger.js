"use strict";

const Process = require("./Process.js");

class FaceHugger {

    constructor(moduleFile, logger, config){
        this.config = config;
        this.moduleFile = moduleFile;
        this.logger = logger;
        this.fork = new Process(this.logger, this.config.autoRestart, this.config.forkDelay);
    }

    start(data){
        
        if(!this.fork){
            this.fork = new Process(this.logger, this.config.autoRestart, this.config.forkDelay);
        }

        return this.fork.spawn(this.moduleFile, data);
    }

    stop(){
        if(this.fork){
            this.fork.kill(true);
            this.fork = null;
        }
    }

    restart(){
        if(this.fork){
            this.fork.kill();
        }
    }

    pullMetrics(){
        if(this.fork){
            this.fork.pullMetrics(...args);
        }
    }

    runTask(...args){
        if(this.fork){
            this.fork.runTask(...args);
        }
    }

    getFork(){
        return this.fork;
    }

    on(...args) {
        this.fork.on(...args);
    }

    once(...args) {
        this.fork.once(...args);
    }

    removeListener(...args){
        this.fork.removeListener(...args);
    }

    emit(...args){
        this.fork.emit(...args);
    }
}

module.exports = FaceHugger;