var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        M3U8Parser = require('m3u8-parser'),
        readline = require('readline'),
        fs = require('fs'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
        Webseries  = __db_model.Webseries,
        WebEpisodes  = __db_model.WebEpisodes,
        Category  = __db_model.Category,
        User  = __db_model.User,
        exec = require('child_process').exec;

router.use(bodyParser.json());
router.use(fileUpload());

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

router.get('/:limit/:offset', VerifyToken, (req, res) => {
  var offset=(req.params.offset==0)?0:req.params.offset-1;
console.log("hjhjhj")
  Webseries.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    include:[{model : WebEpisodes}],
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
})

router.get('/', VerifyToken, (req, res) => {
  Webseries.findAll({
    include:[{model : WebEpisodes}],
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
})

router.post('/', VerifyToken,function(req, res){
console.log("re",JSON.stringify(req.body))
    req.body.lcn = Number(req.body.lcn);
    req.body.user_id = req.userId;
console.log(typeof(req.body.web_episodes))
    if(req.body.web_episodes && typeof(req.body.web_episodes == 'string')) {
	req.body.web_episodes = JSON.parse(req.body.web_episodes);
    }
    Webseries.create(req.body,{ include: [{ model: WebEpisodes }] }).then(created=> {
        return res.status(200).send("Webseries created successfully")
    },err=> {
console.log("we",err)
        if (err && err.errors[0].message && err.errors[0].message == 'name must be unique') {
            return res.status(500).send( "Name already exists" );
        }else{
            console.log(err)
            return res.status(500).send("There was a problem in webseries creation")
        }
    })
});

router.put('/:web_id', VerifyToken,(req,res)=> {
    Webseries.update(req.body,{ where:{web_id:req.params.web_id} }).then(webseries_updated=> {
	 WebEpisodes.destroy({ where: {web_id: req.params.web_id}}).then(web_deleted=> {
		if(req.body.web_episodes && typeof(req.body.web_episodes == 'string')) {
     		   req.body.web_episodes = JSON.parse(req.body.web_episodes);
	        }
console.log("req",req.body.web_episodes)

		WebEpisodes.bulkCreate(req.body.web_episodes).then(created=> {
		        return res.status(200).send("Webseries updated successfully")
		},err=> {
			console.log("err",err)
	        	return res.status(500).send("There was a problem in webseries updation")
	        })
	})
    },err=> {
console.log("err",err)
        return res.status(500).send("There was a problem in webseries updation")
    })
});

router.delete('/:web_id', VerifyToken, (req,res)=> {
    Webseries.destroy({ where: {web_id: req.params.web_id}}).then(webseries_deleted=> {
            return res.status(200).send("Webseries deleted successfully")
    },err=> {
            return res.status(500).send("There was a problem in webseries deletion")
    })
});


router.post('/deleteBulk', VerifyToken, (req,res)=> {
    Webseries.destroy({ where: {webseries_id: req.body.webseries_id}}).then(webseries_deleted=> {
            return res.status(200).send("Webseries deleted successfully")
    },err=> {
        console.log("err",err)
            return res.status(500).send("There was a problem in webseries deletion")
    })
});

module.exports=router;
