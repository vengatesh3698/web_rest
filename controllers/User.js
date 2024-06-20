var express     = require('express'),
    router      = express.Router(),
    bodyParser  = require('body-parser'),
    bcrypt      = require('bcryptjs'),
    VerifyToken = require(__root +__core+'modules/VerifyToken'),
    fileUpload      	= require('express-fileupload'),
    User        = __db_model.User,
    exec = require('child_process').exec,
    fs = require('fs'),
    ResellerPackage = __db_model.ResellerPackage,
    Inventory  = __db_model.Inventory;

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
    var obj = {}
    if(req.roles == 'ADMIN'){
        obj={roles:'RESELLER', admin_id:req.userId}
    }
    if(req.roles == 'SUPER_ADMIN'){
        obj={roles:['RESELLER', 'ADMIN']}
    }
    User.findAll({ where: obj,order: [['createdAt', 'DESC']] }).then(function (user) {
            return res.status(200).send(user);
    },err=>{
            return res.status(500).send("There was a problem to find users");
    });
});


router.get('/:limit/:offset', VerifyToken, (req,res)=>{
    var obj = {}
    if(req.roles == 'ADMIN'){
        obj={roles:'RESELLER', admin_id:req.userId}
    }
    if(req.roles == 'SUPER_ADMIN'){
        obj={roles:['RESELLER', 'ADMIN']}
    }

    User.findAndCountAll({ where: obj, limit: Number(req.params.limit), offset: Number(req.params.offset), include: [{ model: ResellerPackage }], distinct:true,order: [['createdAt', 'DESC']] }).then(function (user) {
            return res.status(200).send(user);
    },err=>{
            return res.status(500).send("There was a problem to find users");
    });
});

router.get('/:user_id',VerifyToken,(req,res)=>{
    User.findOne({
        raw:true,
        include:[{model:ResellerPackage}],
        where:{user_id:req.params.user_id},
        attributes:{exclude:['password','createdAt','updatedAt']}
    }).then(user=>{
            return res.status(200).send(user);
    },err=>{
            return res.status(500).send("There was a problem to find user");
    });
});

router.post('/',VerifyToken,(req,res)=>{
    req.body.password=bcrypt.hashSync(req.body.password, 8);
    if(req.body.reseller_packages != 'undefined') {
    	req.body.reseller_packages = JSON.parse(req.body.reseller_packages);
    }
    req.body.user_id = guid();
    req.body.logo  = image_path+req.body.user_id+"/"+req.files.logo.name;
    req.body.admin_id  = req.userId;
    User.create(req.body,{include:[{model:ResellerPackage}]}).then(created=>{
        if(req.files && req.files.logo){
           // fs.mkdir(image_path+req.body.user_id, {recursive: true}, err => {
                fs.writeFileSync(image_path+req.body.user_id+'.png',req.files.logo.data,'binary')
           // })
        }
        return res.status(200).send("User Created successfully");
    },err=>{
        if(err && err.errors[0].message && err.errors[0].message=='user_name must be unique') return res.status(500).send("User name already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='email must be unique') return res.status(500).send("Email already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='mobile must be unique') return res.status(500).send("Mobile Number already exists!");
    });
});

router.put('/:user_id',VerifyToken,(req,res)=>{
req.body.logo_insertion = false
    if(req.body.password && req.body.password != '') {
        req.body.password=bcrypt.hashSync(req.body.password, 8);
    }
    if(req.files && req.files.logo){
	exec('rm -rf '+image_path+req.params.user_id+'.png',function (err,stdout,stderr){
	    fs.writeFileSync(image_path+req.params.user_id+'.png',req.files.logo.data,'binary')
	})
    }
    User.update(req.body,{where:{user_id:req.params.user_id}}).then(updated=>{
        if(req.body.reseller_packages && req.body.reseller_packages!='undefined'){
            req.body.reseller_packages = JSON.parse(req.body.reseller_packages);
	   if(req.body.reseller_packages.length > 0){
            ResellerPackage.destroy({ where: { user_id:req.params.user_id } }).then(package_deleted => {
                if (req.body.reseller_packages.length > 0) {
                    ResellerPackage.bulkCreate(req.body.reseller_packages).then(package_created => {
                        if(updated){
                            return res.status(200).send("Reseller updated successfully")
                        }else return res.status(500).send("There was a problem for reseller updation");
                    })
                }
            })
	   }else{
		if(updated){
                return res.status(200).send("Reseller updated successfully")
            }else return res.status(500).send("There was a problem for reseller updation");
	   }
        }else{
            if(updated){
                return res.status(200).send("Reseller updated successfully")
            }else return res.status(500).send("There was a problem for reseller updation");
        }
    },err=>{
        if(err && err.errors[0].message && err.errors[0].message=='user_name must be unique') return res.status(500).send("User name already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='email must be unique') return res.status(500).send("Email already exists!");
        if(err && err.errors[0].message && err.errors[0].message=='mobile must be unique') return res.status(500).send("Mobile Number already exists!");
    });
});


router.delete('/:user_id',VerifyToken,(req,res)=>{
	User.destroy({where:{user_id:req.params.user_id}}).then(function(data){
	  exec('rm -rf '+image_path+req.params.user_id+'.png',function (err,stdout,stderr){
	    return res.status(200).send("Reseller deleted successfully")
	  })
	},function(err){
console.log(err)
	 return res.status(500).send("Reseller deletion failed")
	})
})

router.post('/changeStatus',VerifyToken,(req,res)=>{
console.log("rqq",req.body)
        User.findAll({raw:true,attributes:['user_id'],where:{roles:'RESELLER',admin_id:req.body.user_id}}).then(function(input){
        var arr = input.map(function(val){
		console.log("val",val);
		return val.user_id
	})
        User.update({status:req.body.status},{where:{user_id:req.body.user_id}}).then(function(data){	   
	 User.update({status:req.body.status},{where:{admin_id:req.body.user_id}}).then(function(dataa){
	  Inventory.update({status:req.body.inventory_status},{where:{reseller_id:arr, status:['Active','Deactive']}}).then(function(datas){
            return res.status(200).send("User updated successfully")
	  },function(err){
console.log(err)
            return res.status(500).send("User updation failed")
          })
   	  })
        },function(err){
console.log(err)
         return res.status(500).send("User updation failed")
        })
       })
})
module.exports=router;

