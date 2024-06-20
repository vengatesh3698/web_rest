var app  = require('./app'),
    http = require('http'),
    port = 8010,
    schedule        = require('node-schedule'),
    editJsonFile    = require('edit-json-file'),
    conf = editJsonFile(__root+'config.json'),
    fs = require('fs'),
    exec = require('child_process').exec,
    expirySubscription = require(__root+__core+'/modules/SubscriptionExpiry'),
    expiry_time = conf.get('subscription_time').split('.');

http.createServer(app).listen(port, () => {
    console.log('Express server listening on port ' + port);
});


var path = '/etc/ec/data/logo';
if (!fs.existsSync(path)){
	exec("mkdir -p "+path,function(err,stdout,stderr){});
}

const SubsExpiry = schedule.scheduleJob({ hour: expiry_time[0], minute: expiry_time[1] }, function() {
    expirySubscription.Execute();
});
