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
    }, 125);
});

fork.register("test-error", (data, callback) => {
    setTimeout(() => {
        fork.log(data);
        callback(new Error("an error"))
    }, 50);
});

fork.connect(pc, mc);