var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
        Package  = __db_model.Package,
        User  = __db_model.User,
        PackageChannels = __db_model.PackageChannels,
        ResellerPackage = __db_model.ResellerPackage;

router.use(bodyParser.json());
router.use(fileUpload());

router.get('/', VerifyToken, (req, res) => {
User.findAll({raw:true,where:{roles:'RESELLER',type :'Admin Pack'}}).then(function(user_list){
    var user_list_id = [];
    user_list.map(function(data){
        user_list_id.push(data.user_id)
    })
    var obj = {};
    if(req.roles == 'RESELLER' && req.user_type == 'Admin Pack'){
        var user_obj = {user_id:req.userId}
        ResellerPackage.findAll({raw:true,where:user_obj}).then(function (pack) {
            var pack_id = []
            if(pack.length > 0 ){
                pack.map(function (data, i) {
                    pack_id.push(data.package_id);
                    if(i+1 == pack.length){
                        getdata({package_id:pack_id});
                    }
                })                
            }else{getdata({});}
        })
    }else if(req.roles == 'RESELLER' && req.user_type == 'Own Pack'){
	   getdata({user_id:req.userId});
    }else if((req.roles == 'ADMIN') ||  (req.roles == 'SUPER_ADMIN')){
        user_list_id.push(req.userId);
        var obj_val = {user_id:user_list_id};
	    getdata(obj_val);
    }
    function getdata(input) {        
      Package.findAll({
        where:input,
        order: [['createdAt', 'DESC']],
        include:[{model:PackageChannels}]
      }).then((response) => {
        res.status(200).send(response);
      });
    }
});
})
router.get('/:limit/:offset', VerifyToken, (req, res) => {
User.findAll({raw:true,where:{roles:'RESELLER',type :'Admin Pack'}}).then(function(user_list){
    var user_list_id = [];
    user_list.map(function(data){
        user_list_id.push(data.user_id)
    })
    var obj = {};
    if(req.roles == 'RESELLER' && req.user_type == 'Admin Pack' ){
        var user_obj = {user_id:req.userId}
        ResellerPackage.findAll({raw:true,where:user_obj}).then(function (pack) {
            var pack_id = []
            if(pack.length > 0 ){
                pack.map(function (data, i) {
                    pack_id.push(data.package_id);
                    if(i+1 == pack.length){
                        getdata({package_id:pack_id});
                    }
                })                
            }else{getdata({});}
        })
    }else if(req.roles == 'RESELLER' && req.user_type == 'Own Pack'){
        getdata({user_id:req.userId});
    }else if((req.roles == 'ADMIN') ||  (req.roles == 'SUPER_ADMIN')){
        user_list_id.push(req.userId);
        var obj_val = {user_id:user_list_id};
        getdata(obj_val);
    }
    function getdata(input) {    
      var offset=(req.params.offset==0)?0:req.params.offset-1;
      Package.findAndCountAll({
        limit: req.params.limit,
        offset: offset,
        where:input,
        order: [['createdAt', 'DESC']],
        include:[{model:PackageChannels}]
      }).then((response) => {
        res.status(200).send(response);
      });
    }
});
})
router.post('/', VerifyToken,function(req, res){
    req.body.user_id=req.userId;
    req.body.package_channels = JSON.parse(req.body.package_channels);
    Package.create(req.body,{ include: [{ model: PackageChannels }] }).then(created=> {
        return res.status(200).send("Package created successfully")
    },err=> {
        return res.status(500).send("There was a problem in Package creation")
    })
});

router.put('/:package_id', VerifyToken,(req,res)=> {
    req.body.package_channels = JSON.parse(req.body.package_channels);
    Package.update(req.body,{ where:{package_id:req.params.package_id} }).then(Package_updated=> {
        PackageChannels.destroy({ where: { package_id:req.params.package_id } }).then(packagechannels_deleted => {
            if (req.body.package_channels.length > 0) {
                PackageChannels.bulkCreate(req.body.package_channels).then(packagechannels_created => {
                    return res.status(200).send("Package updated successfully")

                })
            }
        })
    },err=> {
        return res.status(500).send("There was a problem in Package updation")
    })
});

router.delete('/:package_id', VerifyToken, (req,res)=> {
    Package.destroy({ where: {package_id: req.params.package_id}}).then(Package_deleted=> {
            return res.status(200).send("Package deleted successfully")
    },err=> {
            return res.status(500).send("There was a problem in Package deletion")
    })
});

module.exports=router;
