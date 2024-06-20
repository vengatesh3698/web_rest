var app   = {},
App        = __db_model.App;
const { exec, spawn } = require('child_process');

const { existsSync, writeFileSync, chmodSync, unlinkSync, renameSync, readFileSync } = require('fs');

const debug = true;

var mv_appSourcePath="/home/web/code/mobile/ott_mobile_app/Vaccines/VaccinesApp";
var tv_appSourcePath="/home/web/code/tv/ott_mobile_app/Vaccines/VaccinesApp";


app.startBuild = function(obj) {
console.log("ob",obj)
        app.updateStatus = function(resData) {
                AppDetails.update(resData,{
                        where: {
                                operator_id: resData.operator_id
                        }
                })
                .then( data => {
                        startBuild();
                });
        }
        buildApp(obj).then(data => {
                console.log(data.message)
                obj.status = "Finished";
                obj.apk_url="http://125.99.242.35:8080/app/"+obj.app_id+"/app-release.apk"
                updateStatus(obj);
        })
        .catch(error => {
                console.log(error)
                obj.status = "Errored";
                updateStatus(obj);
        });
}

const sync_status = {
        "create" : "create",
        "update" : "update"
}

const updateStatus = function (obj){
console.log(obj)
	App.update(obj,{where:{}}).then(function(app_update){
	},function(err){
	})
}
const buildApp = function(obj) {
        return new Promise((resolve, reject) => {
                try {
                        console.log(`App Object`)
                        console.log(obj)
			var buildParams='';
			var apkRelease, appSourcePath;
                        if (obj.operator_id) {
                                buildParams = `${buildParams} -DoperatorId='${obj.operator_id}'`
                        }
                        if (obj.cdn_url) {
                                buildParams = `${buildParams} -DcdnUrl='${obj.cdn_url}'`
                        }
                        if(obj.type=="Mobile"){
console.log("in if")
                                apkRelease        = `${mv_appSourcePath}/app/build/outputs/apk/release/app-release-unsigned.apk`;        
                                appSourcePath     = `${mv_appSourcePath}`
                        }
                        else{
console.log("in elsse")

                                apkRelease        = `${tv_appSourcePath}/app/build/outputs/apk/release/app-release-unsigned.apk`;
                                appSourcePath     = `${tv_appSourcePath}`
                        }

                        const buildScript       = "/tmp/test.sh";
                        const buildCmd          = `#!/bin/bash
                                cd ${appSourcePath}
                                rm -rf files/* ${apkRelease}
                                cp /etc/ec/data/app/${obj.app_id}/* files/
                                ./gradlew --quiet :app:clean :app:assembleRelease ${buildParams}
                                exit 0`;

                        writeFileSync(buildScript, buildCmd);

                        chmodSync(buildScript, "777");

                        console.log(`Build Started For ${obj.operator_id}`)
                        console.log(buildCmd)

                        const cmd = spawn(buildScript, [], { shell: true });

                        cmd.stdout.on('data', function (data) {
                                console.log(data.toString());
                        });

                        cmd.stderr.on('data', function (data) {
                                console.log(data.toString());
                        });

                        cmd.on('exit', function (code) {
                                unlinkSync(buildScript);
                                if (existsSync(apkRelease)) {
                                        renameSync(`${apkRelease}`,`/etc/ec/data/app/${obj.app_id}/app-release.apk`)
                                        resolve({
                                                message: `Build success for ${obj.operator_id}`,
                                                timestamp: obj.timestamp,
                                        })
                                } else {
                                        reject(`App build failed for ${obj.operator_id}`)
                                }
                                console.log('App Build exited with code ' + code.toString());
                        });
                } catch (error) {
                        reject(error)
                }
        });
}


module.exports = app;
