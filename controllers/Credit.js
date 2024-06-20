var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
	creditCalculation = require(__root + __core + 'modules/CreditCalculation'),
        Credit  = __db_model.Credit;

router.use(bodyParser.json());
router.use(fileUpload());

router.get('/:limit/:offset', VerifyToken, (req, res) => {
  var offset=(req.params.offset==0)?0:req.params.offset-1;
  var obj = {user_id:req.userId};
  Credit.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    where:obj,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});

router.get('/', VerifyToken, (req, res) => {
  var obj = {user_id:req.userId};
  creditCalculation.Calculate({ user_id: req.userId }, res_cb)
  function res_cb(val){
	if(val.status == 200){
		res.status(200).send({msg:val.msg.object})
	}else{
		res.status(500).send({msg:'No Transaction found'})
	}
  }
});

router.post('/', VerifyToken,function(req, res){
console.log("hjh",req.body)
    req.body.amount = Number(req.body.amount)
    if(req.body.type == 'Debit'){
        creditCalculation.Calculate({ user_id: req.body.to_user_id }, resp_cb)
        function resp_cb(value){
            var cr_bal = 0
            if(value.status == 200){ cr_bal = value.msg.object }
            creditCalculation.Calculate({ user_id: req.userId }, res_cb)
            function res_cb(val){
                if(val.status == 200){
                    if(val.msg.object >= (req.body.amount)){
                            var payload = [{
                                    user_id : req.body.to_user_id,
                                    username: req.body.to_user_name,
                                    from_user_id: req.body.user_id,
                                    from_user_name: req.body.username,
                                    to_user_id : req.body.to_user_id,
                                    to_user_name : req.body.to_user_name,
                                    type    : 'Credit',
                                    amount : req.body.amount,
                                    balance : cr_bal + req.body.amount
                            },{
                                    user_id : req.body.user_id,
                                    username: req.body.username,
                                    from_user_id: req.body.user_id,
                                    from_user_name: req.body.username,
                                    to_user_id : req.body.to_user_id,
                                    to_user_name : req.body.to_user_name,
                                    type    : 'Debit',
                                    amount : req.body.amount,
                                    balance : val.msg.object-req.body.amount
                            }]
                            createCredit(payload);
                    }else{res.status(500).send("Your credit is less, pls add more amount")}
                }else{res.status(500).send(val.msg.object);}
            }
        }
    }else if(req.body.type == 'Reverse Credit'){
        Credit.findAll({raw:true, where:{type:'Credit', from_user_id:req.userId, to_user_id:req.body.to_user_id }}).then(function (all_credits) {
            var amt = 0
            if(all_credits.length > 0){
                creditCalculation.Calculate({ user_id: req.body.to_user_id }, resp_cb)
                function resp_cb(value){
                    var cr_bal = 0
                    if(value.status == 200){ cr_bal = value.msg.object }
                    creditCalculation.Calculate({ user_id: req.userId }, res_cb)
                    function res_cb(val){
                        if(val.status == 200){
                            all_credits.map(function(iter, i){
                                amt = amt + iter.amount;
                                if(i+1 == all_credits.length){
                                    if(amt >= req.body.amount){
                                        var payload = [
					{
                                            user_id : req.body.user_id,
                                            username: req.body.username,
                                            from_user_id: req.body.user_id,
                                            from_user_name: req.body.username,
                                            type    : 'Credit',
            				    to_user_id: req.body.user_id,
                                            to_user_name: req.body.username,
                                            amount : req.body.amount,
                                            balance : req.body.amount + val.msg.object
                                        },
										{
				            user_id : req.body.user_id,
                                            username: req.body.username,
                                            from_user_id: req.body.user_id,
                                            from_user_name: req.body.username,
                                            to_user_id : req.body.to_user_id,
                                            to_user_name : req.body.to_user_name,
                                            type    : 'Reverse Credit',
                                            amount : req.body.amount,
                                            balance : val.msg.object
					},

					{
                                            user_id : req.body.to_user_id,
                                            username: req.body.to_user_name,
                                            from_user_id: req.body.user_id,
                                            from_user_name: req.body.username,
                                            type    : 'Debit',
                                            amount : req.body.amount,
                                            balance : cr_bal - req.body.amount,
					    to_user_id: req.body.user_id,
                                            to_user_name: req.body.username
                                        }
                                        ]
                                        createCredit(payload);
                                        console.log("pay",payload)
                                    }else{
                                        return res.status(500).send("Credits are mismatching!")
                                    }
                                }
                            })
                        }
                    }
                }
            }else{
                return res.status(500).send("Credits are mismatching!")
            }

        },function err(err) {
            return res.status(500).send("There was a problem in Credit find")
        })
    }else{
	creditCalculation.Calculate({ user_id: req.userId }, resp_cb)
                function resp_cb(value){
                    	var cr_bal = 0
			if(value.status == 200){ cr_bal = value.msg.object }
        		req.body.balance = req.body.amount + cr_bal;
			req.body.to_user_id = req.userId
			req.body.to_user_name = req.body.username
		        createCredit([req.body]);
		}
    }
    function createCredit(payload){
        Credit.bulkCreate(payload).then(created=> {
            return res.status(200).send("Credit created successfully")
        },err=> {
                return res.status(500).send("There was a problem in Credit creation")
        })
    }
});

module.exports=router;
