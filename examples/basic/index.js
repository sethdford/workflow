var Workflow = require('../../workflow'),
    config = require('../config');

var workflow = new Workflow({
    //** use the test domain, demo task list by default
    domain: 'test',
    defaultTaskList: 'demo',

    //** provide your AWS credentials
    accessKeyId: config.awsAccessKey,
    secretAccessKey: config.awsSecretKey,
    region: config.awsRegion
});

workflow.define('test-workflow-2', {
    swf: {
        description: 'this is a test workflow, demonstrating a simple 3 step process'
    },

    tasks: [{
            name: 'task-1',
            description: 'does something asynchronous, then completes'
        },
        {
            name: 'task-2',
            description: 'does something synchronous, then completes'
        },
        {
            name: 'task-3',
            description: 'completes the workflow'
        }
    ],

    handlers: {
        'task-1': function(task) {
            console.log('        received data from workflow: ', task.data);

            setTimeout(function() {
                task.complete({
                    fromTask1: 'output from task 1'
                });
            }, 2000);

            return task.async();
        },

        'task-2': function(task) {
            console.log('        received data from task 1: ', task.data.fromTask1);

            task.complete({
                fromTask2: 'output from task 2'
            });
        },

        'task-3': function(task) {
            console.log('        received data from task 2: ', task.data.fromTask2);

            task.completeWorkflow({
                output: task.data
            });
        }
    }
});

//** handle some of the workflow events
workflow.on('workflow:start', function(obj) { console.log('[workflow] starting :', obj.workflowType.name, '/', obj.workflowId) });
workflow.on('workflow:complete', function(obj) { console.log('[workflow] the workflow is complete!') });

workflow.on('decision:receive', function(ctx) { console.log('    [decider] making a decision') });
workflow.on('decision:complete', function(ctx) { console.log('    [decider] decided:', ctx.decisions[0].decisionType) });

workflow.on('activity:receive', function(ctx) { console.log('    [worker] received task:', ctx.context.activityType) });
workflow.on('activity:success', function(ctx) { console.log('    [worker] succeeded') });
workflow.on('activity:fail', function(ctx) { console.log('    [worker] failed') });


process.stdout.write('1) verifying workflows...');

//** verify the workflows; this will create them via the aws api if necessary
workflow.verifyWorkflows()

.then(function() {
    process.stdout.write('all workflows verified\n');
    console.log('2) begin polling for decisions and tasks');

    //** start polling for decisions and tasks
    workflow.poll.decision();
    workflow.poll.activity();

    console.log('3) invoke the test workflow');

    //** invoke the test workflow
    workflow.run('test-workflow-2', {
        someData: 'this is some data',
        moreData: { iam: 'an object' }
    }).done();

    var ref = setInterval(function() { console.log('(running)') }, 5000);
})

.catch(function(err) {
    console.log('there was a problem verifying the workflows: ', err);
});