"use strict";

const {
    ForkProcess
} = require("./../index.js");

const fork = new ForkProcess();

const pc = data => {
    fork.log("ready");
    setInterval(() => {}, 1000);
};

const mc = cb => {
    cb(null, {});
};

fork.register("test-cb", (data, callback) => {
    setTimeout(() => {
        fork.log(data);
        callback(null, "yeah")
    }, 80);
});

fork.register("test-error", (data, callback) => {
    setTimeout(() => {
        fork.log(data);
        callback(new Error("an error"))
    }, 50);
});

fork.register("test-timeout", (data, callback) => {
    setTimeout(() => {
        fork.log(data);
        callback(null, "ow")
    }, 125);
});

fork.register("test-throw", (data, callback) => {
    process.nextTick(() => {
        throw new Error("lol cb threw");
    });
});

fork.register("test-exit", (data, callback) => {
    process.exit(0);
});

fork.register("log-test", (data, callback) => {
    fork.log("test", "debug");
    fork.log("test", "info");
    fork.log("test", "warn");
    fork.log("test", "error");
    callback(null);
});

fork.connect(pc, mc);

/*
fork._handleMessage({
    type: "data",
    content: {}
});

setTimeout(() => {
    fork._handleMessage({
        type: "task",
        content: {
            task: "test-cb",
            identifier: "1",
            args: {}
        }
    });
}, 500);
*/