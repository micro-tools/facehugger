"use strict";

const Process = require("./Process.js");

class FaceHugger {

    constructor(moduleFile, logger){
        this.moduleFile = moduleFile;
        this.logger = logger;
        this.fork = new Process(this.logger);
    }

    start(data){
        
        if(!this.fork){
            this.fork = new Process(this.logger);
        }

        return this.fork.spawn(this.moduleFile, data);
    }

    stop(){
        if(this.fork){
            this.fork.kill();
            this.fork = null;
        }
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