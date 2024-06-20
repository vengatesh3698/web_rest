var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        M3U8Parser = require('m3u8-parser'),
        readline = require('readline'),
        fs = require('fs'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
        Appupdate  = __db_model.Appupdate,
        User  = __db_model.User,
	exec = require('child_process').exec;
var path = '/etc/ec/code_new/app_apk/';
Socketio = require('../socket_server');
router.use(bodyParser.json());
router.use(fileUpload());

router.get('/:limit/:offset', VerifyToken, (req, res) => {
  var offset=(req.params.offset==0)?0:req.params.offset-1;
  var obj = {}
  var user_list_id = []

  Appupdate.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});

router.get('/', VerifyToken, (req, res) => {
  var user_list_id = []
  Appupdate.findAll({
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
})

function guid() {
    function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

router.post('/', VerifyToken,function(req, res){
console.log("re",req.body)
    Appupdate.findOne().then(find=> {
	if(find){return res.status(500).send("App already exists")}
	else{
    var id = guid()
    req.body.version = Number(req.body.version);
    req.body.apk = (path+id+'.apk');
    req.body.apk =req.body.apk.replace("/etc/ec/code_new/", "http://157.119.200.65/");
    req.body.app_id = id;

    Appupdate.create(req.body).then(created=> {
	if(req.files && req.files.apk){
                fs.writeFileSync(path+id+'.apk',req.files.apk.data,'binary')
        }
	Socketio.send_app_update()
        return res.status(200).send("App updated successfully")
    },err=> {
            console.log(err)
            return res.status(500).send("There was a problem in App updation")
    });
    }
    })
});

router.put('/:app_id', VerifyToken,(req,res)=> {
    if(req.files && req.files.apk){
	console.log(req.body)
        exec('rm -rf '+path+req.params.app_id+'.apk',function (err,stdout,stderr){
            fs.writeFileSync(path+req.params.app_id+'.apk',req.files.apk.data,'binary')
        })
    }
    req.body.apk = "http://157.119.200.65/app_apk/"+req.params.app_id+'.apk';
    Appupdate.update(req.body,{ where:{app_id:req.params.app_id} }).then(Channel_updated=> {
	Socketio.send_app_update()
        return res.status(200).send("App updated successfully")
    },err=> {
        return res.status(500).send("There was a problem in App updation")
    })
});

router.delete('/:app_id', VerifyToken, (req,res)=> {
    Appupdate.destroy({ where: {app_id: req.params.app_id}}).then(Channel_deleted=> {
console.log(path+req.params.app_id)
	exec('rm -rf '+path+req.params.app_id+'.apk',function (err,stdout,stderr){
            	return res.status(200).send("App deleted successfully")
	    })
    },err=> {
            return res.status(500).send("There was a problem in Channel deletion")
    })
});


module.exports=router;
