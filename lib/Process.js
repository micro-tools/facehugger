"use strict";

const Promise = require("bluebird");
const { fork } = require("child_process");
const EventEmitter = require("events");
const path = require("path");
const fs = require("fs");
const uuid = require("uuid");

const FORK_OPTIONS = {
    detached: true,
    stdio: "ignore"
};

const MAX_STACK_SIZE = 1e5;

class Process extends EventEmitter {

    constructor(logger, autoRestart = false, forkDelay = 100) {
        super();

        this.logger = logger;
        this.autoRestart = autoRestart;
        this.forkDelay = forkDelay;

        this.child = null;
        this.data = null;
        this.lastSourceFile = null;

        this.isConnected = false;
        this.isClosed = true;
        this.haltRestart = false;

        this.stack = {};
        this.forkId = uuid.v4();
    }

    spawn(sourceFile, data = {}) {

        if(this.child){
            throw new Error("child is already running, cannot spawn another.");
        }

        this.lastSourceFile = sourceFile;
        this.data = data;
        this.isClosed = false;
        this.haltRestart = false;

        if (!path.isAbsolute(sourceFile)) {
            sourceFile = path.join(path.dirname(process.argv[1]), sourceFile);
        }

        const exists = fs.exists(sourceFile, exists => {

            if (!exists) {
                this.logger.error(`module ${sourceFile} does not exist, cannot start process for job as fork: ${this.forkId}.`);
                super.emit("close", true); //ends running queue-job
                return;
            }

            this.logger.info(`spawning process ${this.forkId} with module: ${sourceFile}.`);
            this.child = fork(sourceFile, [this.forkId], FORK_OPTIONS);

            this.child.on("error", error => {
                this.logger.error(`${this.forkId} child error ${error}.`);
            });

            this.child.on("disconnect", () => {
                this._handleClose("disconnected");
            });

            this.child.on("exit", () => {
                this._handleClose("exited");
            });

            this.child.on("close", () => {
                this._handleClose("closed");
            });

            this.child.on("message", message => {
                this.emit("message", message);
                this._handleMessage(message);
            });

            this.child.unref();
        });
    }

    _handleClose(type){

        if(this.isClosed){
            return;
        }

        this.isClosed = true;
        this.isConnected = false;
        this.child = null;

        this.logger.warn(`${this.forkId} child ${type}.`);
        this.emit("close", true);

        if(this.autoRestart){

            if(this.haltRestart){
                this.logger.debug(`autoRestart enabled, but restart halted for this close.`);
                return;
            }

            this.logger.info(`autoRestart enabled, will re-spawn fork ${this.forkId} in ${this.forkDelay} ms.`);
            setTimeout(() => {
                this.emit("restart", true);
                this.spawn(this.lastSourceFile, this.data);
            }, this.forkDelay);
        }
    }

    _handleMessage(message) {

        if (typeof message !== "object") {
            return;
        }

        if (typeof message.type === "undefined" ||
            typeof message.content === "undefined") {
            return;
        }

        switch (message.type) {

            case "id":
                if (this.forkId === message.content) {
                    this.logger.info(`forked process ${message.content} is connected.`);
                    this.isConnected = true;
                    this.send("data", this.data);
                    this.emit("ready", true);
                } else {
                    this.logger.error(`forked process ${this.forkId} send bad forkId: ${message.content}.`);
                }
                break;

            case "log":
                this.logger.info(`f-ipc-log:${this.forkId}: ${message.content}.`);
                break;

            case "metrics":
                super.emit("metrics", message.content);
                break;

            case "error":
                this.logger.error(`error in fork process: ${this.forkId}, ` +
                    `${(typeof message.content !== "string" ? JSON.stringify(message.content) : message.content)}.`);
                break;

            case "task":
                this._handleTaskResult(message.content);
                break;

            default:
                this.logger.warn(`received unknown message type: ${message.type} from f-ipc: ${this.forkId}.`);
                break;
        }
    }

    send(type, content) {
        if (this.child) {
            this.child.send({ type, content });
        } else {
            throw new Error("cannot send because child is null.");
        }
    }

    pullMetrics(description = {}, timeout = 2000) {
        return new Promise((resolve, reject) => {

            let received = false;
            const _t = setTimeout(() => {
                if (!received) {
                    received = true;
                    reject(new Error(`took to long to retrieve metrics for fork ${this.forkId}.`));
                }
            }, timeout);

            this.send("metrics", description);
            super.once("metrics", metrics => {
                if (!received) {
                    received = true;
                    clearTimeout(_t);
                    this.logger.debug(`received metrics for fork ${this.forkId}.`);
                    resolve(metrics);
                }
            });
        });
    }

    runTask(name, args = {}, timeout = 100){
        return new Promise((resolve, reject) => {
            
            if(Object.keys(this.stack).length > MAX_STACK_SIZE){
                this.logger.info(`stack size exceeded maximum ${MAX_STACK_SIZE} had to drop standing tasks.`);
                this.stack = {};
            }

            const task = {
                task: name,
                identifier: uuid.v4(),
                args
            };

            let received = false;
            const _t = setTimeout(() => {
                if (!received) {
                    received = true;
                    delete this.stack[task.identifier];
                    reject(new Error(`took to long to run task ${task.identifier} for fork ${this.forkId}.`));
                }
            }, timeout);

            this.stack[task.identifier] = (error, result) => {
                
                if (!received) {
                    received = true;
                    clearTimeout(_t);
                    this.logger.debug(`received task result for fork ${this.forkId} and task ${task.identifier}.`);
                   
                    if(error){
                        return reject(error);
                    }

                    resolve(result);
                }
            };

            this.logger.debug(`sending task for fork ${this.forkId} and task ${task.identifier}.`);
            this.send("task", task);
        });
    }

    _handleTaskResult(data){
        
        if(!this.stack[data.identifier]){
            return this.logger.error(`received task result ${data.identifier}, but task is not in stack.`);
        }
        
        this.stack[data.identifier](data.error || null, data.result);
        delete this.stack[data.identifier];
    }

    kill(noRestart = false) {

        if (this.child) {
            this.haltRestart = noRestart;
            this.logger.warn(`killing fork process ${this.forkId}.`);
            this.child.kill("SIGINT");
        }
    }
}

module.exports = Process;
