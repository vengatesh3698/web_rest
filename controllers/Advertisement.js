
var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
        Advertisement  = __db_model.Advertisement,
	exec = require('child_process').exec,
    	fs = require('fs');
var image_path = '/etc/web/data/logo/';
var images_path= '/logo/';
Socketio = require('../socket_server');
router.use(bodyParser.json());
router.use(fileUpload());

router.get('/:limit/:offset', VerifyToken, (req, res) => {
  var offset=(req.params.offset==0)?0:req.params.offset-1;
  Advertisement.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});


router.post('/', VerifyToken,function(req, res){
console.log("req",req.body, req.files)
    req.body.left_image  = 'http://122.165.77.210'+images_path+'left.png'
    var left_path  = image_path+'left.png'
    fs.writeFileSync(left_path,req.files.left_image.data,'binary')
    req.body.bottom_image  = 'http://122.165.77.210'+images_path+'bottom.png';
    var bottom_path  = image_path+'bottom.png';
    fs.writeFileSync(bottom_path,req.files.bottom_image.data,'binary')
//    if(req.body.slot && typeof(req.body.slot == 'string')) {
//        req.body.slot = JSON.parse(req.body.slot);
//    }
    Advertisement.create(req.body).then(created=> {
Socketio.send_add_update()
        return res.status(200).send("Advertisement created successfully")
    },err=> {
        return res.status(500).send("There was a problem in Advertisement creation")
    })
});

router.put('/:adv_id', VerifyToken,(req,res)=> {
    console.log("req",req.body, req.files)
    if(req.files && req.files.left_image){
        exec('rm -rf '+image_path+'left.png',function (err,stdout,stderr){
            fs.writeFileSync(image_path+'left.png',req.files.left_image.data,'binary')
        })
    }
    if(req.files && req.files.right_image){
        exec('rm -rf '+image_path+'right.png',function (err,stdout,stderr){
            fs.writeFileSync(image_path+'right.png',req.files.right_image.data,'binary')
        })
    }
  //  if(req.body.slot && typeof(req.body.slot == 'string')) {
  //      req.body.slot = JSON.parse(req.body.slot);
  //  }
    Advertisement.update(req.body,{ where:{adv_id:req.params.adv_id} }).then(Advertisement_updated=> {
	Socketio.send_add_update()
        return res.status(200).send("Advertisement updated successfully")
    },err=> {
	console.log(err)
        return res.status(500).send("There was a problem in Advertisement updation")
    })
});

router.delete('/:adv_id', VerifyToken, (req,res)=> {
    Advertisement.destroy({ where: {adv_id: req.params.adv_id}}).then(advertisement_deleted=> {
	    exec('rm -rf '+image_path+'left.png');
	    exec('rm -rf '+image_path+'bottom.png');
            return res.status(200).send("Advertisement deleted successfully")
    },err=> {
            return res.status(500).send("There was a problem in Advertisement deletion")
    })
});

module.exports=router;
