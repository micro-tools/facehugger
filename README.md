# facehugger
back-packed child-process with callback stack and more batteries included

[![Build Status](https://travis-ci.org/krystianity/facehugger.svg?branch=master)](https://travis-ci.org/krystianity/facehugger)

# Install via

```
npm i facehugger
```

# Parent Setup

```es6
const { FaceHugger } = require("facehugger");

const moduleFile = "./../../test/TestProcess.js";
const log = new Logger({level: "DEBUG"}); //e.g. log4bro
const config = {
    autoRestart: true,
    forkDelay: 10
};

const faceHugger = new FaceHugger(moduleFile, log, config);
faceHugger.start({}); //you can pass init data

//some available events
faceHugger.once("ready", () => {});
faceHugger.on("restart", () => {});
faceHugger.on("close", () => {});
faceHugger.on("message", message => {});
faceHugger.on("metrics", metrics => {});

faceHugger.pullMetrics({}, 1000) //arg, timeout in ms
    .then(metrics => {});

faceHugger.runTask("sometask", {}, 200) //taskname, arg, timeout in ms
    .then(result => {})
    .catch(error => {});

faceHugger.restart(); //kills and spawns child process
faceHugger.stop(); //kills child process and halts
```

# Child Setup

```es6
const { ForkProcess } = require("facehugger");

const fork = new ForkProcess();

const processCallback = data => {
     fork.log("ready");
     //run something to keep the process alive
     setInterval(() => {}, 1000); 
};

const metricsCallback = cb => {
    cb(null, {
        //return whatever you like
    });
};

//register callbacks (that can be called from the parent process)
fork.register("sometask", (data, callback) => {
    process.nextTick(() => {
        fork.log(data);
        callback(null, "yeah");
    });
});

fork.connect(processCallback, metricsCallback);
```