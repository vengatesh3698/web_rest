var express     = require('express'),
    router      = express.Router(),
    bodyParser  = require('body-parser'),
    bcrypt      = require('bcryptjs'),
    VerifyToken = require(__root +__core+'modules/VerifyToken'),
    appBuild = require(__root +'/controllers/AppBuild'),
    fileUpload          = require('express-fileupload'),
    App        = __db_model.App,
    exec = require('child_process').exec,
    fs = require('fs');
console.log("mmbm",__root)
var image_path ='/etc/ec/data/app/';
router.use(bodyParser.json());
router.use(fileUpload());

function guid() {
    function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

router.get('/:app_name', (req,res)=>{
    var obj = { name: req.params.app_name}
    App.findOne({ where: obj }).then(function (app) {
	    if(!app){return res.status(500).send("No app found")}
            else{return res.status(200).send({url:app.authentication_url});}
    },err=>{
            return res.status(500).send("There was a problem to find apps");
    });
});


router.get('/:limit/:offset', VerifyToken, (req,res)=>{
    var obj = {}
    App.findAndCountAll({ where: obj, limit: Number(req.params.limit), offset: Number(req.params.offset), distinct:true,order: [['createdAt', 'DESC']] }).then(function (app) {
            return res.status(200).send(app);
    },err=>{
console.log("err",err)
            return res.status(500).send("There was a problem to find apps");
    });
});

router.get('/:app_id',VerifyToken,(req,res)=>{
    App.findOne({
        raw:true,
        where:{app_id:req.params.app_id},
        attributes:{exclude:['createdAt','updatedAt']}
    }).then(app=>{
            return res.status(200).send(app);
    },err=>{
            return res.status(500).send("There was a problem to find app");
    });
});

router.post('/',VerifyToken,(req,res)=>{
    req.body.app_id = guid();
console.log("app",req.body)
//    req.body.banner_image  = image_path+req.body.app_id+"/logo.png";
//    req.body.banner_video  = image_path+req.body.app_id+"/splash.mp4";
//    req.body.status = 'Pending';
    App.create(req.body).then(created=>{
/*	var obj = {
		app_name    : created.app_name,
		app_id 	    : created.app_id,
		operator_id : req.body.reseller_id,
		cdn_url     : req.body.authentication_url,
		type 	    : req.body.app_type
	}*/
/*        if(req.files){
            fs.mkdir(image_path+req.body.app_id, {recursive: true}, err => {
                fs.writeFileSync(image_path+req.body.app_id+'/logo.png',req.files.banner_image.data,'binary')
                fs.writeFileSync(image_path+req.body.app_id+'/splash.mp4',req.files.banner_video.data,'binary')
            })
        }*/
	//appBuild.startBuild(obj);	
        return res.status(200).send("App Created successfully");
    },err=>{
        if(err && err.errors[0].message && err.errors[0].message=='app_name must be unique') return res.status(500).send("app name already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='email must be unique') return res.status(500).send("Email already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='mobile must be unique') return res.status(500).send("Mobile Number already exists!");
    });
});

router.put('/:app_id',VerifyToken,(req,res)=>{
console.log("req",req.body,req.files)
    App.findOne({raw:true,where:{app_id:req.params.app_id}}).then(function(find_app){
    appupdate()
    function appupdate(){
	   var obj = {
		app_name    : find_app.app_name,
                app_id      : find_app.app_id,
                operator_id : find_app.reseller_id,
                cdn_url     : req.body.authentication_url,
                type        : req.body.app_type
           }
    App.update(req.body,{where:{app_id:req.params.app_id}}).then(updated=>{
//	appBuild.startBuild(obj);
	res.status(200).send("App updated successfully")
    },err=>{
        if(err && err.errors[0].message && err.errors[0].message=='app_name must be unique') return res.status(500).send("app name already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='email must be unique') return res.status(500).send("Email already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='mobile must be unique') return res.status(500).send("Mobile Number already exists!");
    });
    };
    })
});

router.delete('/:app_id',VerifyToken,(req,res)=>{
	App.destroy({where:{app_id:req.params.app_id}}).then(function(data){
		exec('rm -rf '+image_path+req.params.app_id+'/',function (err,stdout,stderr){
			res.status(200).send("App deleted successfully");
		})
	},function(err){
		res.status(500).send("There was a problem in deleting the app");
	})
})


module.exports=router;
