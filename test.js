#! /usr/bin/env node
'use strict';

const async = require('neo-async')
const assert = require('assert')
const chimera = require('./index.js')
const cmd = chimera.cmd
const childProcess = require('child_process')

const currentPath = process.cwd()
let serverProcess = null
let testChain = chimera.test.testChain
let testCmd = chimera.test.testCmd
let testFunctionWithCallback = chimera.test.testFunctionWithCallback
let dbAsserter = require('./tests/programs/db-asserter.js') 

// Run the test
async.series([
    // test create HttpOptions
    (callback) => {testFunctionWithCallback('Test createHttpOption 1', 
        chimera.sender.createHttpOption, 
        'http://facebook.com/abc/def', '',
        {'protocol':'http:', 'host':'facebook.com', 'port':80, 'path':'/abc/def'}, callback)
    },
    (callback) => {testFunctionWithCallback('Test createHttpOption 2', 
        chimera.sender.createHttpOption, 
        'http://facebook.com:80/abc/def', '',
        {'protocol':'http:', 'host':'facebook.com', 'port':80, 'path':'/abc/def'}, callback)
    },
    (callback) => {testFunctionWithCallback('Test createHttpOption 3', 
        chimera.sender.createHttpOption, 
        'https://facebook.com/abc/def', '',
        {'protocol':'https:', 'host':'facebook.com', 'port':443, 'path':'/abc/def'}, callback)
    },
    (callback) => {testFunctionWithCallback('Test createHttpOption 4', 
        chimera.sender.createHttpOption, 
        'https://facebook.com:80/abc/def', '',
        {'protocol':'https:', 'host':'facebook.com', 'port':80, 'path':'/abc/def'}, callback)
    },
    (callback) => {testFunctionWithCallback('Test createHttpOption 5', 
        chimera.sender.createHttpOption, 
        'facebook.com', '',
        {'protocol':'http:', 'host':'facebook.com', 'port':80, 'path':'/'}, callback)
    },
    (callback) => {testFunctionWithCallback('Test createHttpOption 6', 
        chimera.sender.createHttpOption, 
        'localhost:3000', '',
        {'protocol':'http:', 'host':'localhost', 'port':3000, 'path':'/'}, callback)
    },
    // test database
    (callback) => {testCmd('Test mongo driver',
        'chimera "tests/mongo-driver.yaml"', dbAsserter, callback)
    },
    (callback) => {testChain('Test mongo driver',
        'tests/mongo-driver.yaml', [], {}, dbAsserter, callback)
    },
    // test executeChain with various parameters
    (callback) => {testFunctionWithCallback('Test executeChain 1',
        chimera.executeChain,
        'tests/increment.yaml',
        1, callback)
    },
    (callback) => {testFunctionWithCallback('Test executeChain 2',
        chimera.executeChain,
        'tests/increment.yaml', {'inc':5},
        5, callback)
    },
    (callback) => {testFunctionWithCallback('Test executeChain 3',
        chimera.executeChain,
        'tests/increment.yaml', [1],
        2, callback)
    },
    // test execute chain
    (callback) => {testChain('Test executeChain without presets',
        'tests/minimal.yaml', [1, 5], -23, callback)
    },
    (callback) => {testChain('Test executeChain with presets',
        'tests/minimal.yaml', [1, 5], {'a':1, 'b':1}, -23, callback)},
    (callback) => {testChain('Test executeChain containing empty object',
        'tests/empty.yaml', [0], '', callback)},
    (callback) => {testChain('Test executeChain containing infinite loop, expect error',
        'tests/infinite-loop.yaml', [0], '', callback)},
    // test execute command
    (callback) => {testCmd('Test error handling: no error',
        'chimera tests/error-handling.yaml 6 6', 12, callback)},
    (callback) => {testCmd('Test error handling: error less',
        'chimera tests/error-handling.yaml 5 6', '', callback)},
    (callback) => {testCmd('Test error handling: error more',
        'chimera tests/error-handling.yaml 6 5', '', callback)},
    (callback) => {testCmd('Test Empty process with single argument',
        'chimera "(a)->-> b" 6', 6, callback)},
    (callback) => {testCmd('Test Empty process with two argument',
        'chimera "(a,b)->->(c)" 6 5', '[6,5]', callback)},
    (callback) => {testCmd('Test Empty process with single argument and shorthand',
        'chimera "(a)--> b" 6', 6, callback)},
    (callback) => {testCmd('Test Empty process with two argument and shorthand',
        'chimera "(a,b)-->(c)" 6 5', '[6,5]', callback)},
    (callback) => {testCmd('Test JSON instead of YAML',
        'chimera tests/add.json 1 5', 6, callback)},
    (callback) => {testCmd('Test javascript arrow function',
        'chimera tests/add-js.yaml 1 5', 6, callback)},
    (callback) => {testCmd('Test complete',
        'chimera tests/complete.yaml 1 5', -23, callback)},
    (callback) => {testCmd('Test minimal',
        'chimera tests/minimal.yaml 1 5', -23, callback)},
    (callback) => {testCmd('Test inline-1',
        'chimera "(a, b) -> node tests/programs/add.js -> c" 1 5', 6, callback)},
    (callback) => {testCmd('Test inline-2',
        'chimera "(a, b) -> node tests/programs/add.js" 1 5', 6, callback)},
    (callback) => {testCmd('Test implode',
        'chimera tests/implode.yaml 1 2 3', '1, 2, 3', callback)},
    (callback) => {testCmd('Test control-1',
        'chimera tests/control.yaml 5', 8, callback)},
    (callback) => {testCmd('Test control-2',
        'chimera tests/control.yaml 12', 11, callback)},
    (callback) => {testCmd('Test simple-command',
        'chimera tests/simple-command.yaml 5 6', 11, callback)},
    (callback) => {testCmd('Test nested-control',
        'chimera tests/nested-control.yaml','1112*1314**2122*2324**3132*3334**',callback)},
    (callback) => {testCmd('Test complex-vars',
        'chimera tests/complex-vars.yaml 5 6', -176, callback)},
    (callback) => {testCmd('Test add',
        'chimera tests/add.yaml 5 6', 11, callback)},
    (callback) => {testCmd('Test add-module',
        'chimera tests/add-module.yaml 5 6', 11, callback)},
    (callback) => {testCmd('Test add-module-twice',
        'chimera tests/add-module-twice.yaml 5 6', 17, callback)},
    (callback) => {testCmd('Test arithmetic-module',
        'chimera tests/arithmetic-module.yaml 5 6 "*"', 30, callback)},
    (callback) => {testCmd('Test sub-chimera',
        'chimera tests/sub-chimera.yaml 5 4', 18, callback)},
    // run chimera server
    (callback) => {
        let callbackExecuted = false
        let env = chimera.util.deepCopy(process.env)
        env['PORT'] = 3010
        serverProcess = childProcess.spawn('chimera-serve', [], {'env': env, 'cwd':process.cwd()})
        // if error, show message and kill
        serverProcess.on('error', (err)=>{
            console.error(err)
            serverProcess.kill()
        })
        // if success, run callback
        serverProcess.stdout.on('data', function(stdout){
            console.log(String(stdout))
            if(!callbackExecuted){
                callbackExecuted = true
                callback()
            }
        })
        serverProcess.stderr.on('data', function(stderr){
            console.error(String(stderr))
        })
    },
    // test distributed
    (callback) => {testCmd('Test distributed',
        'chimera tests/distributed.yaml 5 4 http://localhost:3010', 18, callback)},
    // kill chimera server
    (callback) => {
        serverProcess.kill()
        callback()
    },
], (result, error) => {
    assert(process.cwd() == currentPath, 'FAIL: current path doesn\'t set back')
    console.log('ALL TEST SUCCESS: No error encountered or all errors were caught')
    console.log('NOTE: Please make sure you have run "sudo npm link first" before running the test')
    console.log('      Otherwise, please re-run the test.')
})
