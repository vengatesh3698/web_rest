var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
	creditCalculation = require(__root + __core + 'modules/CreditCalculation'),
        Inventory  = __db_model.Inventory,
        User  = __db_model.User,
        Credit  = __db_model.Credit,
        InventoryPackage = __db_model.InventoryPackage,
        Socketio = require('../socket_server');
router.use(bodyParser.json());
router.use(fileUpload());

router.get('/', VerifyToken, (req, res) => {
  var obj = {}
  if(req.roles == 'RESELLER'){
    obj['reseller_id'] = req.userId;
  }
  Inventory.findAll({
    where:obj,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});


router.get('/:limit/:offset/:filter', VerifyToken, (req, res) => {
  var obj = {}
  if(req.roles == 'RESELLER'){
    obj['reseller_id'] = req.userId;
  }
  if(req.params.filter != 'null'){obj['status'] = req.params.filter};
  var offset=(req.params.offset==0)?0:req.params.offset-1;
  Inventory.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    where:obj,
    include:[{model:InventoryPackage}],
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});


router.put('/:inventory_id', VerifyToken,(req,res)=> {
    console.log("req",req.body)
        User.findOne({raw:true,where:{user_id:req.userId}}).then(user_find=>{ 
            Inventory.count({ where:{reseller_id:user_find.user_id}}).then(Inventory_allfind=> {
                Inventory.findOne({raw:true,where:{inventory_id:req.params.inventory_id}}).then(function(find_inventory){
                    InventoryPackage.findOne({raw:true,where:{inventory_id:find_inventory.inventory_id}}).then(function(old_inventory_pack){
                        if(req.body.inventory_packages){
                            req.body.inventory_packages = JSON.parse(req.body.inventory_packages);
                        }
                        if(req.body.expiry_date){
                            req.body.expiry_date = Number(req.body.expiry_date);
                            //    req.body.expiry_date = new Date(req.body.expiry_date);
                            req.body.status="Active"
                        }
    
                        if(find_inventory.reseller_id){
                            check_credit()
                        }else{
                            if(req.roles == 'RESELLER' && user_find.subscriber_limit > Inventory_allfind){
                                check_credit()
                            }else if (req.roles == 'RESELLER'){
                                return res.status(500).send("Subscriber limit exceed! Contact Admin")
                            }else {check_credit()}
                        }
                        var cr_bal = 0
    
                        function check_credit(){
                            if((find_inventory.status != req.body.status) || ((old_inventory_pack && req.body.inventory_packages ) && old_inventory_pack.package_id != req.body.inventory_packages[0].package_id)){
                                if(req.roles == 'RESELLER' && req.body.inventory_packages && req.body.inventory_packages.length > 0){
                                    creditCalculation.Calculate({ user_id: req.userId }, res_cb)
                                    function res_cb(val){
                                        if(val.status == 200){
                                            cr_bal = val.msg.object;
                                            if(val.msg.object >= req.body.inventory_packages[0].package_cost){
                                                updateInventory();
                                            }else{res.status(500).send({data:"Credits is not sufficient"})}
                                        }else{
                                            res.status(500).send("No credits available")
                                        }
                                    }
                                }else{
                                    updateInventory();
                                }
                            }else{updateInventory();}
                        }
                        
    
                        function updateInventory(){
                            Inventory.update(req.body,{ where:{inventory_id:req.params.inventory_id} }).then(Inventory_updated=> {
                                if (req.body.inventory_packages && req.body.inventory_packages.length > 0) {
                                    InventoryPackage.destroy({ where: { inventory_id:req.params.inventory_id } }).then(inventory_package_deleted => {
                                        InventoryPackage.bulkCreate(req.body.inventory_packages).then(inventory_package_created => {
                                            if((find_inventory.status != req.body.status) || (old_inventory_pack.package_id != req.body.inventory_packages[0].package_id)){
                                                var creditobj = {
                                                    user_id : req.userId,
                                                    username: req.username,
                                                    from_user_id: req.userId,
                                                    from_user_name: req.username,
                                                    to_user_id: req.userId,
                                                    to_user_name: req.username,
                                                    type    : 'Debit',
                                                    amount : req.body.inventory_packages[0].package_cost,
                                                    subscriber_name : find_inventory.subscriber_name,
                                                    serial_no : find_inventory.serial_no,
                                                    mac : find_inventory.mac,
                                                    expiry_date: req.body.expiry_date,
                                                    is_subscribed : true,
                                                    balance : cr_bal - req.body.inventory_packages[0].package_cost
                                                }
                                                Credit.create(creditobj).then(credit_created => {
                                                    Socketio.activate_subscription({"mac":req.body.mac})
                                                    return res.status(200).send("Inventory updated successfully")
                                                })
                                            }else{
                                                Socketio.activate_subscription({"mac":req.body.mac})
                                                return res.status(200).send("Inventory updated successfully")
                                            }
                                        })
                                    })
                                } else{
                                    return res.status(200).send("Inventory updated successfully")
                                }
                            },err=> {
                console.log("err",err)
                                return res.status(500).send("There was a problem in Inventory updation")
                            })
                        }
                    });
                });
            })
        })
});

router.post('/swap', VerifyToken,(req,res)=> {
  creditCalculation.Calculate({ user_id: req.userId }, res_cb)
  function res_cb(val){
    if(val.status == 200){
      cr_bal = val.msg.object;
    }else {
      cr_bal = 0;
    }
  }
  Inventory.findOne({where:{inventory_id:req.body.old_entry},include:InventoryPackage}).then( function(find_inventory){
    Inventory.findOne({where:{inventory_id:req.body.new_entry},include:InventoryPackage}).then( function(findnew_inventory){
      var new_pack = find_inventory.dataValues.inventory_packages[0];
      new_pack['inventory_id'] = req.body.new_entry;
      var inventory_obj = {
        status: 'Active',
        subscriber_name : find_inventory.subscriber_name,
        expiry_date:find_inventory.expiry_date
      }
      var final_new_pack = new_pack.dataValues
      delete final_new_pack.id

      Inventory.update({status: 'Fresh'},{ where:{inventory_id:req.body.old_entry} }).then(Inventory_updated=> {
        Inventory.update(inventory_obj,{ where:{inventory_id:req.body.new_entry}}).then(Inventory_activeupdated=> {
          InventoryPackage.create(final_new_pack).then(function(inventory_pack_swap){
            var credit_obj = {
              user_id          : req.userId,
              username         : req.username,
              from_user_id     : req.userId,
              from_user_name   : req.username,
              to_user_id       : req.userId,
              to_user_name     : `Swap to ${findnew_inventory.mac}`,
              type             : `Swap from ${find_inventory.mac}`,
              amount           : 0,
              subscriber_name  : find_inventory.subscriber_name,
              serial_no        : findnew_inventory.serial_no,
              mac              : findnew_inventory.mac,
              expiry_date      : find_inventory.expiry_date,
              balance          : cr_bal,
              is_subscribed    : false
            }
            Credit.create(credit_obj).then(credit_created => {
              return res.status(200).send("Inventory swapped successfully")
            })
          })
        })
      })
    })
  })
})

router.post('/delete', VerifyToken,(req,res)=> {
  Inventory.destroy({ where:{inventory_id:req.body.inventory_id} }).then(Inventory_updated=> {
      return res.status(200).send("Inventory deleted successfully")
  })
})
module.exports=router;
