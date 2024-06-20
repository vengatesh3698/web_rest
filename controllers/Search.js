var express       = require('express'),
    router        = express.Router(),
    bodyParser    = require('body-parser'),
    VerifyToken   = require(__root +__core+'modules/VerifyToken'),
    User  = __db_model.User,
    Channel  = __db_model.Channel,
    Package  = __db_model.Package,
    Inventory  = __db_model.Inventory,
    Webseries  = __db_model.Webseries,
    WebEpisodes  = __db_model.WebEpisodes,
    InventoryPackage =  __db_model.InventoryPackage;
    Credit  = __db_model.Credit,
    Category  = __db_model.Category,
   OTT  = __db_model.OTT;


router.use(bodyParser.json());
var SQLSequelize   = __db_model.PsqlSequelize;
const { Op, literal } = require('sequelize');

const database={
	'user'      :User,
  'package'   : Package,
  'inventory' : Inventory,
  'channel'   : Channel,
  'webseries' : Webseries,
  'credit'    : Credit,
  'category'  : Category,
  'ott'	      : OTT
}

const arrayFormation=(arr,term)=>{
    return new Promise(resolve=>{
        var contentObj={};
        var searchArr=[];
        var input='%'+term+'%'
        const result =  !isNaN(parseFloat(term)) && isFinite(term);
        if(!arr.length) return;
        arr.map((item,index)=>{
            var obj={}
            if(result){
              obj[item] = {
                [Op.or]: [
                   SQLSequelize.literal(`CAST("${item}" AS TEXT) iLIKE '%${term}%'`)
                 ]
              }
              searchArr.push(obj);
              if(index+1==arr.length){
                contentObj={ [Op.or]:searchArr};
                return resolve(contentObj);
            };
            } else {
              obj[item]={[Op.iLike]:input};
              searchArr.push(obj);
              if(index+1==arr.length){
                  contentObj={ [Op.or]:searchArr};
                  return resolve(contentObj);
              };
            }
        });
    })
};

var check_time = new Date().getTime();
var check_obj = {
      "expiry_date": {
        [Op.gt]: check_time
      }
    }

const includeType={
     'inventory': [{ model: InventoryPackage }],
     'webseries': [{ model: WebEpisodes }]
};
router.post('/',VerifyToken,(req,res)=>{
    var include = includeType[req.body.type];
    // var check_time = new Date().getTime();
    arrayFormation(req.body.arr,req.body.term).then(response => {
        if (req.orgId && req.body.type == 'subscriber' && ((req.roles !='ADMIN') || (req.roles != 'SUPER_ADMIN'))) {
            response.org_id = req.orgId
        }
	//if(req.body.type == 'subscriber'){
	//	response.expiry_date= { [Op.gt]: check_time }
	//}
	if(req.roles == 'RESELLER'){
    response['reseller_id'] = req.userId;
  }
console.log(req.body)
	if(req.body.type != 'channel'){
        database[req.body.type].findAndCountAll({where:response,include:include,limit:10,offset:0,order:[['createdAt','DESC']]}).then(search_content=>{
            res.status(200).send(search_content);
        },err=>{
            res.status(500).send(err);
        });
	}else{
	  database[req.body.type].findAndCountAll({where:response,include:include,order:[['createdAt','DESC']]}).then(search_content=>{
            res.status(200).send(search_content);
          },err=>{
       	    res.status(500).send(err);
          });
	}
    });
});

module.exports=router;

