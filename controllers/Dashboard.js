var express       = require('express'),
    router        = express.Router(),
    bodyParser    = require('body-parser'),
    VerifyToken   = require(__root + __core + 'modules/VerifyToken'),
    Postgres	  = __db_model.Postgres,
    Channel	 	  = __db_model.Channel,
    Package		  = __db_model.Package,
    Inventory	  = __db_model.Inventory,
    User	  = __db_model.User,
    ResellerPackage = __db_model.ResellerPackage;


router.use(bodyParser.json());

router.get('/', VerifyToken, (req,res)=> {
User.findAll({raw:true,where:{roles:'RESELLER',type :'Admin Pack'}}).then(function(user_list){
	var user_list_id = [];
	user_list.map(function(data){
    	    user_list_id.push(data.user_id)
        })
	var channel_obj = {}, package_obj = {}, inventory_obj = {}, active_inventory_obj = {status:'Active' };
	ResellerPackage.findAll({raw:true,where:{user_id:req.userId}}).then(function (pack) {
		if(req.roles == 'RESELLER' && req.user_type == 'Admin Pack'){
			inventory_obj = {'reseller_id' :  req.userId };
			active_inventory_obj = {'reseller_id' :  req.userId, status:'Active' };
			var pack_id = []
	        if(pack.length > 0 ){
	            pack.map(function (data, i) {
	                pack_id.push(data.package_id);
	                if(i+1 == pack.length){
	                    package_obj = {package_id:pack_id};
	                }
	            })                
	        }
		}else if(req.roles == 'RESELLER' && req.user_type =='Own Pack'){
			channel_obj ={'user_id' :  req.userId };
			inventory_obj = {'reseller_id' :  req.userId };
			active_inventory_obj = {'reseller_id' :  req.userId, status:'Active' };
			package_obj = {'user_id' :  req.userId };
		}else if((req.roles == 'ADMIN') || (req.roles == 'SUPER_ADMIN') ){
			user_list_id.push(req.userId);
			channel_obj ={'user_id' :user_list_id}
			package_obj = {'user_id' : user_list_id}
		}
		
console.log("channel_obj",channel_obj)
		Channel.count({where:channel_obj}).then(function (channel) {
console.log("channel)",channel)
			Package.count({where:package_obj}).then(function (package) {
				Inventory.count({where:inventory_obj}).then(function (inventory) {
					Inventory.count({where:active_inventory_obj}).then(function (active_inventory) {
						return res.status(200).send({channel:channel, package:package, inventory:inventory,active_inventory:active_inventory})
					},function (err) {
	                                res.status(500).send("Error in finding Inventory");
	                        })
				},function (err) {
					res.status(500).send("Error in finding Inventory");
				})
			},function (err) {
				res.status(500).send("Error in finding Package");
			})
		},function (err) {
			res.status(500).send("Error in finding Channel");
		})
	})
})
})

module.exports = router;
