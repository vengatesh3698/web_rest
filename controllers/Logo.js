var express     = require('express'),
    router      = express.Router(),
    bodyParser  = require('body-parser'),
    VerifyToken = require(__root +__core+'modules/VerifyToken'),
    fileUpload          = require('express-fileupload'),
    Logo        = __db_model.Logo,
    exec = require('child_process').exec,
    fs = require('fs'),
    Logo = __db_model.Logo,
    editJsonFile    = require('edit-json-file'),
    conf = editJsonFile(__root+'config.json'),
    Socketio = require('../socket_server'),
    ip = conf.get('logo_ip');

var image_path = '/etc/ec/data/logo/';
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

router.get('/',VerifyToken, (req,res)=>{
    var obj = {user_id: req.userId};
    Logo.findAll({ where: obj,order: [['createdAt', 'DESC']] }).then(function (logo) {
            return res.status(200).send(logo);
    },err=>{
            return res.status(500).send("There was a problem to find Logo");
    });
});


router.get('/:limit/:offset', VerifyToken, (req,res)=>{
    var obj = {user_id:req.userId}
    Logo.findAndCountAll({ where: obj, limit: Number(req.params.limit), offset: Number(req.params.offset), distinct:true,order: [['createdAt', 'DESC']] }).then(function (logo) {
            return res.status(200).send(logo);
    },err=>{
            return res.status(500).send("There was a problem to find Logo");
    });
});

router.get('/:logo_id',VerifyToken,(req,res)=>{
    Logo.findOne({
        raw:true,
        where:{logo_id:req.params.logo_id},
        attributes:{exclude:['password','createdAt','updatedAt']}
    }).then(Logo=>{
            return res.status(200).send(logo);
    },err=>{
            return res.status(500).send("There was a problem to find logo");
    });
});

router.post('/',VerifyToken,(req,res)=>{
    req.body.logo_id = guid();
    req.body.user_id = req.userId;
    req.body.logo  = ip+req.body.user_id+"/"+req.files.logo.name;
    console.log("req.body...",req.body);
    Socketio.send_dpo(req.body);
    Logo.create(req.body).then(created=>{
        if(req.files && req.files.logo){
            fs.mkdir(image_path+req.body.user_id, {recursive: true}, err => {
                fs.writeFileSync(image_path+req.body.user_id+'/'+req.files.logo.name,req.files.logo.data,'binary')
            })
        }
        return res.status(200).send("Logo Created successfully");
    },err=>{
        if(err && err.errors[0].message && err.errors[0].message=='Logo_name must be unique') return res.status(500).send("Logo name already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='email must be unique') return res.status(500).send("Email already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='mobile must be unique') return res.status(500).send("Mobile Number already exists!");
    });
});

router.put('/:logo_id',VerifyToken,(req,res)=>{
Logo.findOne({raw:true, where:{user_id:req.userId}}).then(function(logo_find){
    req.body.user_id = req.userId;
    var old_logo = logo_find.logo.substring(logo_find.logo.lastIndexOf('/') + 1);
    if(req.files && req.files.logo){
console.log("old_logo",old_logo)
	req.body.logo =  ip+req.body.user_id+"/"+req.files.logo.name;
        exec('rm -rf '+image_path+req.body.user_id+'/'+old_logo,function (err,stdout,stderr){
            fs.writeFileSync(image_path+req.body.user_id+'/'+req.files.logo.name,req.files.logo.data,'binary')
        })
    }
	Socketio.send_dpo(req.body)
    Logo.update(req.body,{where:{logo_id:req.params.logo_id}}).then(updated=>{
            if(updated){
                return res.status(200).send("Logo updated successfully")
            }else return res.status(500).send("There was a problem for logo updation");
        
    },err=>{
        if(err && err.errors[0].message && err.errors[0].message=='Logo_name must be unique') return res.status(500).send("Logo name already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='email must be unique') return res.status(500).send("Email already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='mobile must be unique') return res.status(500).send("Mobile Number already exists!");
    });
    });
});

router.delete('/:logo_id',VerifyToken,(req,res)=>{
console.log("---",req.params)
	Logo.destroy({where:{logo_id:req.params.logo_id}}).then(function(data){
		exec('rm -rf '+image_path+req.userId+'/',function (err,stdout,stderr){
                        res.status(200).send("Logo deleted successfully");
                })
	},function (err){
console.log("err",err)
		return res.status(500).send("Logo deletion failed")
	})
})
module.exports=router;
