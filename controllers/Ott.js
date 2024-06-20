var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        M3U8Parser = require('m3u8-parser'),
        readline = require('readline'),
        fs = require('fs'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
        OTT  = __db_model.OTT,
        Category  = __db_model.Category,
        User  = __db_model.User,
        exec = require('child_process').exec;
const csv = require('csv-parser');

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

function parse_file(file_name,user_id,scb,ecb){
    Category.findAll({raw:true}).then(function(all_category){
        var exist_category_arr = []
        var exist_ott_arr = []
        all_category.map(function(data){
           exist_category_arr.push(data.name);
        })
	    var category_arr = [];
	    const channels = [];
	    var msg = '';
	    let currentChannel = {};
	    var flag = true;
	    var index = 1;
		fs.createReadStream(file_name).pipe(csv()).on('data', (line) => {
        	// Extract channel information from #EXTINF line
        	if(flag){index++}
        	var match = "Ott Title,Language,Geners,Media URL,Horizontal URL,Vertical URL"
            currentChannel = line;
            if(flag && currentChannel.title != '' && currentChannel.language != '' && currentChannel.genre != '' && currentChannel.media_url != '' && currentChannel.horizontal_url != '' && currentChannel.vertical_url){
            	if(!exist_ott_arr.includes(currentChannel.title)){
	            	exist_ott_arr.push(currentChannel.title)
	            	currentChannel['user_id'] = user_id;
	            	currentChannel['ott_id'] = guid();
		            var genre_category = line.genre;
		            var language_category = line.language;
		            if(!exist_category_arr.includes(genre_category)){
		                category_arr.push({
	                        category_id:guid(),
	                        name:genre_category,
	                        type:'Genres'
		                })
		                exist_category_arr.push(genre_category)
		            }
		            if(!exist_category_arr.includes(language_category)){
		                category_arr.push({
	                        category_id:guid(),
	                        name:language_category,
	                        type:'Language'

		                })
		                exist_category_arr.push(language_category)
		            }

			        if(Object.keys(currentChannel).length != 0 ) {
			            channels.push(currentChannel);
			        }

			        currentChannel = {};
		    	}else{
		    		flag = false;
		    		msg = (msg =='') ? "Duplicate entry "+currentChannel.title : msg
		    		return
		    	}
		    }else{
		         flag = false;
		         msg = (msg == '') ? "Data is incorrect in the line number "+index : msg
		         return
		    }
    	})
    	.on('end', () => {
    		console.log('CSV file successfully processed');
      		// All data extracted, channels array now contains the information
	        if(flag){
		        OTT.bulkCreate(channels).then(created=> {
		            Category.bulkCreate(category_arr,{ignoreDuplicates: true}).then(categoey_created=> {
		                        scb(200);
		            },err=> {
		                ecb(err);
		            })
		        },err=> {
		           if (err && err.errors[0].message && err.errors[0].message == 'title must be unique') {
            			ecb( err.errors[0].value+" Title already exists" );
			   }else{ecb(err)}
		        })
	        }else {
			console.log("msg")
			ecb(msg)
		}
        })
    })
}


router.get('/:limit/:offset', VerifyToken, (req, res) => {
  var offset=(req.params.offset==0)?0:req.params.offset-1;

  OTT.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
})

router.get('/', VerifyToken, (req, res) => {
  OTT.findAll({
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
})

router.post('/', VerifyToken,function(req, res){
    req.body.lcn = Number(req.body.lcn);
    req.body.user_id = req.userId;
    OTT.create(req.body).then(created=> {
        return res.status(200).send("ott created successfully")
    },err=> {
        if (err && err.errors[0].message && err.errors[0].message == 'name must be unique') {
            return res.status(500).send( "Name already exists" );
        }else{
            console.log(err)
            return res.status(500).send("There was a problem in ott creation")
        }
    })
});

router.post('/bulk', VerifyToken,function(req, res){
    //write the data (req.fiels) to any path and give the file name to the function
    //do the Reseller Filter option on Chanell creation
    exec('rm -rf '+__root+'/'+req.files.importData.name,function (err,stdout,stderr){

    	fs.writeFile(__root+'/'+req.files.importData.name,req.files.importData.data,'binary', function(err){
          	if(!err){
	            parse_file(__root+'/'+req.files.importData.name,req.userId, scb,ecb)
			    function scb(){
					console.log("in success call")
			        return res.status(200).send("OTT created successfully")
			    }
			    function ecb(data){
					console.log("in err call", data)
			        return res.status(500).send(data)
			    }

        	}
    	})
   	})
})

/*router.post('/bulk', VerifyToken,function(req, res){
console.log("re",req.body)
return
//    req.body.lcn = Number(req.body.lcn);
//    req.body.user_id = req.userId;
    OTT.bulkCreate(req.body).then(created=> {
        return res.status(200).send("ott created successfully")
    },err=> {
console.log("we",err)
        if (err && err.errors[0].message && err.errors[0].message == 'name must be unique') {
            return res.status(500).send( "Name already exists" );
        }else{
            console.log(err)
            return res.status(500).send("There was a problem in ott creation")
        }
    })
});
*/


router.put('/:ott_id', VerifyToken,(req,res)=> {
    OTT.update(req.body,{ where:{ott_id:req.params.ott_id} }).then(ott_updated=> {
        return res.status(200).send("ott updated successfully")
    },err=> {
        if(err && err.errors[0].message && err.errors[0].message == 'order must be unique') return res.status(500).send("Order already exists")
        return res.status(500).send("There was a problem in ott updation")
    })
});

router.delete('/:ott_id', VerifyToken, (req,res)=> {
    OTT.destroy({ where: {ott_id: req.params.ott_id}}).then(ott_deleted=> {
            return res.status(200).send("ott deleted successfully")
    },err=> {
            return res.status(500).send("There was a problem in ott deletion")
    })
});


router.post('/deleteBulk', VerifyToken, (req,res)=> {
    OTT.destroy({ where: {ott_id: req.body.ott_id}}).then(ott_deleted=> {
            return res.status(200).send("ott deleted successfully")
    },err=> {
        console.log("err",err)
            return res.status(500).send("There was a problem in ott deletion")
    })
});

module.exports=router;
